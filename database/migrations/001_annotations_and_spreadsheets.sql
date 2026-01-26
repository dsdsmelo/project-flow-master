-- ============================================
-- MIGRAÇÃO: ANOTAÇÕES APRIMORADAS E PLANILHAS
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. ATUALIZAR TABELA MEETING_NOTES
-- Adicionar campos para categorias e templates
-- ============================================

-- Adicionar coluna category se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meeting_notes'
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.meeting_notes
    ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;
END $$;

-- Adicionar coluna template_data se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meeting_notes'
    AND column_name = 'template_data'
  ) THEN
    ALTER TABLE public.meeting_notes
    ADD COLUMN template_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- Índice para filtro por categoria
CREATE INDEX IF NOT EXISTS idx_meeting_notes_category
ON public.meeting_notes(category);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_project_category
ON public.meeting_notes(project_id, category);

-- ============================================
-- 2. MIGRAÇÃO DE DADOS EXISTENTES
-- Extrair categoria do array participants
-- ============================================
UPDATE public.meeting_notes
SET category = CASE
  WHEN participants::text LIKE '%cat:meeting%' THEN 'meeting'
  WHEN participants::text LIKE '%cat:decision%' THEN 'decision'
  WHEN participants::text LIKE '%cat:idea%' THEN 'idea'
  WHEN participants::text LIKE '%cat:reminder%' THEN 'reminder'
  ELSE 'general'
END
WHERE category = 'general' OR category IS NULL;

-- ============================================
-- 3. TABELA: PROJECT_SPREADSHEETS (Planilhas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.project_spreadsheets IS 'Planilhas do projeto estilo Excel';

-- ============================================
-- 4. TABELA: SPREADSHEET_COLUMNS (Colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES public.project_spreadsheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'date', 'currency', 'percentage', 'formula')),
  width INTEGER DEFAULT 150,
  order_index INTEGER NOT NULL DEFAULT 0,
  formula TEXT,
  format JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.spreadsheet_columns IS 'Definições de colunas das planilhas';

-- ============================================
-- 5. TABELA: SPREADSHEET_ROWS (Linhas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES public.project_spreadsheets(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.spreadsheet_rows IS 'Linhas das planilhas';

-- ============================================
-- 6. TABELA: SPREADSHEET_CELLS (Células)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  row_id UUID NOT NULL REFERENCES public.spreadsheet_rows(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.spreadsheet_columns(id) ON DELETE CASCADE,
  value TEXT,
  computed_value TEXT,
  UNIQUE(row_id, column_id)
);

COMMENT ON TABLE public.spreadsheet_cells IS 'Valores das células das planilhas';

-- ============================================
-- 7. TABELA: SPREADSHEET_MERGES (Células mescladas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_merges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES public.project_spreadsheets(id) ON DELETE CASCADE,
  start_row INTEGER NOT NULL,
  start_col INTEGER NOT NULL,
  end_row INTEGER NOT NULL,
  end_col INTEGER NOT NULL
);

COMMENT ON TABLE public.spreadsheet_merges IS 'Regiões de células mescladas';

-- ============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_spreadsheets_project
ON public.project_spreadsheets(project_id);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_columns_spreadsheet
ON public.spreadsheet_columns(spreadsheet_id);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_columns_order
ON public.spreadsheet_columns(spreadsheet_id, order_index);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_rows_spreadsheet
ON public.spreadsheet_rows(spreadsheet_id);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_rows_order
ON public.spreadsheet_rows(spreadsheet_id, order_index);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_cells_row
ON public.spreadsheet_cells(row_id);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_cells_column
ON public.spreadsheet_cells(column_id);

CREATE INDEX IF NOT EXISTS idx_spreadsheet_merges_spreadsheet
ON public.spreadsheet_merges(spreadsheet_id);

-- ============================================
-- 9. TRIGGERS PARA UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_spreadsheets_updated_at ON public.project_spreadsheets;
CREATE TRIGGER update_spreadsheets_updated_at
  BEFORE UPDATE ON public.project_spreadsheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE public.project_spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_merges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. POLÍTICAS RLS: SPREADSHEETS
-- ============================================

-- Project Spreadsheets
DROP POLICY IF EXISTS "Users can view spreadsheets" ON public.project_spreadsheets;
CREATE POLICY "Users can view spreadsheets" ON public.project_spreadsheets
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own spreadsheets" ON public.project_spreadsheets;
CREATE POLICY "Users can manage own spreadsheets" ON public.project_spreadsheets
  FOR ALL USING (auth.role() = 'authenticated');

-- Spreadsheet Columns
DROP POLICY IF EXISTS "Users can view spreadsheet_columns" ON public.spreadsheet_columns;
CREATE POLICY "Users can view spreadsheet_columns" ON public.spreadsheet_columns
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage spreadsheet_columns" ON public.spreadsheet_columns;
CREATE POLICY "Users can manage spreadsheet_columns" ON public.spreadsheet_columns
  FOR ALL USING (auth.role() = 'authenticated');

-- Spreadsheet Rows
DROP POLICY IF EXISTS "Users can view spreadsheet_rows" ON public.spreadsheet_rows;
CREATE POLICY "Users can view spreadsheet_rows" ON public.spreadsheet_rows
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage spreadsheet_rows" ON public.spreadsheet_rows;
CREATE POLICY "Users can manage spreadsheet_rows" ON public.spreadsheet_rows
  FOR ALL USING (auth.role() = 'authenticated');

-- Spreadsheet Cells
DROP POLICY IF EXISTS "Users can view spreadsheet_cells" ON public.spreadsheet_cells;
CREATE POLICY "Users can view spreadsheet_cells" ON public.spreadsheet_cells
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage spreadsheet_cells" ON public.spreadsheet_cells;
CREATE POLICY "Users can manage spreadsheet_cells" ON public.spreadsheet_cells
  FOR ALL USING (auth.role() = 'authenticated');

-- Spreadsheet Merges
DROP POLICY IF EXISTS "Users can view spreadsheet_merges" ON public.spreadsheet_merges;
CREATE POLICY "Users can view spreadsheet_merges" ON public.spreadsheet_merges
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage spreadsheet_merges" ON public.spreadsheet_merges;
CREATE POLICY "Users can manage spreadsheet_merges" ON public.spreadsheet_merges
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
