
-- ============ TEAM TABLES ============
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  display_name text NOT NULL,
  role_title text NOT NULL DEFAULT 'Funcionário',
  sector text NOT NULL DEFAULT 'geral',
  capabilities text[] NOT NULL DEFAULT ARRAY['leads.view_assigned','leads.edit','chat.send']::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  display_name text NOT NULL,
  role_title text NOT NULL DEFAULT 'Funcionário',
  sector text NOT NULL DEFAULT 'geral',
  capabilities text[] NOT NULL DEFAULT ARRAY['leads.view_assigned','leads.edit','chat.send']::text[],
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_member ON public.team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Helper: get the company owner for current user (self or owner of team)
CREATE OR REPLACE FUNCTION public.current_org_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members WHERE member_user_id = _uid AND active LIMIT 1),
    _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.has_capability(_uid uuid, _cap text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- owner has everything
    NOT EXISTS (SELECT 1 FROM public.team_members WHERE member_user_id = _uid AND active)
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE member_user_id = _uid AND active AND _cap = ANY(capabilities)
    );
$$;

-- ============ POLICIES ============
CREATE POLICY "Owner manages team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Member sees own membership"
  ON public.team_members FOR SELECT TO authenticated
  USING (auth.uid() = member_user_id);

CREATE POLICY "Owner manages invites"
  ON public.team_invites FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============ LEADS: assigned_to + new policies ============
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to uuid;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);

DROP POLICY IF EXISTS "Users CRUD own leads" ON public.leads;

CREATE POLICY "Org members read leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    user_id = public.current_org_owner(auth.uid())
    AND (
      auth.uid() = user_id  -- owner
      OR public.has_capability(auth.uid(), 'leads.view_all')
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

CREATE POLICY "Org members insert leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_org_owner(auth.uid())
    AND public.has_capability(auth.uid(), 'leads.create')
  );

CREATE POLICY "Org members update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    user_id = public.current_org_owner(auth.uid())
    AND (auth.uid() = user_id OR public.has_capability(auth.uid(), 'leads.edit') OR assigned_to = auth.uid())
  );

CREATE POLICY "Org members delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (
    user_id = public.current_org_owner(auth.uid())
    AND (auth.uid() = user_id OR public.has_capability(auth.uid(), 'leads.delete'))
  );

-- Add default capabilities for "creator" capability used by inserts
-- Owners auto-pass via has_capability; members need explicit "leads.create"
-- We seed common capabilities below in invites

-- ============ MESSAGES: sender_id + sender_name ============
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_id uuid,
  ADD COLUMN IF NOT EXISTS sender_name text;

DROP POLICY IF EXISTS "Users CRUD own messages" ON public.messages;

CREATE POLICY "Org members read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (user_id = public.current_org_owner(auth.uid()));

CREATE POLICY "Org members insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_org_owner(auth.uid()));

-- ============ SETTINGS: members read parent settings ============
DROP POLICY IF EXISTS "Users CRUD own settings" ON public.settings;
CREATE POLICY "Org read settings"
  ON public.settings FOR SELECT TO authenticated
  USING (user_id = public.current_org_owner(auth.uid()));
CREATE POLICY "Owner writes settings"
  ON public.settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ RPC: accept invite ============
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text, _display_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.team_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;

  SELECT * INTO inv FROM public.team_invites WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','invite_not_found'); END IF;
  IF inv.used_at IS NOT NULL THEN RETURN jsonb_build_object('error','invite_already_used'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('error','invite_expired'); END IF;

  INSERT INTO public.team_members(owner_id, member_user_id, display_name, role_title, sector, capabilities)
  VALUES (inv.owner_id, uid, COALESCE(_display_name, inv.display_name), inv.role_title, inv.sector, inv.capabilities)
  ON CONFLICT (owner_id, member_user_id) DO UPDATE
    SET role_title = EXCLUDED.role_title, sector = EXCLUDED.sector,
        capabilities = EXCLUDED.capabilities, active = true;

  UPDATE public.team_invites SET used_at = now(), used_by = uid WHERE id = inv.id;
  RETURN jsonb_build_object('success', true, 'owner_id', inv.owner_id);
END $$;

GRANT EXECUTE ON FUNCTION public.accept_team_invite(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;
