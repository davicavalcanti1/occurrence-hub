-- Add 'developer' to app_role enum before using it in RLS policies
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add modules array to tenants (controls which modules each company can access)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modules text[] DEFAULT ARRAY[
    'ocorrencias','checkin','controlemidia','inspecoes',
    'toners','analise','livro','farol_usg'
  ]::text[];

-- RLS: developer can see ALL tenants
CREATE POLICY "developer can view all tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );

-- RLS: developer can update ALL tenants
CREATE POLICY "developer can update all tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );

-- RLS: developer can insert tenants (create new companies)
CREATE POLICY "developer can insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );

-- RLS: developer can view ALL tenant_settings
CREATE POLICY "developer can view all tenant_settings" ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );

-- RLS: developer can manage ALL tenant_settings
CREATE POLICY "developer can manage all tenant_settings" ON public.tenant_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'developer'
    )
  );

-- Add 'recepcao' to app_role enum if not exists
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recepcao';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: auto-generate public_token on occurrence insert
CREATE OR REPLACE FUNCTION public.occurrences_laudo_auto_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS occurrences_laudo_auto_token_trigger ON public.occurrences_laudo;
CREATE TRIGGER occurrences_laudo_auto_token_trigger
  BEFORE INSERT ON public.occurrences_laudo
  FOR EACH ROW EXECUTE FUNCTION public.occurrences_laudo_auto_token();

-- RLS: public read for occurrences_laudo via public_token (for static link page)
CREATE POLICY "Public can view occurrence by token" ON public.occurrences_laudo
  FOR SELECT TO anon
  USING (public_token IS NOT NULL);
