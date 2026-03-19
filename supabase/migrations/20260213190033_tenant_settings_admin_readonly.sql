-- Admin passa a ter apenas SELECT em tenant_settings (edição restrita ao developer)
DROP POLICY IF EXISTS "Admins can manage their tenant settings" ON public.tenant_settings;

CREATE POLICY "Admins can view their tenant settings" ON public.tenant_settings
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
