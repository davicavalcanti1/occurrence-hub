-- =============================================================================
-- CONSOLIDATED MIGRATION - Final Database State
-- Generated: 2026-02-06
-- =============================================================================

-- CLEANUP (Robust mode)
-- Drop objects in dependency order to ensure clean state
DROP VIEW IF EXISTS public.inspections_overview;

DROP TABLE IF EXISTS public.inspecoes_cilindros CASCADE;
DROP TABLE IF EXISTS public.inspections_ac CASCADE;
DROP TABLE IF EXISTS public.inspections_banheiro CASCADE;
DROP TABLE IF EXISTS public.inspections_dispenser CASCADE;
DROP TABLE IF EXISTS public.occurrence_book_entries CASCADE;
DROP TABLE IF EXISTS public.generic_occurrences CASCADE;
DROP TABLE IF EXISTS public.patient_occurrences CASCADE;
DROP TABLE IF EXISTS public.nursing_occurrences CASCADE;
DROP TABLE IF EXISTS public.administrative_occurrences CASCADE;
DROP TABLE IF EXISTS public.occurrences_laudo CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.capa_status CASCADE;
DROP TYPE IF EXISTS public.occurrence_status CASCADE;
DROP TYPE IF EXISTS public.occurrence_subtype CASCADE;
DROP TYPE IF EXISTS public.occurrence_type CASCADE;
DROP TYPE IF EXISTS public.outcome_type CASCADE;
DROP TYPE IF EXISTS public.triage_classification CASCADE;
DROP TYPE IF EXISTS public.inspection_status_chamado CASCADE;




-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- =============================================================================
-- 2. ENUMS
-- =============================================================================

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'rh',
    'enfermagem'
);

CREATE TYPE public.capa_status AS ENUM (
    'pendente',
    'em_andamento',
    'concluida',
    'verificada'
);

CREATE TYPE public.occurrence_status AS ENUM (
    'registrada',
    'em_triagem',
    'em_analise',
    'acao_em_andamento',
    'concluida',
    'improcedente'
);

CREATE TYPE public.occurrence_subtype AS ENUM (
    'erro_identificacao',
    'medicacao_contraste',
    'quedas_traumas',
    'qualidade_imagem_laudo',
    'radiacao_seguranca',
    'atendimento_recepcao',
    'agendamento',
    'entrega_resultados',
    'faturamento',
    'equipamentos',
    'sistemas',
    'predial',
    'extravasamento',
    'revisao_exame'
);

CREATE TYPE public.occurrence_type AS ENUM (
    'assistencial',
    'administrativa',
    'tecnica',
    'paciente',
    'simples',
    'livre'
);

CREATE TYPE public.outcome_type AS ENUM (
    'imediato_correcao',
    'orientacao',
    'treinamento',
    'alteracao_processo',
    'manutencao_corretiva',
    'notificacao_externa',
    'improcedente'
);

CREATE TYPE public.triage_classification AS ENUM (
    'circunstancia_risco',
    'near_miss',
    'incidente_sem_dano',
    'evento_adverso',
    'evento_sentinela'
);

CREATE TYPE public.inspection_status_chamado AS ENUM (
    'aberto',
    'finalizado'
);

-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 tenants
-- -----------------------------------------------------------------------------
CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#0066CC'::text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tenants_pkey PRIMARY KEY (id),
    CONSTRAINT tenants_slug_key UNIQUE (slug)
);

-- -----------------------------------------------------------------------------
-- 3.2 profiles
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    last_login_ip text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    approved boolean DEFAULT false,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 3.3 user_roles
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_tenant_id_key UNIQUE (user_id, tenant_id),
    CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 3.4 audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3.5 password_reset_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT password_reset_tokens_token_key UNIQUE (token),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 3.6 occurrences_laudo
