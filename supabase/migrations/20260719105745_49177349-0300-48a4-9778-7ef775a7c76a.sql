
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_kind') THEN
    CREATE TYPE public.email_kind AS ENUM (
      'free_to_paid','post_sales','subscription_sales','content_purchase','creator_referrals'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.email_templates (
  kind        public.email_kind PRIMARY KEY,
  subject     text NOT NULL,
  body_html   text NOT NULL,
  updated_by  uuid NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read email templates" ON public.email_templates;
CREATE POLICY "admins read email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins write email templates" ON public.email_templates;
CREATE POLICY "admins write email templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_templates (kind, subject, body_html) VALUES
('post_sales',
 'Você fez uma venda no Monetisexy 🎉',
 '<h1 style="font-size:20px;margin:0 0 12px;">Nova venda de publicação</h1>
<p style="margin:0 0 12px;">{{buyerName}} desbloqueou seu conteúdo por <strong>{{amountBRL}}</strong>.</p>
<p style="margin:0 0 20px;">O valor entrará no seu saldo conforme a política de liberação.</p>
<p><a href="{{publicationUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver publicação</a></p>'),
('content_purchase',
 'Recibo da sua compra no Monetisexy',
 '<h1 style="font-size:20px;margin:0 0 12px;">Compra confirmada</h1>
<p style="margin:0 0 12px;">Você desbloqueou uma {{what}} de <strong>{{creatorName}}</strong> por <strong>{{amountBRL}}</strong>.</p>
<p><a href="{{publicationUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Acessar agora</a></p>'),
('subscription_sales',
 'Nova assinatura ativa no seu perfil 🎉',
 '<h1 style="font-size:20px;margin:0 0 12px;">Você tem um novo assinante</h1>
<p style="margin:0 0 12px;">{{subscriberName}} assinou seu perfil no plano <strong>{{planLabel}}</strong> por <strong>{{amountBRL}}</strong>.</p>
<p><a href="{{dashboardUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver painel</a></p>'),
('free_to_paid',
 '{{creatorName}} agora é um perfil pago no Monetisexy',
 '<h1 style="font-size:20px;margin:0 0 12px;">{{creatorName}} agora é um criador pago</h1>
<p style="margin:0 0 12px;">Um perfil que você segue passou a monetizar conteúdo exclusivo. Confira as novidades e planos disponíveis.</p>
<p><a href="{{creatorUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver perfil</a></p>'),
('creator_referrals',
 'Sua indicação virou criador no Monetisexy 🎉',
 '<h1 style="font-size:20px;margin:0 0 12px;">Sua indicação foi ativada</h1>
<p style="margin:0 0 12px;"><strong>{{referredName}}</strong> se tornou criador usando seu link de indicação.</p>
<p><a href="{{creatorUrl}}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Ver perfil</a></p>')
ON CONFLICT (kind) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by) WHERE referred_by IS NOT NULL;
