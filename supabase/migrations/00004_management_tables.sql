-- ============================================================
-- 00004_management_tables.sql
-- Management module tables: revenue, costs, providers, imports
-- ============================================================

-- Revenue entries (imported from SmartMedix/Excel)
CREATE TABLE revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL, -- RESPECT, BALICEK, KLUB_SKO, ZD_STD, NZD_STD, etc.
  code VARCHAR(50), -- service code like RES_IDV, FYZ005 etc.
  description TEXT,
  client_name VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  vat_rate INTEGER DEFAULT 0, -- 0, 12, 21
  net_amount DECIMAL(12,2), -- amount without VAT
  payment_method VARCHAR(10), -- H=cash, K=card, B=transfer
  document_type VARCHAR(10), -- D, F, O
  document_number VARCHAR(50),
  department VARCHAR(50), -- GYM, REHA, Re.Life, PRODUKTY, Vouchery
  source_system VARCHAR(50) DEFAULT 'smartmedix',
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost entries (imported from Karát/Excel)
CREATE TABLE cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  accounting_period VARCHAR(10), -- 2025/09
  category VARCHAR(50) NOT NULL, -- FIXNÍ, MATERIÁL, SLUŽBY, MAJETEK, MARKETING, ODPISY, GYM, REHA, Re.Life
  account_code VARCHAR(20), -- 501/102, 518/400, 521/100 etc.
  description TEXT,
  note TEXT,
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL, -- obrat
  department VARCHAR(50), -- REHAGYM, FITNESS, MANAGEMENT, ORDINACE, RECEPCE
  source_system VARCHAR(50) DEFAULT 'karat',
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import batches (tracking imports)
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'revenue' or 'costs'
  source_system VARCHAR(50),
  file_name VARCHAR(255),
  row_count INTEGER DEFAULT 0,
  period_from DATE,
  period_to DATE,
  imported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for import_batch_id after import_batches is created
ALTER TABLE revenue_entries
  ADD CONSTRAINT fk_revenue_import_batch
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);

ALTER TABLE cost_entries
  ADD CONSTRAINT fk_cost_import_batch
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);

-- Provider rates (hourly rates for trainers/therapists)
CREATE TABLE provider_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  rate_type VARCHAR(20) NOT NULL, -- 'hourly', 'session', 'monthly_fixed'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CZK',
  valid_from DATE NOT NULL,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider monthly stats (editable monthly data for trainers)
CREATE TABLE provider_monthly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month DATE NOT NULL, -- first day of month
  available_hours DECIMAL(6,1) DEFAULT 0, -- capacity
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

-- Fixed monthly costs (recurring costs that can be edited per month)
CREATE TABLE fixed_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- rent, energy, salaries, software, insurance, other
  default_amount DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────

CREATE INDEX idx_revenue_entries_date ON revenue_entries(date);
CREATE INDEX idx_revenue_entries_category ON revenue_entries(category);
CREATE INDEX idx_revenue_entries_department ON revenue_entries(department);
CREATE INDEX idx_revenue_entries_import_batch ON revenue_entries(import_batch_id);

CREATE INDEX idx_cost_entries_date ON cost_entries(date);
CREATE INDEX idx_cost_entries_category ON cost_entries(category);
CREATE INDEX idx_cost_entries_department ON cost_entries(department);
CREATE INDEX idx_cost_entries_import_batch ON cost_entries(import_batch_id);

CREATE INDEX idx_provider_rates_user ON provider_rates(user_id);
CREATE INDEX idx_provider_monthly_stats_month ON provider_monthly_stats(month);
CREATE INDEX idx_provider_monthly_stats_user ON provider_monthly_stats(user_id);

-- ── RLS Policies ───────────────────────────────────────────────

ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_monthly_costs ENABLE ROW LEVEL SECURITY;

-- Revenue entries: management can read, write
CREATE POLICY "management_read_revenue" ON revenue_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code IN ('management.revenue', 'reports.financial')
    )
  );

CREATE POLICY "management_write_revenue" ON revenue_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'management.revenue'
    )
  );

-- Cost entries: management can read, write
CREATE POLICY "management_read_costs" ON cost_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code IN ('management.costs', 'reports.financial')
    )
  );

CREATE POLICY "management_write_costs" ON cost_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'management.costs'
    )
  );

-- Import batches: management can manage
CREATE POLICY "management_import_batches" ON import_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code IN ('management.revenue', 'management.costs')
    )
  );

-- Provider rates: management can manage
CREATE POLICY "management_provider_rates" ON provider_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'management.providers'
    )
  );

-- Provider monthly stats: management can manage
CREATE POLICY "management_provider_stats" ON provider_monthly_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'management.providers'
    )
  );

-- Fixed monthly costs: management can manage
CREATE POLICY "management_fixed_costs" ON fixed_monthly_costs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'management.costs'
    )
  );

-- ── Seed management permissions ────────────────────────────────

INSERT INTO permissions (code, module, description) VALUES
  ('management.dashboard', 'management', 'Přístup k executive dashboardu'),
  ('management.revenue', 'management', 'Správa tržeb a importů'),
  ('management.costs', 'management', 'Správa nákladů a importů'),
  ('management.providers', 'management', 'Správa trenérů a vytížení')
ON CONFLICT (code) DO NOTHING;

-- Grant management permissions to management role and super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super_admin', 'management')
  AND p.code IN ('management.dashboard', 'management.revenue', 'management.costs', 'management.providers')
ON CONFLICT DO NOTHING;

-- ── Trigger for updated_at on provider_monthly_stats ──────────

CREATE OR REPLACE FUNCTION update_provider_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_provider_stats_updated_at
  BEFORE UPDATE ON provider_monthly_stats
  FOR EACH ROW EXECUTE FUNCTION update_provider_stats_updated_at();