-- -----------------------------------------------------------------------------
CREATE TABLE public.occurrences_laudo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    protocolo text NOT NULL,
    tipo public.occurrence_type NOT NULL,
    subtipo public.occurrence_subtype,
    paciente_nome_completo text,
    paciente_telefone text,
    paciente_id text,
    paciente_data_nascimento date,
    paciente_tipo_exame text,
    paciente_unidade_local text,
    paciente_data_hora_evento timestamp with time zone,
    paciente_sexo text,
    descricao_detalhada text NOT NULL,
    acao_imediata text,
    impacto_percebido text,
    pessoas_envolvidas text,
    contem_dado_sensivel boolean DEFAULT false,
    status public.occurrence_status DEFAULT 'registrada'::public.occurrence_status NOT NULL,
    triagem public.triage_classification,
    triagem_por uuid,
    triagem_em timestamp with time zone,
    desfecho_tipos public.outcome_type[] DEFAULT '{}'::public.outcome_type[],
    desfecho_justificativa text,
    desfecho_principal public.outcome_type,
    desfecho_definido_por uuid,
    desfecho_definido_em timestamp with time zone,
    notificacao_orgao text,
    notificacao_data date,
    notificacao_responsavel text,
    notificacao_anexo_url text,
    criado_por uuid,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    pdf_conclusao_url text,
    pdf_gerado_em timestamp with time zone,
    dados_especificos jsonb DEFAULT '{}'::jsonb,
    registrador_setor text,
    registrador_cargo text,
    houve_dano boolean DEFAULT false,
    descricao_dano text,
    pessoas_comunicadas jsonb DEFAULT '[]'::jsonb,
    observacoes text,
    acoes_imediatas_checklist jsonb DEFAULT '[]'::jsonb,
    public_token text,
    medico_destino text,
    mensagem_admin_medico text,
    mensagem_medico text,
    encaminhada_em timestamp with time zone,
    finalizada_em timestamp with time zone,
    custom_type text,
    related_employee_id uuid,
    employee_name text,
    historico_status jsonb DEFAULT '[]'::jsonb,
    comentarios jsonb DEFAULT '[]'::jsonb,
    dados_capa jsonb DEFAULT '{}'::jsonb,
    anexos jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT occurrences_pkey PRIMARY KEY (id),
    CONSTRAINT occurrences_protocolo_key UNIQUE (protocolo),
    CONSTRAINT occurrences_public_token_key UNIQUE (public_token),
    CONSTRAINT occurrences_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.profiles(id),
    CONSTRAINT occurrences_desfecho_definido_por_fkey FOREIGN KEY (desfecho_definido_por) REFERENCES public.profiles(id),
    CONSTRAINT occurrences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT occurrences_triagem_por_fkey FOREIGN KEY (triagem_por) REFERENCES public.profiles(id),
    CONSTRAINT occurrences_related_employee_id_fkey FOREIGN KEY (related_employee_id) REFERENCES public.profiles(id)
);

-- -----------------------------------------------------------------------------
-- 3.7 administrative_occurrences
-- -----------------------------------------------------------------------------
CREATE TABLE public.administrative_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    protocol text,
    employee_name text NOT NULL,
    occurrence_date date NOT NULL,
    type text NOT NULL,
    subtype text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pendente' NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    coordinator_signature_path text,
    employee_signature_path text,
    signed_at timestamp with time zone,
    historico_status jsonb DEFAULT '[]'::jsonb,
    comentarios jsonb DEFAULT '[]'::jsonb,
    dados_capa jsonb DEFAULT '{}'::jsonb,
    anexos jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT administrative_occurrences_pkey PRIMARY KEY (id),
    CONSTRAINT administrative_occurrences_protocol_key UNIQUE (protocol),
    CONSTRAINT administrative_occurrences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

