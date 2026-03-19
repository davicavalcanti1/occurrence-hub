-- Add patient safety occurrence type and subtypes
ALTER TYPE public.occurrence_type ADD VALUE IF NOT EXISTS 'seguranca_paciente';

ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'queda';
ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'erro_identificacao_paciente';
ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'reacao_contraste_grave';
ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'falha_equipamento_clinico';
ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'falha_comunicacao';
ALTER TYPE public.occurrence_subtype ADD VALUE IF NOT EXISTS 'evento_sentinela_livre';
