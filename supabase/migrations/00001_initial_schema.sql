-- RehaGym ONE - Initial Database Schema
-- =========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- ENUM TYPES
-- =========================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'lead', 'archived');
CREATE TYPE client_segment AS ENUM ('vip', 'corporate', 'individual', 'student', 'senior', 'wheelchair', 'post_injury', 'chronic');
CREATE TYPE contact_preference AS ENUM ('email', 'sms', 'phone', 'whatsapp');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');

CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'cancelled', 'completed', 'no_show');
CREATE TYPE booking_type AS ENUM ('individual', 'group', 'course', 'medical', 'physiotherapy');

CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'online', 'credit');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled');

CREATE TYPE package_type AS ENUM ('membership', 'entries', 'time_credit', 'therapy_package', 'one_time');
CREATE TYPE package_status AS ENUM ('active', 'expired', 'depleted', 'cancelled');

CREATE TYPE medical_record_type AS ENUM ('examination', 'diagnosis', 'treatment_plan', 'progress_note', 'discharge');
CREATE TYPE service_category AS ENUM ('fitness', 'physiotherapy', 'medical', 'massage', 'group_class', 'other');

CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE campaign_channel AS ENUM ('email', 'sms', 'whatsapp');

CREATE TYPE lead_stage AS ENUM ('new', 'contacted', 'interested', 'trial', 'negotiation', 'converted', 'lost');

CREATE TYPE cost_type AS ENUM ('fixed', 'variable', 'personnel', 'marketing', 'equipment', 'rent', 'utilities', 'other');

-- =========================================
-- 1. RBAC SYSTEM (Role-Based Access Control)
-- =========================================

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- system roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'clients.read', 'medical.write_own'
  module TEXT NOT NULL,      -- e.g. 'clients', 'medical', 'finance'
  action TEXT NOT NULL,      -- e.g. 'read', 'write', 'delete', 'export'
  scope TEXT DEFAULT 'all',  -- 'own', 'department', 'all'
  display_name TEXT NOT NULL,
  description TEXT
);

-- Role-Permission junction
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =========================================
-- 2. USERS (staff/employees)
-- =========================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status user_status DEFAULT 'active',
  job_title TEXT,           -- e.g. 'Fyzioterapeut', 'Osobní trenér'
  specialization TEXT,      -- e.g. 'Sportovní rehabilitace'
  hourly_rate DECIMAL(10,2),
  color TEXT,               -- calendar color hex
  google_calendar_id TEXT,  -- for Google Calendar sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Role junction (user can have multiple roles)
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Individual permission overrides for users
CREATE TABLE user_permissions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = revoke (override role)
  PRIMARY KEY (user_id, permission_id)
);

-- =========================================
-- 3. CLIENTS
-- =========================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  personal_id TEXT,          -- rodné číslo (encrypted at app level)
  gender gender,

  -- Address
  street TEXT,
  city TEXT,
  postal_code TEXT,

  -- Preferences
  contact_preference contact_preference DEFAULT 'email',
  preferred_time TEXT,       -- e.g. 'morning', 'afternoon', 'evening'
  hobbies TEXT,
  notes TEXT,

  -- Classification
  status client_status DEFAULT 'active',
  segments client_segment[] DEFAULT '{}', -- multiple segments allowed
  source TEXT,               -- how they found us

  -- Assignments
  primary_trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  primary_physio_id UUID REFERENCES users(id) ON DELETE SET NULL,
  primary_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Health summary (quick access, detail in medical_records)
  health_restrictions TEXT,
  health_goals TEXT,

  -- GDPR
  marketing_consent BOOLEAN DEFAULT FALSE,
  marketing_consent_date TIMESTAMPTZ,
  health_data_consent BOOLEAN DEFAULT FALSE,
  health_data_consent_date TIMESTAMPTZ,
  photo_consent BOOLEAN DEFAULT FALSE,
  photo_consent_date TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_clients_name ON clients(last_name, first_name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_status ON clients(status);

-- =========================================
-- 4. SERVICES & CODEBOOKS
-- =========================================

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category service_category NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 21.00,  -- Czech VAT
  max_participants INT DEFAULT 1,        -- 1 = individual, >1 = group
  requires_equipment BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  color TEXT,                            -- calendar color
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 5. LOCATIONS & RESOURCES
-- =========================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,         -- e.g. 'Sál 1', 'Ordinace', 'Fitness zóna'
  type TEXT NOT NULL,         -- 'gym', 'office', 'treatment_room', 'pool'
  capacity INT DEFAULT 1,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 6. BOOKINGS & CALENDAR
-- =========================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL, -- trainer/physio/doctor
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Time
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Status
  status booking_status DEFAULT 'confirmed',
  type booking_type DEFAULT 'individual',

  -- Group booking support
  parent_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE, -- for group bookings
  max_participants INT DEFAULT 1,

  -- Details
  title TEXT,
  notes TEXT,
  internal_notes TEXT,        -- visible only to staff
  cancellation_reason TEXT,

  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Google Calendar sync
  google_event_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_time ON bookings(starts_at, ends_at);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Group booking participants
CREATE TABLE booking_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, client_id)
);

-- Provider availability / working hours
CREATE TABLE provider_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE
);

-- Schedule exceptions (vacations, sick days)
CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 7. PACKAGES & MEMBERSHIPS
-- =========================================