-- -----------------------------------------------------------------------------
-- 3.8 nursing_occurrences
-- -----------------------------------------------------------------------------
CREATE TABLE public.nursing_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    protocol text,
    patient_name text NOT NULL,
    patient_id text,
    patient_birth_date date,
    occurrence_date timestamp with time zone NOT NULL,
    type text NOT NULL DEFAULT 'enfermagem',
    subtype text NOT NULL,
    description text NOT NULL,
    conduct text,
    status text DEFAULT 'registrada' NOT NULL,
    triage text,
    specific_data jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    historico_status jsonb DEFAULT '[]'::jsonb,
    comentarios jsonb DEFAULT '[]'::jsonb,
    dados_capa jsonb DEFAULT '{}'::jsonb,
    anexos jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT nursing_occurrences_pkey PRIMARY KEY (id),
    CONSTRAINT nursing_occurrences_protocol_key UNIQUE (protocol),
    CONSTRAINT nursing_occurrences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
    CONSTRAINT nursing_occurrences_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT nursing_occurrences_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------------
-- 3.9 patient_occurrences
-- -----------------------------------------------------------------------------
CREATE TABLE public.patient_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    protocol text NOT NULL,
    patient_name text,
    patient_phone text,
    patient_birth_date date,
    description text NOT NULL,
    is_anonymous boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text DEFAULT 'pendente',
    user_agent text,
    ip_address text,
    sector text,
    occurrence_date date,
    historico_status jsonb DEFAULT '[]'::jsonb,
    comentarios jsonb DEFAULT '[]'::jsonb,
    dados_capa jsonb DEFAULT '{}'::jsonb,
    anexos jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT patient_occurrences_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 3.10 generic_occurrences
-- -----------------------------------------------------------------------------
CREATE TABLE public.generic_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    protocolo text NOT NULL,
    tipo text NOT NULL DEFAULT 'simples',
    custom_type text,
    target_type text,
    person_info jsonb DEFAULT '{}'::jsonb,
    descricao text NOT NULL,
    status text NOT NULL DEFAULT 'registrada',
    historico_status jsonb DEFAULT '[]'::jsonb,
    comentarios jsonb DEFAULT '[]'::jsonb,
    dados_capa jsonb DEFAULT '{}'::jsonb,
    anexos jsonb DEFAULT '[]'::jsonb,
    criado_por uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT generic_occurrences_pkey PRIMARY KEY (id),
    CONSTRAINT generic_occurrences_protocolo_key UNIQUE (protocolo),
    CONSTRAINT generic_occurrences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
    CONSTRAINT generic_occurrences_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------------
-- 3.11 occurrence_book_entries
-- -----------------------------------------------------------------------------
CREATE TABLE public.occurrence_book_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector text NOT NULL CHECK (sector IN ('administrativo', 'enfermagem')),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by uuid,
    page_number integer NOT NULL,
    tenant_id uuid,
    CONSTRAINT occurrence_book_entries_pkey PRIMARY KEY (id),
    CONSTRAINT occurrence_book_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT occurrence_book_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

