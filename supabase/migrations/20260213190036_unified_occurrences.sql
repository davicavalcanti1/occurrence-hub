-- ============================================================
-- Unified occurrences table
-- Merges clinical (occurrences) + administrative occurrences
-- into a single multi-tenant table.
-- ============================================================

-- Protocol sequence per tenant
CREATE SEQUENCE IF NOT EXISTS public.occurrence_protocol_seq START 1;

-- Main unified table
CREATE TABLE IF NOT EXISTS public.occurrences (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocol        TEXT        UNIQUE NOT NULL,

  -- Category distinguishes clinical from administrative
  category        TEXT        NOT NULL DEFAULT 'clinica'
                              CHECK (category IN ('clinica', 'administrativa')),

  -- Shared classification
  tipo            TEXT        NOT NULL,
  subtipo         TEXT,
  status          TEXT        NOT NULL DEFAULT 'registrada'
                              CHECK (status IN (
                                'registrada','em_triagem','em_analise',
                                'acao_em_andamento','concluida','improcedente'
                              )),
  description     TEXT,

  -- Clinical-specific
  triagem         TEXT        CHECK (triagem IN (
                                'verde','amarelo','laranja','vermelho','evento_sentinela'
                              )),
  paciente        JSONB       NOT NULL DEFAULT '{}',
  dados_especificos JSONB     NOT NULL DEFAULT '{}',
  desfecho_tipos  TEXT[]      DEFAULT '{}',
  desfecho_descricao TEXT,
  medico_destino  TEXT,
  public_token    TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Administrative-specific
  employee_name   TEXT,
  occurrence_date DATE,
  coordinator_signature_path TEXT,
  employee_signature_path    TEXT,
  signed_at       TIMESTAMPTZ,

  -- Shared attachments
  attachments     JSONB       NOT NULL DEFAULT '[]',

  -- Audit
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criador_nome    TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_occurrences_updated_at ON public.occurrences;
CREATE TRIGGER trg_occurrences_updated_at
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate protocol: COD-YYYY-NNNN (tenant-scoped counter via sequence)
CREATE OR REPLACE FUNCTION public.generate_occurrence_protocol()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_part TEXT := to_char(now(), 'YYYY');
  seq_val   BIGINT;
BEGIN
  seq_val := nextval('public.occurrence_protocol_seq');
  NEW.protocol := 'OC-' || year_part || '-' || lpad(seq_val::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_occurrences_protocol ON public.occurrences;
CREATE TRIGGER trg_occurrences_protocol
  BEFORE INSERT ON public.occurrences
  FOR EACH ROW
  WHEN (NEW.protocol IS NULL OR NEW.protocol = '')
  EXECUTE FUNCTION public.generate_occurrence_protocol();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_occurrences_tenant    ON public.occurrences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_status    ON public.occurrences(status);
CREATE INDEX IF NOT EXISTS idx_occurrences_category  ON public.occurrences(category);
CREATE INDEX IF NOT EXISTS idx_occurrences_criado_em ON public.occurrences(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_occurrences_token     ON public.occurrences(public_token);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: users see only their tenant's occurrences
CREATE POLICY "occurrences_tenant_select" ON public.occurrences
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "occurrences_tenant_insert" ON public.occurrences
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "occurrences_tenant_update" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Public token access (doctors, patients)
CREATE POLICY "occurrences_public_token_select" ON public.occurrences
  FOR SELECT TO anon, authenticated
  USING (public_token IS NOT NULL);

-- ============================================================
-- Occurrence attachments bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('occurrence-attachments', 'occurrence-attachments', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "occurrence_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'occurrence-attachments');

CREATE POLICY "occurrence_attachments_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'occurrence-attachments');
