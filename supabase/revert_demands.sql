-- Remove demands da publicação Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'demands'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE demands';
  END IF;
END $$;

-- Remove estoque_toners da publicação Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'estoque_toners'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE estoque_toners';
  END IF;
END $$;

-- Remove a tabela demands (sem resquícios)
DROP TABLE IF EXISTS public.demands CASCADE;