-- -----------------------------------------------------------------------------
-- 3.12 inspections_dispenser
-- -----------------------------------------------------------------------------
CREATE TABLE public.inspections_dispenser (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    protocolo text NOT NULL,
    localizacao text NOT NULL,
    problema text NOT NULL,
    descricao text,
    status public.inspection_status_chamado DEFAULT 'aberto',
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por uuid,
    finalizado_em timestamp with time zone,
    finalizado_por text,
    observacoes_finalizacao text,
    CONSTRAINT inspections_dispenser_pkey PRIMARY KEY (id),
    CONSTRAINT inspections_dispenser_protocolo_key UNIQUE (protocolo),
    CONSTRAINT inspections_dispenser_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT inspections_dispenser_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3.13 inspections_banheiro
-- -----------------------------------------------------------------------------
CREATE TABLE public.inspections_banheiro (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    protocolo text NOT NULL,
    localizacao text NOT NULL,
    problema text NOT NULL,
    descricao text NOT NULL,
    status public.inspection_status_chamado DEFAULT 'aberto',
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por uuid,
    finalizado_em timestamp with time zone,
    finalizado_por text,
    observacoes_finalizacao text,
    CONSTRAINT inspections_banheiro_pkey PRIMARY KEY (id),
    CONSTRAINT inspections_banheiro_protocolo_key UNIQUE (protocolo),
    CONSTRAINT inspections_banheiro_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT inspections_banheiro_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3.14 inspections_ac
-- -----------------------------------------------------------------------------
CREATE TABLE public.inspections_ac (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    localizacao text NOT NULL,
    origem text NOT NULL,
    modelo text,
    numero_serie text,
    atividades jsonb DEFAULT '[]'::jsonb,
    fotos_urls text[] DEFAULT '{}',
    observacoes text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por uuid,
    CONSTRAINT inspections_ac_pkey PRIMARY KEY (id),
    CONSTRAINT inspections_ac_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT inspections_ac_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3.15 inspecoes_cilindros
-- -----------------------------------------------------------------------------
CREATE TABLE public.inspecoes_cilindros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    protocolo text,
    data_referencia date NOT NULL DEFAULT CURRENT_DATE,
    funcionario text NOT NULL,
    precisa_oxigenio boolean NOT NULL DEFAULT false,
    qtd_oxigenio integer,
    precisa_ar boolean NOT NULL DEFAULT false,
    qtd_ar integer,
    observacoes text,
    fotos_urls text[] DEFAULT '{}',
    status text DEFAULT 'finalizado',
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inspecoes_cilindros_pkey PRIMARY KEY (id),
    CONSTRAINT inspecoes_cilindros_protocolo_key UNIQUE (protocolo),
    CONSTRAINT inspecoes_cilindros_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- 4. VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW public.inspections_overview AS
SELECT
    id,
    'dispenser' as tipo,
    localizacao,
    status,
    criado_em,
    finalizado_em,
    problema as resumo
FROM public.inspections_dispenser
UNION ALL
SELECT
    id,
    'banheiro' as tipo,
    localizacao,
    status,
    criado_em,
    finalizado_em,
    problema as resumo
FROM public.inspections_banheiro
UNION ALL
SELECT
    id,
    'ar_condicionado' as tipo,
    localizacao,
    'finalizado'::public.inspection_status_chamado as status,
    criado_em,
    criado_em as finalizado_em,
    origem || ' - ' || COALESCE(modelo, '') as resumo
FROM public.inspections_ac;

-- =============================================================================
-- 5. FUNCTIONS
-- =============================================================================

-- get_user_tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- handle_atualizado_em
CREATE OR REPLACE FUNCTION public.handle_atualizado_em() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'imago' LIMIT 1;

  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug, is_active)
    VALUES ('Clínica Imago', 'imago', true)
    RETURNING id INTO default_tenant_id;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (
    NEW.id,
    default_tenant_id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (
    NEW.id,
    default_tenant_id,
    CASE
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = default_tenant_id) = 1 THEN 'admin'::public.app_role
      ELSE 'user'::public.app_role
    END
  );

  RETURN NEW;
END;
$$;

-- generate_public_token
CREATE OR REPLACE FUNCTION public.generate_public_token() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- has_role (uuid, app_role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- has_role (app_role, uuid)
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- is_tenant_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- user_belongs_to_tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event(_action text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid, _details jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _tenant_id UUID;
  _log_id UUID;
BEGIN
  SELECT public.get_user_tenant_id(auth.uid()) INTO _tenant_id;

  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, details)
  VALUES (_tenant_id, auth.uid(), _action, _entity_type, _entity_id, _details)
  RETURNING id INTO _log_id;

  RETURN _log_id;
END;
$$;

-- generate_protocol_number (final version)
CREATE OR REPLACE FUNCTION public.generate_protocol_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    year_prefix text;
    count_laudo integer;
    count_nursing integer;
    next_num integer;
    protocol text;
BEGIN
    year_prefix := to_char(now(), 'YYYY');

    SELECT count(*) INTO count_laudo
    FROM public.occurrences_laudo
    WHERE to_char(criado_em, 'YYYY') = year_prefix;

    SELECT count(*) INTO count_nursing
    FROM public.nursing_occurrences
    WHERE to_char(created_at, 'YYYY') = year_prefix;

    next_num := count_laudo + count_nursing + 1;

    protocol := year_prefix || lpad(next_num::text, 6, '0');
    RETURN protocol;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_protocol_number(uuid) TO anon, authenticated, service_role;

-- generate_laudo_protocol
CREATE OR REPLACE FUNCTION public.generate_laudo_protocol(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(protocolo FROM 7)::INTEGER), 0) + 1
  INTO next_seq
  FROM public.occurrences_laudo
  WHERE protocolo LIKE '306301%';

  RETURN '306301' || LPAD(next_seq::text, 4, '0');
END;
$$;

-- generate_admin_protocol_number
CREATE OR REPLACE FUNCTION public.generate_admin_protocol_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(protocol FROM 7)::INTEGER), 0) + 1
  INTO next_seq
  FROM public.administrative_occurrences
  WHERE protocol LIKE '306302%';

  RETURN '306302' || LPAD(next_seq::text, 4, '0');
