-- RehaGym ONE - Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Get current user's auth ID
-- ============================================

-- All authenticated users can read roles/permissions (needed for UI)
CREATE POLICY "Authenticated users can read roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify roles
CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'admin.roles'))
  WITH CHECK (has_permission(auth.uid(), 'admin.roles'));

CREATE POLICY "Admins can manage role_permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'admin.roles'))
  WITH CHECK (has_permission(auth.uid(), 'admin.roles'));

-- ============================================
-- USERS
-- ============================================

CREATE POLICY "Users can read all users (staff directory)"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'admin.users'))
  WITH CHECK (has_permission(auth.uid(), 'admin.users'));

CREATE POLICY "Read own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.users'));

CREATE POLICY "Admins can manage user_roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'admin.users'))
  WITH CHECK (has_permission(auth.uid(), 'admin.users'));

CREATE POLICY "Read own permission overrides"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.users'));

CREATE POLICY "Admins can manage user_permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'admin.users'))
  WITH CHECK (has_permission(auth.uid(), 'admin.users'));

-- ============================================
-- CLIENTS
-- ============================================

CREATE POLICY "Staff with clients.read can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'clients.read'));

CREATE POLICY "Staff with clients.write can create/update clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'clients.write'));

CREATE POLICY "Staff with clients.write can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), 'clients.write'))
  WITH CHECK (has_permission(auth.uid(), 'clients.write'));

CREATE POLICY "Staff with clients.delete can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (has_permission(auth.uid(), 'clients.delete'));

-- ============================================
-- SERVICES & LOCATIONS (readable by all staff)
-- ============================================

CREATE POLICY "All staff can read services"
  ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "All staff can read service_categories"
  ON service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "All staff can read locations"
  ON locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage services"
  ON services FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (has_permission(auth.uid(), 'admin.settings'));
CREATE POLICY "Admins can manage service_categories"
  ON service_categories FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (has_permission(auth.uid(), 'admin.settings'));
CREATE POLICY "Admins can manage locations"
  ON locations FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (has_permission(auth.uid(), 'admin.settings'));

-- ============================================
-- BOOKINGS
-- ============================================

CREATE POLICY "Staff with bookings.read can view bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'bookings.manage_all')
    OR provider_id = auth.uid()
    OR has_permission(auth.uid(), 'bookings.read')
  );

CREATE POLICY "Staff with bookings.write can create bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'bookings.write'));

CREATE POLICY "Staff with bookings.write can update bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'bookings.manage_all')
    OR provider_id = auth.uid()
    OR has_permission(auth.uid(), 'bookings.write')
  )
  WITH CHECK (has_permission(auth.uid(), 'bookings.write'));

CREATE POLICY "All staff can read booking participants"
  ON booking_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff with bookings.write can manage participants"
  ON booking_participants FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'bookings.write'))
  WITH CHECK (has_permission(auth.uid(), 'bookings.write'));

-- Schedules
CREATE POLICY "All staff can read schedules"
  ON provider_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage own schedule or admin"
  ON provider_schedules FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.settings'));

CREATE POLICY "All staff can read schedule exceptions"
  ON schedule_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage own exceptions or admin"
  ON schedule_exceptions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (user_id = auth.uid() OR has_permission(auth.uid(), 'admin.settings'));

-- ============================================
-- PACKAGES
-- ============================================

CREATE POLICY "All staff can read package templates"
  ON package_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage package templates"
  ON package_templates FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (has_permission(auth.uid(), 'admin.settings'));

CREATE POLICY "Staff with payments.read can view client packages"
  ON client_packages FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'payments.read'));
CREATE POLICY "Staff with payments.write can manage client packages"
  ON client_packages FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'payments.write'))
  WITH CHECK (has_permission(auth.uid(), 'payments.write'));

-- ============================================
-- PAYMENTS & INVOICES
-- ============================================

CREATE POLICY "Staff with payments.read can view payments"
  ON payments FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'payments.read'));
CREATE POLICY "Staff with payments.write can manage payments"
  ON payments FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'payments.write'))
  WITH CHECK (has_permission(auth.uid(), 'payments.write'));

