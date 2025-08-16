-- Plans & Preços
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  trial_days INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Only allow read access to authenticated users by default
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'Plans are readable'
  ) THEN
    CREATE POLICY "Plans are readable" ON public.plans FOR SELECT USING (true);
  END IF;
END $$;

CREATE TRIGGER handle_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','incomplete','paused')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_active_subscription_per_org UNIQUE (organization_id) DEFERRABLE INITIALLY IMMEDIATE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Members of the organization can read their subscription
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Subscriptions readable by org members'
  ) THEN
    CREATE POLICY "Subscriptions readable by org members" ON public.subscriptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = subscriptions.organization_id
          AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan_id);

CREATE TRIGGER handle_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Faturamento: configurações por organização
CREATE TABLE IF NOT EXISTS public.organization_billing_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_email TEXT,
  tax_id TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_payment_method TEXT,
  trial_eligible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_billing_settings ENABLE ROW LEVEL SECURITY;

-- Members can read, owners/admins can upsert their org's billing settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_billing_settings' AND policyname = 'Billing settings readable by org members'
  ) THEN
    CREATE POLICY "Billing settings readable by org members" ON public.organization_billing_settings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = organization_billing_settings.organization_id
          AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_billing_settings' AND policyname = 'Billing settings insertable by owners and admins'
  ) THEN
    CREATE POLICY "Billing settings insertable by owners and admins" ON public.organization_billing_settings
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = organization_billing_settings.organization_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner','admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_billing_settings' AND policyname = 'Billing settings updatable by owners and admins'
  ) THEN
    CREATE POLICY "Billing settings updatable by owners and admins" ON public.organization_billing_settings
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = organization_billing_settings.organization_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner','admin')
        )
      );
  END IF;
END $$;

CREATE TRIGGER handle_org_billing_settings_updated_at
  BEFORE UPDATE ON public.organization_billing_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Faturas (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','open','paid','void','uncollectible')),
  currency TEXT NOT NULL DEFAULT 'BRL',
  amount_due_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_due_cents >= 0),
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  amount_remaining_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_remaining_cents >= 0),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  external_invoice_id TEXT UNIQUE,
  hosted_invoice_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Invoices readable by org members'
  ) THEN
    CREATE POLICY "Invoices readable by org members" ON public.invoices
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = invoices.organization_id
          AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);

CREATE TRIGGER handle_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Pagamentos (simplificado)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('requires_payment_method','requires_confirmation','processing','succeeded','canceled')),
  external_payment_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Payments readable by org members'
  ) THEN
    CREATE POLICY "Payments readable by org members" ON public.payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.invoices i
          JOIN public.organization_members m ON m.organization_id = i.organization_id
          WHERE i.id = payments.invoice_id
          AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- Note: write access (INSERT/UPDATE/DELETE) for these tables should be performed by backend/service role or webhooks from the payment provider.
