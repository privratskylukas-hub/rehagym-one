// Database types for Supabase
// NOTE: Replace with `supabase gen types typescript` once connected

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: { id: string; name: string; display_name: string; description: string | null; is_system: boolean; created_at: string; updated_at: string };
        Insert: { name: string; display_name: string; description?: string | null; is_system?: boolean };
        Update: { name?: string; display_name?: string; description?: string | null; is_system?: boolean };
      };
      permissions: {
        Row: { id: string; code: string; module: string; action: string; scope: string; display_name: string; description: string | null };
        Insert: { code: string; module: string; action: string; scope?: string; display_name: string; description?: string | null };
        Update: { code?: string; module?: string; action?: string; scope?: string; display_name?: string; description?: string | null };
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: { role_id?: string; permission_id?: string };
      };
      users: {
        Row: { id: string; email: string; full_name: string; phone: string | null; avatar_url: string | null; status: string; job_title: string | null; specialization: string | null; hourly_rate: number | null; color: string | null; google_calendar_id: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email: string; full_name: string; phone?: string | null; avatar_url?: string | null; status?: string; job_title?: string | null; specialization?: string | null; hourly_rate?: number | null; color?: string | null; google_calendar_id?: string | null };
        Update: { email?: string; full_name?: string; phone?: string | null; avatar_url?: string | null; status?: string; job_title?: string | null; specialization?: string | null; hourly_rate?: number | null; color?: string | null; google_calendar_id?: string | null };
      };
      user_roles: {
        Row: { user_id: string; role_id: string };
        Insert: { user_id: string; role_id: string };
        Update: { user_id?: string; role_id?: string };
      };
      user_permissions: {
        Row: { user_id: string; permission_id: string; granted: boolean };
        Insert: { user_id: string; permission_id: string; granted?: boolean };
        Update: { user_id?: string; permission_id?: string; granted?: boolean };
      };
      clients: {
        Row: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; date_of_birth: string | null; personal_id: string | null; gender: string | null; street: string | null; city: string | null; postal_code: string | null; contact_preference: string; preferred_time: string | null; hobbies: string | null; notes: string | null; status: string; segments: string[]; source: string | null; primary_trainer_id: string | null; primary_physio_id: string | null; primary_doctor_id: string | null; health_restrictions: string | null; health_goals: string | null; marketing_consent: boolean; marketing_consent_date: string | null; health_data_consent: boolean; health_data_consent_date: string | null; photo_consent: boolean; photo_consent_date: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { first_name: string; last_name: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; personal_id?: string | null; gender?: string | null; street?: string | null; city?: string | null; postal_code?: string | null; contact_preference?: string; preferred_time?: string | null; hobbies?: string | null; notes?: string | null; status?: string; segments?: string[]; source?: string | null; primary_trainer_id?: string | null; primary_physio_id?: string | null; primary_doctor_id?: string | null; health_restrictions?: string | null; health_goals?: string | null; marketing_consent?: boolean; health_data_consent?: boolean; photo_consent?: boolean; created_by?: string | null };
        Update: { first_name?: string; last_name?: string; email?: string | null; phone?: string | null; date_of_birth?: string | null; status?: string; segments?: string[]; notes?: string | null; [key: string]: unknown };
      };
      service_categories: {
        Row: { id: string; name: string; category: string; description: string | null; sort_order: number; is_active: boolean; created_at: string };
        Insert: { name: string; category: string; description?: string | null; sort_order?: number; is_active?: boolean };
        Update: { name?: string; category?: string; description?: string | null; sort_order?: number; is_active?: boolean };
      };
      services: {
        Row: { id: string; category_id: string | null; name: string; description: string | null; duration_minutes: number; price: number; vat_rate: number; max_participants: number; requires_equipment: boolean; is_active: boolean; color: string | null; sort_order: number; created_at: string; updated_at: string };
        Insert: { category_id?: string | null; name: string; description?: string | null; duration_minutes?: number; price?: number; vat_rate?: number; max_participants?: number; requires_equipment?: boolean; is_active?: boolean; color?: string | null; sort_order?: number };
        Update: { category_id?: string | null; name?: string; description?: string | null; duration_minutes?: number; price?: number; vat_rate?: number; max_participants?: number; requires_equipment?: boolean; is_active?: boolean; color?: string | null; sort_order?: number };
      };
      locations: {
        Row: { id: string; name: string; type: string; capacity: number; description: string | null; is_active: boolean; created_at: string };
        Insert: { name: string; type: string; capacity?: number; description?: string | null; is_active?: boolean };
        Update: { name?: string; type?: string; capacity?: number; description?: string | null; is_active?: boolean };
      };
      bookings: {
        Row: { id: string; client_id: string | null; provider_id: string | null; service_id: string | null; location_id: string | null; starts_at: string; ends_at: string; status: string; type: string; parent_booking_id: string | null; max_participants: number; title: string | null; notes: string | null; internal_notes: string | null; cancellation_reason: string | null; reminder_sent: boolean; reminder_sent_at: string | null; google_event_id: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { client_id?: string | null; provider_id?: string | null; service_id?: string | null; location_id?: string | null; starts_at: string; ends_at: string; status?: string; type?: string; title?: string | null; notes?: string | null; internal_notes?: string | null; created_by?: string | null };
        Update: { client_id?: string | null; provider_id?: string | null; service_id?: string | null; location_id?: string | null; starts_at?: string; ends_at?: string; status?: string; title?: string | null; notes?: string | null; [key: string]: unknown };
      };
      booking_participants: {
        Row: { id: string; booking_id: string; client_id: string; status: string; created_at: string };
        Insert: { booking_id: string; client_id: string; status?: string };
        Update: { status?: string };
      };
      provider_schedules: {
        Row: { id: string; user_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean; valid_from: string | null; valid_until: string | null };
        Insert: { user_id: string; day_of_week: number; start_time: string; end_time: string; is_active?: boolean; valid_from?: string | null; valid_until?: string | null };
        Update: { day_of_week?: number; start_time?: string; end_time?: string; is_active?: boolean };
      };
      schedule_exceptions: {
        Row: { id: string; user_id: string; date: string; is_available: boolean; start_time: string | null; end_time: string | null; reason: string | null; created_at: string };
        Insert: { user_id: string; date: string; is_available?: boolean; start_time?: string | null; end_time?: string | null; reason?: string | null };
        Update: { is_available?: boolean; start_time?: string | null; end_time?: string | null; reason?: string | null };
      };
      package_templates: {
        Row: { id: string; name: string; description: string | null; type: string; price: number; vat_rate: number; total_entries: number | null; total_minutes: number | null; valid_days: number | null; service_ids: string[]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { name: string; type: string; price: number; description?: string | null; vat_rate?: number; total_entries?: number | null; total_minutes?: number | null; valid_days?: number | null; service_ids?: string[]; is_active?: boolean };
        Update: { name?: string; type?: string; price?: number; description?: string | null; is_active?: boolean; [key: string]: unknown };
      };
      client_packages: {
        Row: { id: string; client_id: string; template_id: string | null; status: string; purchased_at: string; valid_from: string; valid_until: string | null; entries_used: number; entries_total: number | null; minutes_used: number; minutes_total: number | null; price_paid: number; payment_id: string | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { client_id: string; template_id?: string | null; status?: string; valid_from?: string; valid_until?: string | null; entries_total?: number | null; minutes_total?: number | null; price_paid: number; payment_id?: string | null; notes?: string | null };
        Update: { status?: string; entries_used?: number; minutes_used?: number; valid_until?: string | null; notes?: string | null };
      };
      payments: {
        Row: { id: string; client_id: string | null; amount: number; vat_amount: number; currency: string; method: string; status: string; booking_id: string | null; package_id: string | null; stripe_payment_id: string | null; stripe_invoice_id: string | null; description: string | null; notes: string | null; paid_at: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { client_id?: string | null; amount: number; vat_amount?: number; currency?: string; method: string; status?: string; booking_id?: string | null; package_id?: string | null; description?: string | null; notes?: string | null; paid_at?: string | null; created_by?: string | null };
        Update: { amount?: number; status?: string; method?: string; notes?: string | null; paid_at?: string | null };
      };
      invoices: {
        Row: { id: string; client_id: string | null; invoice_number: string; status: string; subtotal: number; vat_amount: number; total: number; currency: string; issued_at: string | null; due_at: string | null; paid_at: string | null; client_name: string | null; client_address: string | null; client_ico: string | null; client_dic: string | null; notes: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { client_id?: string | null; invoice_number: string; status?: string; subtotal: number; vat_amount?: number; total: number; currency?: string; issued_at?: string | null; due_at?: string | null; notes?: string | null; created_by?: string | null; [key: string]: unknown };
        Update: { status?: string; paid_at?: string | null; notes?: string | null; [key: string]: unknown };
      };
      invoice_items: {
        Row: { id: string; invoice_id: string; description: string; quantity: number; unit_price: number; vat_rate: number; total: number; service_id: string | null; sort_order: number };
        Insert: { invoice_id: string; description: string; quantity?: number; unit_price: number; vat_rate?: number; total: number; service_id?: string | null; sort_order?: number };
        Update: { description?: string; quantity?: number; unit_price?: number; total?: number };
      };
      costs: {
        Row: { id: string; type: string; category: string | null; description: string; amount: number; currency: string; date: string; recurring: boolean; recurring_period: string | null; provider_id: string | null; notes: string | null; created_at: string; created_by: string | null };
        Insert: { type: string; description: string; amount: number; date?: string; category?: string | null; currency?: string; recurring?: boolean; recurring_period?: string | null; provider_id?: string | null; notes?: string | null; created_by?: string | null };
        Update: { type?: string; description?: string; amount?: number; date?: string; notes?: string | null };
      };
      medical_records: {
        Row: { id: string; client_id: string; provider_id: string | null; type: string; title: string; content: string; diagnosis_codes: string[] | null; procedures: string[] | null; treatment_plan: string | null; recommended_sessions: number | null; session_frequency: string | null; is_confidential: boolean; created_at: string; updated_at: string };
        Insert: { client_id: string; provider_id?: string | null; type: string; title: string; content: string; diagnosis_codes?: string[] | null; procedures?: string[] | null; treatment_plan?: string | null; recommended_sessions?: number | null; session_frequency?: string | null; is_confidential?: boolean };
        Update: { title?: string; content?: string; treatment_plan?: string | null; is_confidential?: boolean; [key: string]: unknown };
      };
      training_plans: {
        Row: { id: string; client_id: string; trainer_id: string | null; name: string; description: string | null; goals: string | null; start_date: string | null; end_date: string | null; frequency: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { client_id: string; trainer_id?: string | null; name: string; description?: string | null; goals?: string | null; start_date?: string | null; end_date?: string | null; frequency?: string | null; is_active?: boolean };
        Update: { name?: string; description?: string | null; goals?: string | null; is_active?: boolean; [key: string]: unknown };
      };
      training_sessions: {
        Row: { id: string; plan_id: string | null; booking_id: string | null; client_id: string; trainer_id: string | null; date: string; duration_minutes: number | null; exercises: string | null; notes: string | null; performance_rating: number | null; client_feedback: string | null; created_at: string };
        Insert: { client_id: string; date: string; plan_id?: string | null; booking_id?: string | null; trainer_id?: string | null; duration_minutes?: number | null; exercises?: string | null; notes?: string | null; performance_rating?: number | null; client_feedback?: string | null };
        Update: { exercises?: string | null; notes?: string | null; performance_rating?: number | null };
      };
      documents: {
        Row: { id: string; entity_type: string; entity_id: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; description: string | null; uploaded_by: string | null; created_at: string };
        Insert: { entity_type: string; entity_id: string; file_name: string; file_path: string; file_size?: number | null; mime_type?: string | null; description?: string | null; uploaded_by?: string | null };
        Update: { description?: string | null };
      };
      campaigns: {
        Row: { id: string; name: string; description: string | null; channel: string; status: string; subject: string | null; content: string | null; segment_filter: Record<string, unknown> | null; recipient_count: number; sent_count: number; opened_count: number; clicked_count: number; scheduled_at: string | null; sent_at: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { name: string; channel: string; description?: string | null; status?: string; subject?: string | null; content?: string | null; segment_filter?: Record<string, unknown> | null; scheduled_at?: string | null; created_by?: string | null };
        Update: { name?: string; status?: string; subject?: string | null; content?: string | null; [key: string]: unknown };
      };
      communications: {
        Row: { id: string; client_id: string; campaign_id: string | null; channel: string; direction: string; subject: string | null; content: string | null; sent_at: string | null; delivered_at: string | null; opened_at: string | null; clicked_at: string | null; call_duration_seconds: number | null; call_notes: string | null; created_by: string | null; created_at: string };
        Insert: { client_id: string; channel: string; direction?: string; subject?: string | null; content?: string | null; campaign_id?: string | null; created_by?: string | null };
        Update: { sent_at?: string | null; delivered_at?: string | null; opened_at?: string | null };
      };
      leads: {
        Row: { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; stage: string; score: number; source: string | null; client_id: string | null; converted_at: string | null; notes: string | null; assigned_to: string | null; created_at: string; updated_at: string };
        Insert: { first_name: string; last_name?: string | null; email?: string | null; phone?: string | null; stage?: string; score?: number; source?: string | null; assigned_to?: string | null; notes?: string | null };
        Update: { first_name?: string; stage?: string; score?: number; client_id?: string | null; converted_at?: string | null; notes?: string | null; [key: string]: unknown };
      };
      audit_logs: {
        Row: { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown> | null; ip_address: string | null; user_agent: string | null; created_at: string };
        Insert: { user_id?: string | null; action: string; entity_type: string; entity_id?: string | null; details?: Record<string, unknown> | null; ip_address?: string | null; user_agent?: string | null };
        Update: Record<string, never>;
      };
      settings: {
        Row: { key: string; value: Record<string, unknown>; description: string | null; updated_at: string; updated_by: string | null };
        Insert: { key: string; value: Record<string, unknown>; description?: string | null; updated_by?: string | null };
        Update: { value?: Record<string, unknown>; description?: string | null; updated_by?: string | null };
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { p_user_id: string; p_permission_code: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_status: "active" | "inactive" | "suspended";
      client_status: "active" | "inactive" | "lead" | "archived";
      booking_status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
      payment_status: "paid" | "pending" | "overdue" | "cancelled" | "refunded";
      payment_method: "cash" | "card" | "bank_transfer" | "online" | "credit";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