CREATE POLICY "Staff with payments.read can view invoices"
  ON invoices FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'payments.read'));
CREATE POLICY "Staff with invoices.create can manage invoices"
  ON invoices FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'invoices.create'))
  WITH CHECK (has_permission(auth.uid(), 'invoices.create'));

CREATE POLICY "Staff with payments.read can view invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'payments.read'));
CREATE POLICY "Staff with invoices.create can manage invoice items"
  ON invoice_items FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'invoices.create'))
  WITH CHECK (has_permission(auth.uid(), 'invoices.create'));

-- ============================================
-- COSTS
-- ============================================

CREATE POLICY "Staff with reports.financial can view costs"
  ON costs FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'reports.financial'));
CREATE POLICY "Staff with reports.financial can manage costs"
  ON costs FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'reports.financial'))
  WITH CHECK (has_permission(auth.uid(), 'reports.financial'));

-- ============================================
-- MEDICAL RECORDS (strictest access)
-- ============================================

CREATE POLICY "Medical staff can read own client records"
  ON medical_records FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'medical.read_all')
    OR (has_permission(auth.uid(), 'medical.read_own') AND provider_id = auth.uid())
  );

CREATE POLICY "Medical staff can write own records"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'medical.write_all')
    OR (has_permission(auth.uid(), 'medical.write_own') AND provider_id = auth.uid())
  );

CREATE POLICY "Medical staff can update own records"
  ON medical_records FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'medical.write_all')
    OR (has_permission(auth.uid(), 'medical.write_own') AND provider_id = auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'medical.write_all')
    OR (has_permission(auth.uid(), 'medical.write_own') AND provider_id = auth.uid())
  );

-- ============================================
-- TRAINING
-- ============================================

CREATE POLICY "Training plans - read"
  ON training_plans FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'training.read_all')
    OR (has_permission(auth.uid(), 'training.read_own') AND trainer_id = auth.uid())
  );

CREATE POLICY "Training plans - write"
  ON training_plans FOR ALL TO authenticated
  USING (
    has_permission(auth.uid(), 'training.write_all')
    OR (has_permission(auth.uid(), 'training.write_own') AND trainer_id = auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'training.write_all')
    OR (has_permission(auth.uid(), 'training.write_own') AND trainer_id = auth.uid())
  );

CREATE POLICY "Training sessions - read"
  ON training_sessions FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'training.read_all')
    OR (has_permission(auth.uid(), 'training.read_own') AND trainer_id = auth.uid())
  );

CREATE POLICY "Training sessions - write"
  ON training_sessions FOR ALL TO authenticated
  USING (
    has_permission(auth.uid(), 'training.write_all')
    OR (has_permission(auth.uid(), 'training.write_own') AND trainer_id = auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'training.write_all')
    OR (has_permission(auth.uid(), 'training.write_own') AND trainer_id = auth.uid())
  );

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can upload documents"
  ON documents FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- MARKETING
-- ============================================

CREATE POLICY "Marketing staff can view campaigns"
  ON campaigns FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'marketing.campaigns'));
CREATE POLICY "Marketing staff can manage campaigns"
  ON campaigns FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'marketing.campaigns'))
  WITH CHECK (has_permission(auth.uid(), 'marketing.campaigns'));

CREATE POLICY "Staff can view communications"
  ON communications FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'clients.read'));
CREATE POLICY "Staff can create communications"
  ON communications FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'clients.write'));

-- ============================================
-- LEADS
-- ============================================

CREATE POLICY "Marketing/sales can view leads"
  ON leads FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'marketing.segments') OR has_permission(auth.uid(), 'clients.read'));
CREATE POLICY "Marketing/sales can manage leads"
  ON leads FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'marketing.segments'))
  WITH CHECK (has_permission(auth.uid(), 'marketing.segments'));

-- ============================================
-- AUDIT LOGS (read only, append only)
-- ============================================

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'admin.audit_log'));

-- Allow inserting audit logs from any authenticated user (via functions)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- SETTINGS
-- ============================================

CREATE POLICY "All staff can read settings"
  ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'admin.settings'))
  WITH CHECK (has_permission(auth.uid(), 'admin.settings'));
