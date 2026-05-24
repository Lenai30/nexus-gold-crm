-- Add AI pause column on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_paused_until timestamptz;

-- Add AI pause duration setting (minutes)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ai_pause_minutes integer NOT NULL DEFAULT 30;

-- Trigger: when lead moves to "negociacao", clear assigned_to (free for human pickup)
CREATE OR REPLACE FUNCTION public.handle_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'negociacao' AND (OLD.status IS DISTINCT FROM 'negociacao') THEN
    -- Free assignment so first human attendant claims it (owner can pre-assign)
    NEW.assigned_to := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_status_change ON public.leads;
CREATE TRIGGER trg_lead_status_change
  BEFORE UPDATE OF status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_status_change();

-- RPC: transfer assignment (current assignee or owner only)
CREATE OR REPLACE FUNCTION public.transfer_lead_assignment(_lead_id uuid, _new_assignee uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_assignee uuid;
  v_caller uuid := auth.uid();
  v_valid boolean;
BEGIN
  SELECT user_id, assigned_to INTO v_owner, v_assignee
  FROM public.leads WHERE id = _lead_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  -- Caller must be: owner, or the current assignee
  IF v_caller <> v_owner AND v_caller IS DISTINCT FROM v_assignee THEN
    RAISE EXCEPTION 'Sem permissão para transferir esta conversa';
  END IF;

  -- Validate new assignee belongs to the org (owner themselves or a team member)
  IF _new_assignee = v_owner THEN
    v_valid := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE owner_id = v_owner AND member_user_id = _new_assignee AND active = true
    ) INTO v_valid;
  END IF;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  UPDATE public.leads
  SET assigned_to = _new_assignee, last_interaction = now()
  WHERE id = _lead_id;
END;
$$;