CREATE TABLE package_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type package_type NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 21.00,

  -- Limits
  total_entries INT,           -- NULL = unlimited (for memberships)
  total_minutes INT,           -- for time-based credits
  valid_days INT,              -- validity period in days

  -- Applicable services
  service_ids UUID[] DEFAULT '{}', -- which services can be used

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES package_templates(id) ON DELETE SET NULL,

  -- Current state
  status package_status DEFAULT 'active',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,

  -- Usage tracking
  entries_used INT DEFAULT 0,
  entries_total INT,
  minutes_used INT DEFAULT 0,
  minutes_total INT,

  -- Financial
  price_paid DECIMAL(10,2) NOT NULL,
  payment_id UUID,  -- link to payment

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_packages_client ON client_packages(client_id);
CREATE INDEX idx_client_packages_status ON client_packages(status);

-- =========================================
-- 8. PAYMENTS & INVOICES
-- =========================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'CZK',

  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',

  -- References
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  package_id UUID REFERENCES client_packages(id) ON DELETE SET NULL,

  -- Stripe
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,

  description TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(created_at);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  invoice_number TEXT NOT NULL UNIQUE,

  status invoice_status DEFAULT 'draft',

  subtotal DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CZK',

  issued_at DATE,
  due_at DATE,
  paid_at DATE,

  -- Company info for invoice
  client_name TEXT,
  client_address TEXT,
  client_ico TEXT,
  client_dic TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 21.00,
  total DECIMAL(10,2) NOT NULL,

  service_id UUID REFERENCES services(id) ON DELETE SET NULL,

  sort_order INT DEFAULT 0
);

-- =========================================
-- 9. COSTS & EXPENSES
-- =========================================

CREATE TABLE costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type cost_type NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CZK',

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT FALSE,
  recurring_period TEXT,      -- 'monthly', 'quarterly', 'yearly'

  provider_id UUID REFERENCES users(id) ON DELETE SET NULL, -- for personnel costs

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_costs_date ON costs(date);
CREATE INDEX idx_costs_type ON costs(type);

-- =========================================
-- 10. MEDICAL RECORDS
-- =========================================

CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL,

  type medical_record_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,      -- the actual medical note / dekurz

  -- Structured data
  diagnosis_codes TEXT[],     -- ICD-10 codes
  procedures TEXT[],

  -- Treatment plan
  treatment_plan TEXT,
  recommended_sessions INT,
  session_frequency TEXT,     -- e.g. '2x weekly'

  is_confidential BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medical_records_client ON medical_records(client_id);
CREATE INDEX idx_medical_records_provider ON medical_records(provider_id);

-- =========================================
-- 11. TRAINING RECORDS
-- =========================================

CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  goals TEXT,

  start_date DATE,
  end_date DATE,
  frequency TEXT,             -- e.g. '3x weekly'

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  duration_minutes INT,

  exercises TEXT,             -- JSON or structured text
  notes TEXT,
  performance_rating INT CHECK (performance_rating BETWEEN 1 AND 5),
  client_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 12. DOCUMENTS & ATTACHMENTS
-- =========================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Polymorphic reference
  entity_type TEXT NOT NULL,  -- 'client', 'medical_record', 'training_plan', etc.
  entity_id UUID NOT NULL,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,    -- Supabase Storage path
  file_size INT,
  mime_type TEXT,

  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);

-- =========================================
-- 13. MARKETING & CAMPAIGNS
-- =========================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  channel campaign_channel NOT NULL,
  status campaign_status DEFAULT 'draft',

  subject TEXT,               -- email subject
  content TEXT,               -- email/sms body
  template_id TEXT,           -- external template reference

  -- Targeting
  segment_filter JSONB,       -- dynamic segment criteria
  recipient_count INT DEFAULT 0,

  -- Stats
  sent_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,

  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Individual communications log
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  channel campaign_channel NOT NULL,
  direction TEXT DEFAULT 'outbound', -- 'outbound', 'inbound'

  subject TEXT,
  content TEXT,

  -- Status tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- For phone calls
  call_duration_seconds INT,
  call_notes TEXT,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communications_client ON communications(client_id);

-- =========================================
-- 14. LEADS & PIPELINE
-- =========================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contact info (before becoming a client)
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  -- Pipeline
  stage lead_stage DEFAULT 'new',
  score INT DEFAULT 0,        -- lead score
  source TEXT,                -- 'web_form', 'referral', 'ad_google', etc.

  -- Conversion
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- when converted
  converted_at TIMESTAMPTZ,

  notes TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_stage ON leads(stage);

-- =========================================
-- 15. AUDIT LOG
-- =========================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action TEXT NOT NULL,       -- 'create', 'update', 'delete', 'view', 'export'
  entity_type TEXT NOT NULL,  -- 'client', 'medical_record', etc.
  entity_id UUID,

  details JSONB,              -- what changed
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- =========================================
-- 16. SYSTEM SETTINGS
-- =========================================

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END;
$$;

-- Function to check user permission
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
  is_override BOOLEAN;
  override_granted BOOLEAN;
BEGIN
  -- Check individual overrides first
  SELECT granted INTO override_granted
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id AND p.code = p_permission_code;

  IF FOUND THEN
    RETURN override_granted;
  END IF;

  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id AND p.code = p_permission_code
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(p_user_id, 'system.super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
