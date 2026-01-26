-- ============================================
-- MIGRATION: TABELAS DE PLANILHAS (SPREADSHEETS)
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. TABELA: PROJECT_SPREADSHEETS (Planilhas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.project_spreadsheets IS 'Planilhas dos projetos';

-- ============================================
-- 2. TABELA: SPREADSHEET_COLUMNS (Colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES public.project_spreadsheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'date', 'currency', 'percentage', 'formula')),
  width INTEGER DEFAULT 150,
  order_index INTEGER NOT NULL DEFAULT 0,
  format JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.spreadsheet_columns IS 'Colunas das planilhas';

-- ============================================
-- 3. TABELA: SPREADSHEET_ROWS (Linhas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES public.project_spreadsheets(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.spreadsheet_rows IS 'Linhas das planilhas';

-- ============================================
-- 4. TABELA: SPREADSHEET_CELLS (Celulas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  row_id UUID NOT NULL REFERENCES public.spreadsheet_rows(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.spreadsheet_columns(id) ON DELETE CASCADE,
  value TEXT,
  formula TEXT,
  UNIQUE(row_id, column_id)
);

COMMENT ON TABLE public.spreadsheet_cells IS 'Valores das celulas das planilhas';

-- ============================================
-- INDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_spreadsheets_project_id ON public.project_spreadsheets(project_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_columns_spreadsheet_id ON public.spreadsheet_columns(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_rows_spreadsheet_id ON public.spreadsheet_rows(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_cells_row_id ON public.spreadsheet_cells(row_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_cells_column_id ON public.spreadsheet_cells(column_id);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_project_spreadsheets_updated_at ON public.project_spreadsheets;
CREATE TRIGGER update_project_spreadsheets_updated_at
  BEFORE UPDATE ON public.project_spreadsheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HABILITAR RLS
-- ============================================
ALTER TABLE public.project_spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_cells ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITICAS RLS: PROJECT_SPREADSHEETS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view spreadsheets" ON public.project_spreadsheets;
CREATE POLICY "Authenticated users can view spreadsheets" ON public.project_spreadsheets
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage spreadsheets" ON public.project_spreadsheets;
CREATE POLICY "Authenticated users can manage spreadsheets" ON public.project_spreadsheets
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- POLITICAS RLS: SPREADSHEET_COLUMNS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view spreadsheet_columns" ON public.spreadsheet_columns;
CREATE POLICY "Authenticated users can view spreadsheet_columns" ON public.spreadsheet_columns
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage spreadsheet_columns" ON public.spreadsheet_columns;
CREATE POLICY "Authenticated users can manage spreadsheet_columns" ON public.spreadsheet_columns
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- POLITICAS RLS: SPREADSHEET_ROWS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view spreadsheet_rows" ON public.spreadsheet_rows;
CREATE POLICY "Authenticated users can view spreadsheet_rows" ON public.spreadsheet_rows
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage spreadsheet_rows" ON public.spreadsheet_rows;
CREATE POLICY "Authenticated users can manage spreadsheet_rows" ON public.spreadsheet_rows
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- POLITICAS RLS: SPREADSHEET_CELLS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view spreadsheet_cells" ON public.spreadsheet_cells;
CREATE POLICY "Authenticated users can view spreadsheet_cells" ON public.spreadsheet_cells
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage spreadsheet_cells" ON public.spreadsheet_cells;
CREATE POLICY "Authenticated users can manage spreadsheet_cells" ON public.spreadsheet_cells
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- FIM DA MIGRATION
-- ============================================
