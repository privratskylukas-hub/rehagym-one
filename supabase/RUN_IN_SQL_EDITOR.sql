-- ============================================================
-- PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR AND RUN
-- Creates management module tables + permissions + role grants
-- ============================================================

-- 1. Revenue entries (imported from SmartMedix/Excel)
CREATE TABLE IF NOT EXISTS revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  client_name VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  vat_rate INTEGER DEFAULT 0,
  net_amount DECIMAL(12,2),
  payment_method VARCHAR(10),
  document_type VARCHAR(10),
  document_number VARCHAR(50),
  department VARCHAR(50),
  source_system VARCHAR(50) DEFAULT 'smartmedix',
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cost entries (imported from Karát/Excel)
CREATE TABLE IF NOT EXISTS cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  accounting_period VARCHAR(10),
  category VARCHAR(50) NOT NULL,
  account_code VARCHAR(20),
  description TEXT,
  note TEXT,
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL,
  department VARCHAR(50),
  source_system VARCHAR(50) DEFAULT 'karat',
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Import batches
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  source_system VARCHAR(50),
  file_name VARCHAR(255),
  row_count INTEGER DEFAULT 0,
  period_from DATE,
  period_to DATE,
  imported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_revenue_import_batch') THEN
    ALTER TABLE revenue_entries ADD CONSTRAINT fk_revenue_import_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cost_import_batch') THEN
    ALTER TABLE cost_entries ADD CONSTRAINT fk_cost_import_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);
  END IF;
END $$;

-- 4. Provider rates
CREATE TABLE IF NOT EXISTS provider_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  rate_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CZK',
  valid_from DATE NOT NULL,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Provider monthly stats
CREATE TABLE IF NOT EXISTS provider_monthly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month DATE NOT NULL,
  available_hours DECIMAL(6,1) DEFAULT 0,
  worked_hours DECIMAL(6,1) DEFAULT 0,
  client_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- 6. Fixed monthly costs
CREATE TABLE IF NOT EXISTS fixed_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  default_amount DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_revenue_entries_date ON revenue_entries(date);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_category ON revenue_entries(category);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_department ON revenue_entries(department);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_import_batch ON revenue_entries(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_date ON cost_entries(date);
CREATE INDEX IF NOT EXISTS idx_cost_entries_category ON cost_entries(category);
CREATE INDEX IF NOT EXISTS idx_cost_entries_department ON cost_entries(department);
CREATE INDEX IF NOT EXISTS idx_cost_entries_import_batch ON cost_entries(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_provider_rates_user ON provider_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_monthly_stats_month ON provider_monthly_stats(month);
CREATE INDEX IF NOT EXISTS idx_provider_monthly_stats_user ON provider_monthly_stats(user_id);

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_monthly_costs ENABLE ROW LEVEL SECURITY;

-- Revenue entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_read_revenue') THEN
    CREATE POLICY "management_read_revenue" ON revenue_entries FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code IN ('management.revenue', 'reports.financial'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_write_revenue') THEN
    CREATE POLICY "management_write_revenue" ON revenue_entries FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'management.revenue')
    );
  END IF;
END $$;

-- Cost entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_read_costs') THEN
    CREATE POLICY "management_read_costs" ON cost_entries FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code IN ('management.costs', 'reports.financial'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_write_costs') THEN
    CREATE POLICY "management_write_costs" ON cost_entries FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'management.costs')
    );
  END IF;
END $$;

-- Import batches
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_import_batches') THEN
    CREATE POLICY "management_import_batches" ON import_batches FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code IN ('management.revenue', 'management.costs'))
    );
  END IF;
END $$;

-- Provider rates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_provider_rates') THEN
    CREATE POLICY "management_provider_rates" ON provider_rates FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'management.providers')
    );
  END IF;
END $$;

-- Provider monthly stats
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_provider_stats') THEN
    CREATE POLICY "management_provider_stats" ON provider_monthly_stats FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'management.providers')
    );
  END IF;
END $$;

-- Fixed monthly costs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'management_fixed_costs') THEN
    CREATE POLICY "management_fixed_costs" ON fixed_monthly_costs FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'management.costs')
    );
  END IF;
END $$;

-- ── Management permissions ───────────────────────────────────
INSERT INTO permissions (code, module, description) VALUES
  ('management.dashboard', 'management', 'Přístup k executive dashboardu'),
  ('management.revenue', 'management', 'Správa tržeb a importů'),
  ('management.costs', 'management', 'Správa nákladů a importů'),
  ('management.providers', 'management', 'Správa trenérů a vytížení')
ON CONFLICT (code) DO NOTHING;

-- Grant management permissions to management + super_admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super_admin', 'management')
  AND p.code IN ('management.dashboard', 'management.revenue', 'management.costs', 'management.providers')
ON CONFLICT DO NOTHING;

-- ── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_provider_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provider_stats_updated_at ON provider_monthly_stats;
CREATE TRIGGER trg_provider_stats_updated_at
  BEFORE UPDATE ON provider_monthly_stats
  FOR EACH ROW EXECUTE FUNCTION update_provider_stats_updated_at();

-- ═══ DONE ═══
-- Verify: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%entries%' OR table_name LIKE '%provider_%' OR table_name LIKE '%import_%' OR table_name LIKE '%fixed_%';