END;
$$;

-- set_admin_protocol (trigger function)
CREATE OR REPLACE FUNCTION public.set_admin_protocol() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.protocol IS NULL THEN
    NEW.protocol := public.generate_admin_protocol_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

-- generate_nursing_protocol_number
CREATE OR REPLACE FUNCTION public.generate_nursing_protocol_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(protocol FROM 7)::INTEGER), 0) + 1
  INTO next_seq
  FROM public.nursing_occurrences
  WHERE protocol LIKE '306303%';

  RETURN '306303' || LPAD(next_seq::text, 4, '0');
END;
$$;

-- set_nursing_protocol (trigger function)
CREATE OR REPLACE FUNCTION public.set_nursing_protocol() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.protocol IS NULL THEN
    NEW.protocol := public.generate_nursing_protocol_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

-- generate_patient_protocol_number
CREATE OR REPLACE FUNCTION public.generate_patient_protocol_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(protocol FROM 7)::INTEGER), 0) + 1
  INTO next_seq
  FROM public.patient_occurrences
  WHERE protocol LIKE '306304%';

  RETURN '306304' || LPAD(next_seq::text, 4, '0');
END;
$$;

-- generate_generic_protocol
CREATE OR REPLACE FUNCTION public.generate_generic_protocol() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  next_seq INTEGER;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(NULLIF(regexp_replace(protocolo, '.*-', ''), '')::INTEGER), 0) + 1
  INTO next_seq
  FROM public.generic_occurrences
  WHERE protocolo LIKE 'GEN-' || year_str || '-%';

  RETURN 'GEN-' || year_str || '-' || LPAD(next_seq::text, 4, '0');
END;
$$;

-- generate_standard_protocol (utility)
CREATE OR REPLACE FUNCTION public.generate_standard_protocol(prefix text, sequence int) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN prefix || LPAD(sequence::text, 4, '0');
END;
$$;

-- set_book_page_number (trigger function)
CREATE OR REPLACE FUNCTION public.set_book_page_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    SELECT COALESCE(MAX(page_number), 0) + 1
    INTO NEW.page_number
    FROM public.occurrence_book_entries
    WHERE sector = NEW.sector;
    RETURN NEW;
END;
$$;

