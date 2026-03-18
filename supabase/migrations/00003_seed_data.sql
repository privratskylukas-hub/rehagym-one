-- RehaGym ONE - Seed Data
-- ========================

-- ========================
-- PERMISSIONS
-- ========================

INSERT INTO permissions (code, module, action, scope, display_name, description) VALUES
-- Clients
('clients.read', 'clients', 'read', 'all', 'Zobrazit klienty', 'Přístup k databázi klientů'),
('clients.write', 'clients', 'write', 'all', 'Upravovat klienty', 'Vytváření a editace klientů'),
('clients.delete', 'clients', 'delete', 'all', 'Mazat klienty', 'Smazání klientských záznamů'),
('clients.health.read', 'clients', 'read', 'all', 'Zobrazit zdravotní omezení', 'Základní zdravotní info na kartě klienta'),
('clients.finance.read', 'clients', 'read', 'all', 'Zobrazit finance klienta', 'Finanční údaje na kartě klienta'),

-- Bookings
('bookings.read', 'bookings', 'read', 'all', 'Zobrazit rezervace', 'Přístup ke kalendáři rezervací'),
('bookings.write', 'bookings', 'write', 'all', 'Spravovat rezervace', 'Vytváření a editace rezervací'),
('bookings.manage_all', 'bookings', 'manage', 'all', 'Spravovat všechny rezervace', 'Správa rezervací všech poskytovatelů'),

-- Medical
('medical.read_own', 'medical', 'read', 'own', 'Zobrazit vlastní zdravotní záznamy', 'Zdravotní záznamy vlastních klientů'),
('medical.write_own', 'medical', 'write', 'own', 'Psát vlastní zdravotní záznamy', 'Zápis dekurzů pro vlastní klienty'),
('medical.read_all', 'medical', 'read', 'all', 'Zobrazit všechny zdravotní záznamy', 'Přístup ke všem zdravotním záznamům'),
('medical.write_all', 'medical', 'write', 'all', 'Psát všechny zdravotní záznamy', 'Zápis do zdravotních záznamů všech klientů'),

-- Training
('training.read_own', 'training', 'read', 'own', 'Zobrazit vlastní tréninky', 'Tréninkové plány vlastních klientů'),
('training.write_own', 'training', 'write', 'own', 'Spravovat vlastní tréninky', 'Tvorba plánů pro vlastní klienty'),
('training.read_all', 'training', 'read', 'all', 'Zobrazit všechny tréninky', 'Přístup ke všem tréninkovým plánům'),

-- Payments
('payments.read', 'payments', 'read', 'all', 'Zobrazit platby', 'Přehled plateb a balíčků'),
('payments.write', 'payments', 'write', 'all', 'Spravovat platby', 'Příjem plateb, vystavování dokladů'),
('payments.export', 'payments', 'export', 'all', 'Exportovat platby', 'Export finančních dat'),
('invoices.create', 'invoices', 'write', 'all', 'Vystavovat faktury', 'Tvorba a správa faktur'),
('invoices.export_karat', 'invoices', 'export', 'all', 'Export do Karátu', 'Export dat pro účetní systém'),

-- Marketing
('marketing.campaigns', 'marketing', 'manage', 'all', 'Spravovat kampaně', 'Tvorba a odesílání kampaní'),
('marketing.segments', 'marketing', 'manage', 'all', 'Segmentace klientů', 'Správa segmentů a cílení'),

-- Reports
('reports.operational', 'reports', 'read', 'all', 'Provozní reporty', 'Vytížení prostor, služby'),
('reports.financial', 'reports', 'read', 'all', 'Finanční reporty', 'Tržby, náklady, ziskovost'),
('reports.personnel', 'reports', 'read', 'all', 'Personální reporty', 'Vytížení a výkon zaměstnanců'),

-- Admin
('admin.users', 'admin', 'manage', 'all', 'Správa uživatelů', 'Zakládání a editace uživatelských účtů'),
('admin.roles', 'admin', 'manage', 'all', 'Správa rolí', 'Definice rolí a oprávnění'),
('admin.settings', 'admin', 'manage', 'all', 'Systémové nastavení', 'Číselníky, služby, lokace'),
('admin.audit_log', 'admin', 'read', 'all', 'Audit log', 'Přístup k záznamu aktivit'),
('system.super_admin', 'system', 'all', 'all', 'Super administrátor', 'Neomezený přístup ke všemu');

-- ========================
-- DEFAULT ROLES
-- ========================

INSERT INTO roles (name, display_name, description, is_system) VALUES
('super_admin', 'Super Administrátor', 'Plný přístup ke všemu', TRUE),
('reception', 'Recepce', 'Správa klientů, rezervací a plateb', TRUE),
('doctor', 'Lékař', 'Přístup ke zdravotním záznamům a kalendáři', TRUE),
('physiotherapist', 'Fyzioterapeut / Masér', 'Terapeutické záznamy vlastních klientů', TRUE),
('trainer', 'Trenér', 'Tréninkové plány a záznamy vlastních klientů', TRUE),
('marketing', 'Marketing', 'Kampaně, segmentace, CRM pipeline', TRUE),
('management', 'Vedení', 'Dashboardy, reporty, analýzy', TRUE),
('accountant', 'Účtárna', 'Finance, fakturace, export', TRUE);

