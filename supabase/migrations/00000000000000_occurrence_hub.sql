-- =============================================================================
-- occurrence-hub — Schema completo
-- Multi-tenant SaaS de gestão de ocorrências
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM (
  'developer',   -- acesso total a todos os tenants (suporte/SaaS owner)
  'admin',       -- gestor da empresa
  'supervisor',  -- supervisor de qualidade
  'rh',          -- recursos humanos (vê ocorrências administrativas)
  'enfermagem',  -- enfermagem (vê ocorrências clínicas)
  'user'         -- usuário padrão (registra revisões de exame)
);

-- ---------------------------------------------------------------------------
-- TENANTS
-- Uma linha por empresa cliente
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  modules     TEXT[]      DEFAULT ARRAY['ocorrencias','analise','livro']::TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PROFILES
-- Extensão de auth.users com nome, avatar e vínculo ao tenant
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- USER ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- TENANT SETTINGS
-- Configurações por empresa: branding, webhooks, SLAs
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenant_settings (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    UUID        NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Branding
  company_name                 TEXT,
  logo_url                     TEXT,
  primary_color                TEXT        DEFAULT '#2563eb',
  favicon_url                  TEXT,

  -- Webhooks (ciclo de vida da ocorrência)
  webhook_nova_ocorrencia      TEXT,
  webhook_ocorrencia_concluida TEXT,
  webhook_encaminhar_medico    TEXT,
  webhook_confirmacao_medico   TEXT,
  webhook_paciente_portal      TEXT,

  -- SLAs (em horas)
  sla_triagem_horas            INTEGER     DEFAULT 24,
  sla_analise_horas            INTEGER     DEFAULT 72,
  sla_acao_horas               INTEGER     DEFAULT 168,
  sla_sentinela_triagem_horas  INTEGER     DEFAULT 2,
  sla_sentinela_acao_horas     INTEGER     DEFAULT 72,

  created_at                   TIMESTAMPTZ DEFAULT now(),
  updated_at                   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PASSWORD RESET TOKENS
-- ---------------------------------------------------------------------------
CREATE TABLE public.password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  used        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- OCCURRENCES
-- Tabela unificada: clínicas (revisão de exame, enfermagem, seg. paciente…)
-- e administrativas (RH) convivem na mesma tabela com o campo "category".
-- ---------------------------------------------------------------------------
CREATE SEQUENCE public.occurrence_protocol_seq START 1;

CREATE TABLE public.occurrences (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocol     TEXT        UNIQUE,

  -- Clínica ou administrativa
  category     TEXT        NOT NULL DEFAULT 'clinica'
                           CHECK (category IN ('clinica', 'administrativa')),

  -- Classificação
  tipo         TEXT        NOT NULL,
  subtipo      TEXT,
  status       TEXT        NOT NULL DEFAULT 'registrada'
                           CHECK (status IN (
                             'registrada','em_triagem','em_analise',
                             'acao_em_andamento','concluida','improcedente'
                           )),

  -- Campos clínicos
  triagem      TEXT        CHECK (triagem IN (
                             'verde','amarelo','laranja','vermelho','evento_sentinela'
                           )),
  paciente            JSONB       NOT NULL DEFAULT '{}',
  dados_especificos   JSONB       NOT NULL DEFAULT '{}',
  desfecho_tipos      TEXT[]      DEFAULT '{}',
  desfecho_descricao  TEXT,
  medico_destino      TEXT,
  public_token        TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Campos administrativos (RH)
  employee_name               TEXT,
  occurrence_date             DATE,
  coordinator_signature_path  TEXT,
  employee_signature_path     TEXT,
  signed_at                   TIMESTAMPTZ,

  -- Compartilhados
  description  TEXT,
  attachments  JSONB       NOT NULL DEFAULT '[]',

  -- Auditoria
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criador_nome TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- OCCURRENCE BOOK
-- Registro cronológico (livro de ocorrências)
-- ---------------------------------------------------------------------------
CREATE TABLE public.occurrence_book_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  occurrence_id UUID       REFERENCES public.occurrences(id) ON DELETE SET NULL,
  page_number  INTEGER,
  content      TEXT        NOT NULL,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  criador_nome TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.occurrence_book_entries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

-- updated_at genérico
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_occurrences_updated_at
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Protocolo automático: OC-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_occurrence_protocol()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.protocol IS NULL OR NEW.protocol = '' THEN
    NEW.protocol := 'OC-' || to_char(now(), 'YYYY') || '-'
                    || lpad(nextval('public.occurrence_protocol_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_occurrences_protocol
  BEFORE INSERT ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.generate_occurrence_protocol();

-- Número de página do livro
CREATE OR REPLACE FUNCTION public.set_book_page_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.page_number := COALESCE(
    (SELECT MAX(page_number) FROM public.occurrence_book_entries WHERE tenant_id = NEW.tenant_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_page_number
  BEFORE INSERT ON public.occurrence_book_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_book_page_number();

-- Novo usuário: cria profile e role automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
  v_role      public.app_role;
BEGIN
  -- Tenant: usa metadado ou pega o único existente ou cria novo
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'))
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Profile
  INSERT INTO public.profiles (id, tenant_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Primeiro usuário do tenant vira admin
  v_role := CASE
    WHEN (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = v_tenant_id) = 1
      THEN 'admin'::public.app_role
    ELSE COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'user'::public.app_role
    )
  END;

  INSERT INTO public.user_roles (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, v_role)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- HELPER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------------------

-- Tenants
CREATE POLICY "tenant_select_own" ON public.tenants FOR SELECT TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_all_developer" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

-- Profiles
CREATE POLICY "profile_select_tenant" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "profile_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profile_manage_admin" ON public.profiles FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "user_roles_select_tenant" ON public.user_roles FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "user_roles_manage_admin" ON public.user_roles FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin'));

-- Tenant settings
CREATE POLICY "tenant_settings_select" ON public.tenant_settings FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_settings_manage_admin" ON public.tenant_settings FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tenant_settings_all_developer" ON public.tenant_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

-- Tenant settings: leitura pública anon (para páginas sem login)
CREATE POLICY "tenant_settings_anon_select" ON public.tenant_settings FOR SELECT TO anon
  USING (true);

-- Occurrences: isolamento por tenant
CREATE POLICY "occurrences_select" ON public.occurrences FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "occurrences_insert" ON public.occurrences FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "occurrences_update" ON public.occurrences FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Leitura pública via token (médicos, portal do paciente)
CREATE POLICY "occurrences_public_token" ON public.occurrences FOR SELECT TO anon, authenticated
  USING (public_token IS NOT NULL);

-- Developer: acesso total
CREATE POLICY "occurrences_all_developer" ON public.occurrences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

-- Livro
CREATE POLICY "book_select" ON public.occurrence_book_entries FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "book_insert" ON public.occurrence_book_entries FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- STORAGE: attachments bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('occurrence-attachments', 'occurrence-attachments', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'occurrence-attachments');

CREATE POLICY "attachments_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'occurrence-attachments');

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_occurrences_tenant   ON public.occurrences(tenant_id);
CREATE INDEX idx_occurrences_status   ON public.occurrences(status);
CREATE INDEX idx_occurrences_category ON public.occurrences(category);
CREATE INDEX idx_occurrences_criado   ON public.occurrences(criado_em DESC);
CREATE INDEX idx_occurrences_token    ON public.occurrences(public_token);
CREATE INDEX idx_book_tenant          ON public.occurrence_book_entries(tenant_id);
