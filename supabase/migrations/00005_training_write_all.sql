-- ============================================================
-- 00005_training_write_all.sql
--
-- Forward migration to bring existing databases in line with
-- the corrected training authorization model.
--
-- 1. Adds the new training.write_all permission row.
-- 2. Assigns it to super_admin (always) and doctor (per seed design).
-- 3. Replaces the old training_plans / training_sessions write policies
--    that incorrectly granted writes via training.read_all,
--    with policies that require write permissions.
--
-- Idempotent: safe to re-run. Brings an existing database to the same
-- effective state as a clean install of 00002 + 00003.
-- ============================================================

-- ── 1. Permission row ──────────────────────────────────────────

INSERT INTO permissions (code, module, action, scope, display_name, description) VALUES
  ('training.write_all', 'training', 'write', 'all', 'Spravovat všechny tréninky', 'Tvorba a editace plánů pro všechny klienty')
ON CONFLICT (code) DO NOTHING;

-- ── 2. Role assignments ───────────────────────────────────────

-- super_admin already holds every permission via the seed's catch-all assignment,
-- but re-assert here for clean installs and any environment where seed was partial.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.code = 'training.write_all'
ON CONFLICT DO NOTHING;

-- Doctor: manages cross-user training (matches existing medical.write_all grant).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'doctor'
  AND p.code = 'training.write_all'
ON CONFLICT DO NOTHING;

-- ── 3. RLS policy replacement ─────────────────────────────────
-- The old write policies (created by 00002) granted writes if the user
-- merely had training.read_all — a privilege escalation. Replace them
-- with policies that require an actual write permission.
--
-- DROP POLICY IF EXISTS is idempotent and safe whether or not the old
-- policy still exists.

DROP POLICY IF EXISTS "Training plans - write" ON training_plans;
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

DROP POLICY IF EXISTS "Training sessions - write" ON training_sessions;
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