-- close_dispenser_ticket (RPC)
CREATE OR REPLACE FUNCTION public.close_dispenser_ticket(
    p_protocolo text,
    p_funcionario text,
    p_observacoes text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_id UUID;
    v_loc TEXT;
BEGIN
    SELECT id, localizacao INTO v_id, v_loc
    FROM public.inspections_dispenser
    WHERE protocolo = p_protocolo AND status = 'aberto';

    IF v_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Protocolo não encontrado ou já finalizado');
    END IF;

    UPDATE public.inspections_dispenser
    SET status = 'finalizado', finalizado_em = now(), finalizado_por = p_funcionario, observacoes_finalizacao = p_observacoes
    WHERE id = v_id;

    RETURN jsonb_build_object('success', true, 'localizacao', v_loc);
END;
$$;

-- close_banheiro_ticket (RPC)
CREATE OR REPLACE FUNCTION public.close_banheiro_ticket(
    p_protocolo text,
    p_funcionario text,
    p_observacoes text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_id UUID;
    v_loc TEXT;
BEGIN
    SELECT id, localizacao INTO v_id, v_loc
    FROM public.inspections_banheiro
    WHERE protocolo = p_protocolo AND status = 'aberto';

    IF v_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Protocolo não encontrado ou já finalizado');
    END IF;

    UPDATE public.inspections_banheiro
    SET status = 'finalizado', finalizado_em = now(), finalizado_por = p_funcionario, observacoes_finalizacao = p_observacoes
    WHERE id = v_id;

    RETURN jsonb_build_object('success', true, 'localizacao', v_loc);
END;
$$;

-- generate_cilindro_protocol (trigger function)
CREATE OR REPLACE FUNCTION public.generate_cilindro_protocol() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    date_part TEXT;
    sequence_part INT;
BEGIN
    date_part := to_char(NEW.data_referencia, 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO sequence_part
    FROM public.inspecoes_cilindros
    WHERE data_referencia = NEW.data_referencia;

    NEW.protocolo := 'CIL-' || date_part || '-' || LPAD(sequence_part::TEXT, 2, '0');

    RETURN NEW;
END;
$$;

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

CREATE TRIGGER set_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_occurrences_atualizado_em
    BEFORE UPDATE ON public.occurrences_laudo
    FOR EACH ROW EXECUTE FUNCTION public.handle_atualizado_em();

CREATE TRIGGER set_admin_protocol_trigger
    BEFORE INSERT ON public.administrative_occurrences
    FOR EACH ROW EXECUTE FUNCTION public.set_admin_protocol();

CREATE TRIGGER handle_updated_at_admin_occ
    BEFORE UPDATE ON public.administrative_occurrences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_nursing_protocol_trigger
    BEFORE INSERT ON public.nursing_occurrences
    FOR EACH ROW EXECUTE FUNCTION public.set_nursing_protocol();

CREATE TRIGGER handle_updated_at_nursing_occ
    BEFORE UPDATE ON public.nursing_occurrences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_set_book_page_number
    BEFORE INSERT ON public.occurrence_book_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_book_page_number();

CREATE TRIGGER set_cilindro_protocol
    BEFORE INSERT ON public.inspecoes_cilindros
    FOR EACH ROW EXECUTE FUNCTION public.generate_cilindro_protocol();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences_laudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generic_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections_dispenser ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections_banheiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections_ac ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes_cilindros ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. RLS POLICIES
-- =============================================================================

-- tenants
CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING ((id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Admins can update their own tenant" ON public.tenants
    FOR UPDATE TO authenticated
    USING (((id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

-- profiles
CREATE POLICY "Users can view profiles in their tenant" ON public.profiles
    FOR SELECT TO authenticated
    USING ((tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((id = auth.uid()));

CREATE POLICY "Admins can insert profiles in their tenant" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (((tenant_id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

CREATE POLICY "Admins can update profiles in their tenant" ON public.profiles
    FOR UPDATE TO authenticated
    USING (((tenant_id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

-- user_roles
CREATE POLICY "Users can view roles in their tenant" ON public.user_roles
    FOR SELECT TO authenticated
    USING ((tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Admins can manage roles in their tenant" ON public.user_roles
    TO authenticated
    USING (((tenant_id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

-- audit_logs
CREATE POLICY "Admins can view audit logs in their tenant" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (((tenant_id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.get_user_tenant_id(auth.uid())));

-- password_reset_tokens
CREATE POLICY "Users can view their own tokens" ON public.password_reset_tokens
    FOR SELECT TO authenticated
    USING ((user_id = auth.uid()));

-- occurrences_laudo
CREATE POLICY "Users can view occurrences in their tenant" ON public.occurrences_laudo
    FOR SELECT
    USING ((tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can create occurrences in their tenant" ON public.occurrences_laudo
    FOR INSERT
    WITH CHECK ((tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can update occurrences in their tenant" ON public.occurrences_laudo
    FOR UPDATE
    USING ((tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Admins can delete occurrences in their tenant" ON public.occurrences_laudo
    FOR DELETE
    USING (((tenant_id = public.get_user_tenant_id(auth.uid())) AND public.is_tenant_admin(auth.uid())));

CREATE POLICY "Public can view occurrence by valid token" ON public.occurrences_laudo
    FOR SELECT
    USING (((public_token IS NOT NULL) AND (subtipo = 'revisao_exame'::public.occurrence_subtype)));

CREATE POLICY "Public can update mensagem_medico by valid token" ON public.occurrences_laudo
    FOR UPDATE
    USING (((public_token IS NOT NULL) AND (subtipo = 'revisao_exame'::public.occurrence_subtype)))
    WITH CHECK (((public_token IS NOT NULL) AND (subtipo = 'revisao_exame'::public.occurrence_subtype)));

CREATE POLICY "Public insert patient occurrences" ON public.occurrences_laudo
    FOR INSERT
    WITH CHECK ((tipo = 'paciente'));

-- administrative_occurrences
CREATE POLICY "RH and Admin can view all administrative occurrences" ON public.administrative_occurrences
    FOR SELECT TO authenticated
    USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')));

CREATE POLICY "RH and Admin can insert administrative occurrences" ON public.administrative_occurrences
    FOR INSERT TO authenticated
    WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')));

CREATE POLICY "RH and Admin can update administrative occurrences" ON public.administrative_occurrences
    FOR UPDATE TO authenticated
    USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')));

-- nursing_occurrences
CREATE POLICY "Authorized users can view nursing occurrences" ON public.nursing_occurrences
    FOR SELECT TO authenticated
    USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'user')));

CREATE POLICY "Authorized users can insert nursing occurrences" ON public.nursing_occurrences
    FOR INSERT TO authenticated
    WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'user')));

CREATE POLICY "Authorized users can update nursing occurrences" ON public.nursing_occurrences
    FOR UPDATE TO authenticated
    USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'user')));

-- patient_occurrences
CREATE POLICY "Anon insert patient occurrences" ON public.patient_occurrences
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff view all patient occurrences" ON public.patient_occurrences
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff update patient occurrences" ON public.patient_occurrences
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- generic_occurrences
CREATE POLICY "Users can view generic occurrences" ON public.generic_occurrences
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert generic occurrences" ON public.generic_occurrences
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update generic occurrences" ON public.generic_occurrences
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- occurrence_book_entries
CREATE POLICY "Admin view all books" ON public.occurrence_book_entries
    FOR SELECT
    USING (public.has_role('admin'::public.app_role, auth.uid()));

CREATE POLICY "RH view administrative" ON public.occurrence_book_entries
    FOR SELECT
    USING ((sector = 'administrativo' AND (public.has_role('rh'::public.app_role, auth.uid()) OR public.has_role('admin'::public.app_role, auth.uid()))));

CREATE POLICY "Enfermagem view enfermagem" ON public.occurrence_book_entries
    FOR SELECT
    USING ((sector = 'enfermagem' AND (public.has_role('enfermagem'::public.app_role, auth.uid()) OR public.has_role('admin'::public.app_role, auth.uid()))));

CREATE POLICY "RH insert administrative" ON public.occurrence_book_entries
    FOR INSERT
    WITH CHECK ((sector = 'administrativo' AND public.has_role('rh'::public.app_role, auth.uid())));

CREATE POLICY "Enfermagem insert enfermagem" ON public.occurrence_book_entries
    FOR INSERT
    WITH CHECK ((sector = 'enfermagem' AND public.has_role('enfermagem'::public.app_role, auth.uid())));

CREATE POLICY "Admin insert all" ON public.occurrence_book_entries
    FOR INSERT
    WITH CHECK (public.has_role('admin'::public.app_role, auth.uid()));

-- inspections_dispenser
CREATE POLICY "Public insert dispenser" ON public.inspections_dispenser
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Auth view dispenser" ON public.inspections_dispenser
    FOR SELECT TO authenticated
    USING (true);

-- inspections_banheiro
CREATE POLICY "Public insert banheiro" ON public.inspections_banheiro
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Auth view banheiro" ON public.inspections_banheiro
    FOR SELECT TO authenticated
    USING (true);

-- inspections_ac
CREATE POLICY "Public insert ac" ON public.inspections_ac
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Auth view ac" ON public.inspections_ac
    FOR SELECT TO authenticated
    USING (true);

-- inspecoes_cilindros
CREATE POLICY "Public insert cilindros" ON public.inspecoes_cilindros
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Public read cilindros" ON public.inspecoes_cilindros
    FOR SELECT TO anon, authenticated
    USING (true);

-- =============================================================================
-- 9. STORAGE BUCKETS & POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'occurrence-attachments',
  'occurrence-attachments',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'occurrence-attachments');

CREATE POLICY "Authenticated users can read attachments" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'occurrence-attachments');

CREATE POLICY "Authenticated users can delete attachments" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'occurrence-attachments');

CREATE POLICY "Anyone can read attachments with signed URL" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'occurrence-attachments');

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-images', 'inspection-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access View" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'inspection-images');

CREATE POLICY "Public Access Upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'inspection-images');

CREATE POLICY "Admin Access All" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'inspection-images')
    WITH CHECK (bucket_id = 'inspection-images');

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspecoes-cilindros', 'inspecoes-cilindros', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public uploads cilindros" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'inspecoes-cilindros');

CREATE POLICY "Allow public read cilindros" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'inspecoes-cilindros');

-- =============================================================================
-- 10. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_occurrences_criado_em ON public.occurrences_laudo USING btree (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_occurrences_dados_especificos ON public.occurrences_laudo USING gin (dados_especificos);
CREATE INDEX IF NOT EXISTS idx_occurrences_public_token ON public.occurrences_laudo USING btree (public_token) WHERE (public_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_occurrences_status ON public.occurrences_laudo USING btree (status);
CREATE INDEX IF NOT EXISTS idx_occurrences_subtipo ON public.occurrences_laudo USING btree (subtipo);
CREATE INDEX IF NOT EXISTS idx_occurrences_tenant_id ON public.occurrences_laudo USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_tipo ON public.occurrences_laudo USING btree (tipo);
CREATE INDEX IF NOT EXISTS idx_occurrences_triagem ON public.occurrences_laudo USING btree (triagem);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles USING btree (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_disp_protocolo ON public.inspections_dispenser(protocolo);
CREATE INDEX IF NOT EXISTS idx_disp_status ON public.inspections_dispenser(status);
CREATE INDEX IF NOT EXISTS idx_disp_criado_em ON public.inspections_dispenser(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_banho_protocolo ON public.inspections_banheiro(protocolo);
CREATE INDEX IF NOT EXISTS idx_banho_status ON public.inspections_banheiro(status);
CREATE INDEX IF NOT EXISTS idx_banho_criado_em ON public.inspections_banheiro(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_ac_local ON public.inspections_ac(localizacao);
CREATE INDEX IF NOT EXISTS idx_ac_origem ON public.inspections_ac(origem);
CREATE INDEX IF NOT EXISTS idx_ac_criado_em ON public.inspections_ac(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_cilindros_data ON public.inspecoes_cilindros(data_referencia);
CREATE INDEX IF NOT EXISTS idx_cilindros_protocolo ON public.inspecoes_cilindros(protocolo);

-- =============================================================================
-- 11. GRANTS
-- =============================================================================

GRANT SELECT, INSERT ON public.occurrence_book_entries TO authenticated;
GRANT SELECT, INSERT ON public.patient_occurrences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_occurrences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_occurrences TO service_role;
GRANT INSERT ON public.occurrences_laudo TO anon;
