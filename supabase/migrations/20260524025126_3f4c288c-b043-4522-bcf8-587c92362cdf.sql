CREATE TABLE public.n8n_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Webhook n8n',
  url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.n8n_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own n8n webhooks" ON public.n8n_webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_n8n_webhooks_user ON public.n8n_webhooks(user_id, active);