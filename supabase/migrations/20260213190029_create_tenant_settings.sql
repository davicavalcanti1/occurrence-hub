CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  favicon_url TEXT,
  webhook_nova_ocorrencia TEXT,
  webhook_ocorrencia_concluida TEXT,
  webhook_encaminhar_medico TEXT,
  webhook_confirmacao_medico TEXT,
  webhook_paciente_portal TEXT,
  webhook_banheiro TEXT,
  webhook_dispenser TEXT,
  webhook_cilindro TEXT,
  webhook_dea TEXT,
  webhook_copa TEXT,
  sla_triagem_horas INTEGER DEFAULT 24,
  sla_analise_horas INTEGER DEFAULT 72,
  sla_acao_horas INTEGER DEFAULT 168,
  sla_sentinela_triagem_horas INTEGER DEFAULT 2,
  sla_sentinela_acao_horas INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT tenant_settings_tenant_id_key UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant settings" ON public.tenant_settings
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage their tenant settings" ON public.tenant_settings
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_tenant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_tenant_settings_updated_at();