-- ========================
-- ROLE-PERMISSION ASSIGNMENTS
-- ========================

-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- Reception
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'reception'
AND p.code IN (
  'clients.read', 'clients.write', 'clients.health.read',
  'bookings.read', 'bookings.write', 'bookings.manage_all',
  'payments.read', 'payments.write',
  'training.read_all'
);

-- Doctor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'doctor'
AND p.code IN (
  'clients.read', 'clients.health.read',
  'bookings.read', 'bookings.write',
  'medical.read_all', 'medical.write_all',
  'training.read_all'
);

-- Physiotherapist
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'physiotherapist'
AND p.code IN (
  'clients.read', 'clients.health.read',
  'bookings.read', 'bookings.write',
  'medical.read_own', 'medical.write_own',
  'training.read_own'
);

-- Trainer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer'
AND p.code IN (
  'clients.read', 'clients.health.read',
  'bookings.read', 'bookings.write',
  'training.read_own', 'training.write_own'
);

-- Marketing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'marketing'
AND p.code IN (
  'clients.read',
  'marketing.campaigns', 'marketing.segments',
  'reports.operational'
);

-- Management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'management'
AND p.code IN (
  'clients.read', 'clients.finance.read',
  'bookings.read', 'bookings.manage_all',
  'payments.read', 'payments.export',
  'reports.operational', 'reports.financial', 'reports.personnel',
  'marketing.segments',
  'admin.users', 'admin.settings', 'admin.audit_log'
);

-- Accountant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accountant'
AND p.code IN (
  'clients.read', 'clients.finance.read',
  'payments.read', 'payments.write', 'payments.export',
  'invoices.create', 'invoices.export_karat',
  'reports.financial'
);

-- ========================
-- DEFAULT SERVICE CATEGORIES
-- ========================

INSERT INTO service_categories (name, category, sort_order) VALUES
('Osobní trénink', 'fitness', 1),
('Skupinové lekce', 'group_class', 2),
('Fyzioterapie', 'physiotherapy', 3),
('Lékařská péče', 'medical', 4),
('Masáže', 'massage', 5),
('Ostatní', 'other', 6);

-- ========================
-- DEFAULT SERVICES
-- ========================

INSERT INTO services (category_id, name, duration_minutes, price, max_participants) VALUES
((SELECT id FROM service_categories WHERE name = 'Osobní trénink'), 'Osobní trénink 60 min', 60, 800, 1),
((SELECT id FROM service_categories WHERE name = 'Osobní trénink'), 'Osobní trénink 90 min', 90, 1100, 1),
((SELECT id FROM service_categories WHERE name = 'Skupinové lekce'), 'Skupinový trénink', 60, 300, 8),
((SELECT id FROM service_categories WHERE name = 'Skupinové lekce'), 'Yoga', 75, 350, 12),
((SELECT id FROM service_categories WHERE name = 'Fyzioterapie'), 'Fyzioterapie - vstupní vyšetření', 60, 1200, 1),
((SELECT id FROM service_categories WHERE name = 'Fyzioterapie'), 'Fyzioterapie - terapie', 45, 900, 1),
((SELECT id FROM service_categories WHERE name = 'Lékařská péče'), 'Vstupní lékařská prohlídka', 45, 1500, 1),
((SELECT id FROM service_categories WHERE name = 'Lékařská péče'), 'Kontrolní prohlídka', 30, 800, 1),
((SELECT id FROM service_categories WHERE name = 'Masáže'), 'Sportovní masáž 60 min', 60, 700, 1),
((SELECT id FROM service_categories WHERE name = 'Masáže'), 'Relaxační masáž 90 min', 90, 1000, 1);

-- ========================
-- DEFAULT LOCATIONS
-- ========================

INSERT INTO locations (name, type, capacity) VALUES
('Fitness sál', 'gym', 15),
('Malý sál', 'gym', 6),
('Ordinace 1', 'treatment_room', 1),
('Ordinace 2', 'treatment_room', 1),
('Fyzioterapie', 'treatment_room', 2),
('Masáže', 'treatment_room', 1);

-- ========================
-- DEFAULT SETTINGS
-- ========================

INSERT INTO settings (key, value, description) VALUES
('company', '{"name": "RehaGym s.r.o.", "ico": "", "dic": "", "address": "", "phone": "", "email": "info@rehagym.cz", "web": "https://rehagym.cz"}', 'Firemní údaje'),
('working_hours', '{"monday": {"open": "07:00", "close": "21:00"}, "tuesday": {"open": "07:00", "close": "21:00"}, "wednesday": {"open": "07:00", "close": "21:00"}, "thursday": {"open": "07:00", "close": "21:00"}, "friday": {"open": "07:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "14:00"}, "sunday": null}', 'Otevírací doba'),
('booking', '{"min_advance_hours": 2, "max_advance_days": 30, "cancellation_hours": 24, "reminder_hours_before": 24, "allow_online_booking": true}', 'Nastavení rezervací'),
('invoice', '{"prefix": "FV", "next_number": 1, "due_days": 14, "vat_rate": 21}', 'Nastavení fakturace');
