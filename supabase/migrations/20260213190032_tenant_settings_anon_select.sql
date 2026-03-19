-- Permite que formulários públicos (sem auth) leiam as URLs de webhook do tenant_settings.
-- Os campos são apenas URLs de n8n — não há dados sensíveis.
CREATE POLICY "Anon can read tenant settings webhooks" ON public.tenant_settings
  FOR SELECT TO anon
  USING (true);
