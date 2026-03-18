export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_participants: {
        Row: {
          id: string
          booking_id: string | null
          client_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          booking_id?: string | null
          client_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string | null
          client_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          client_id: string | null
          provider_id: string | null
          service_id: string | null
          location_id: string | null
          starts_at: string
          ends_at: string
          status: Database["public"]["Enums"]["booking_status"] | null
          type: Database["public"]["Enums"]["booking_type"] | null
          title: string | null
          notes: string | null
          internal_notes: string | null
          cancellation_reason: string | null
          parent_booking_id: string | null
          max_participants: number | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          google_event_id: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          provider_id?: string | null
          service_id?: string | null
          location_id?: string | null
          starts_at: string
          ends_at: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          type?: Database["public"]["Enums"]["booking_type"] | null
          title?: string | null
          notes?: string | null
          internal_notes?: string | null
          cancellation_reason?: string | null
          parent_booking_id?: string | null
          max_participants?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          google_event_id?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          provider_id?: string | null
          service_id?: string | null
          location_id?: string | null
          starts_at?: string
          ends_at?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          type?: Database["public"]["Enums"]["booking_type"] | null
          title?: string | null
          notes?: string | null
          internal_notes?: string | null
          cancellation_reason?: string | null
          parent_booking_id?: string | null
          max_participants?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          google_event_id?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          id: string
          name: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          status: Database["public"]["Enums"]["campaign_status"] | null
          subject: string | null
          content: string | null
          target_segments: Database["public"]["Enums"]["client_segment"][] | null
          total_recipients: number | null
          total_delivered: number | null
          total_opened: number | null
          total_clicked: number | null
          scheduled_at: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject?: string | null
          content?: string | null
          target_segments?: Database["public"]["Enums"]["client_segment"][] | null
          total_recipients?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_clicked?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          channel?: Database["public"]["Enums"]["campaign_channel"]
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject?: string | null
          content?: string | null
          target_segments?: Database["public"]["Enums"]["client_segment"][] | null
          total_recipients?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_clicked?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          id: string
          client_id: string | null
          template_id: string | null
          price_paid: number
          valid_from: string
          valid_until: string | null
          entries_total: number | null
          entries_used: number | null
          minutes_total: number | null
          minutes_used: number | null
          status: Database["public"]["Enums"]["package_status"] | null
          payment_id: string | null
          notes: string | null
          purchased_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          template_id?: string | null
          price_paid: number
          valid_from: string
          valid_until?: string | null
          entries_total?: number | null
          entries_used?: number | null
          minutes_total?: number | null
          minutes_used?: number | null
          status?: Database["public"]["Enums"]["package_status"] | null
          payment_id?: string | null
          notes?: string | null
          purchased_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          template_id?: string | null
          price_paid?: number
          valid_from?: string
          valid_until?: string | null
          entries_total?: number | null
          entries_used?: number | null
          minutes_total?: number | null
          minutes_used?: number | null
          status?: Database["public"]["Enums"]["package_status"] | null
          payment_id?: string | null
          notes?: string | null
          purchased_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          personal_id: string | null
          street: string | null
          city: string | null
          postal_code: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          source: string | null
          segments: Database["public"]["Enums"]["client_segment"][] | null
          notes: string | null
          health_goals: string | null
          health_restrictions: string | null
          hobbies: string | null
          preferred_time: string | null
          contact_preference: Database["public"]["Enums"]["contact_preference"] | null
          marketing_consent: boolean | null
          marketing_consent_date: string | null
          health_data_consent: boolean | null
          health_data_consent_date: string | null
          photo_consent: boolean | null
          photo_consent_date: string | null
          primary_trainer_id: string | null
          primary_physio_id: string | null
          primary_doctor_id: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          personal_id?: string | null
          street?: string | null
          city?: string | null
          postal_code?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          source?: string | null
          segments?: Database["public"]["Enums"]["client_segment"][] | null
          notes?: string | null
          health_goals?: string | null
          health_restrictions?: string | null
          hobbies?: string | null
          preferred_time?: string | null
          contact_preference?: Database["public"]["Enums"]["contact_preference"] | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          health_data_consent?: boolean | null
          health_data_consent_date?: string | null
          photo_consent?: boolean | null
          photo_consent_date?: string | null
          primary_trainer_id?: string | null
          primary_physio_id?: string | null
          primary_doctor_id?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          personal_id?: string | null
          street?: string | null
          city?: string | null
          postal_code?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          source?: string | null
          segments?: Database["public"]["Enums"]["client_segment"][] | null
          notes?: string | null
          health_goals?: string | null
          health_restrictions?: string | null
          hobbies?: string | null
          preferred_time?: string | null
          contact_preference?: Database["public"]["Enums"]["contact_preference"] | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          health_data_consent?: boolean | null
          health_data_consent_date?: string | null
          photo_consent?: boolean | null
          photo_consent_date?: string | null
          primary_trainer_id?: string | null
          primary_physio_id?: string | null
          primary_doctor_id?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_primary_trainer_id_fkey"
            columns: ["primary_trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_physio_id_fkey"
            columns: ["primary_physio_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          id: string
          client_id: string | null
          campaign_id: string | null
          channel: Database["public"]["Enums"]["campaign_channel"]
          subject: string | null
          content: string | null
          status: string | null
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          clicked_at: string | null
          error_message: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          campaign_id?: string | null
          channel: Database["public"]["Enums"]["campaign_channel"]
          subject?: string | null
          content?: string | null
          status?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["campaign_channel"]
          subject?: string | null
          content?: string | null
          status?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_entries: {
        Row: {
          id: string
          date: string
          accounting_period: string | null
          category: string
          account_code: string | null
          description: string | null
          note: string | null
          debit: number | null
          credit: number | null
          amount: number
          department: string | null
          source_system: string | null
          import_batch_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          date: string
          accounting_period?: string | null
          category: string
          account_code?: string | null
          description?: string | null
          note?: string | null
          debit?: number | null
          credit?: number | null
          amount: number
          department?: string | null
          source_system?: string | null
          import_batch_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          accounting_period?: string | null
          category?: string
          account_code?: string | null
          description?: string | null
          note?: string | null
          debit?: number | null
          credit?: number | null
          amount?: number
          department?: string | null
          source_system?: string | null
          import_batch_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          id: string
          description: string
          type: Database["public"]["Enums"]["cost_type"]
          amount: number
          currency: string | null
          date: string
          category: string | null
          provider_id: string | null
          recurring: boolean | null
          recurring_period: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          description: string
          type: Database["public"]["Enums"]["cost_type"]
          amount: number
          currency?: string | null
          date: string
          category?: string | null
          provider_id?: string | null
          recurring?: boolean | null
          recurring_period?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          description?: string
          type?: Database["public"]["Enums"]["cost_type"]
          amount?: number
          currency?: string | null
          date?: string
          category?: string | null
          provider_id?: string | null
          recurring?: boolean | null
          recurring_period?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          name: string
          file_path: string
          file_type: string | null
          file_size: number | null
          client_id: string | null
          category: string | null
          description: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          file_path: string
          file_type?: string | null
          file_size?: number | null
          client_id?: string | null
          category?: string | null
          description?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          file_path?: string
          file_type?: string | null
          file_size?: number | null
          client_id?: string | null
          category?: string | null
          description?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_monthly_costs: {
        Row: {
          id: string
          name: string
          category: string
          default_amount: number
          is_active: boolean | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          default_amount: number
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          default_amount?: number
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          id: string
          type: string
          source_system: string | null
          file_name: string | null
          row_count: number | null
          period_from: string | null
          period_to: string | null
          imported_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          type: string
          source_system?: string | null
          file_name?: string | null
          row_count?: number | null
          period_from?: string | null
          period_to?: string | null
          imported_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          source_system?: string | null
          file_name?: string | null
          row_count?: number | null
          period_from?: string | null
          period_to?: string | null
          imported_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string | null
          description: string
          quantity: number
          unit_price: number
          total: number
          vat_rate: number | null
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          description: string
          quantity: number
          unit_price: number
          total: number
          vat_rate?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          invoice_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          vat_rate?: number | null
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          client_id: string | null
          client_name: string | null
          client_ico: string | null
          client_dic: string | null
          client_address: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          issued_at: string | null
          due_at: string | null
          paid_at: string | null
          subtotal: number
          vat_amount: number | null
          total: number
          currency: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          invoice_number: string
          client_id?: string | null
          client_name?: string | null
          client_ico?: string | null
          client_dic?: string | null
          client_address?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          issued_at?: string | null
          due_at?: string | null
          paid_at?: string | null
          subtotal: number
          vat_amount?: number | null
          total: number
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          invoice_number?: string
          client_id?: string | null
          client_name?: string | null
          client_ico?: string | null
          client_dic?: string | null
          client_address?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          issued_at?: string | null
          due_at?: string | null
          paid_at?: string | null
          subtotal?: number
          vat_amount?: number | null
          total?: number
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"] | null
          interest: string | null
          notes: string | null
          assigned_to: string | null
          converted_client_id: string | null
          next_follow_up: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"] | null
          interest?: string | null
          notes?: string | null
          assigned_to?: string | null
          converted_client_id?: string | null
          next_follow_up?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"] | null
          interest?: string | null
          notes?: string | null
          assigned_to?: string | null
          converted_client_id?: string | null
          next_follow_up?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: string
          name: string
          type: string
          capacity: number | null
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          capacity?: number | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          capacity?: number | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          id: string
          client_id: string | null
          provider_id: string | null
          booking_id: string | null
          type: Database["public"]["Enums"]["medical_record_type"]
          title: string
          content: string
          diagnosis_codes: string[] | null
          procedures: string[] | null
          medications: string | null
          treatment_goals: string | null
          treatment_frequency: string | null
          is_confidential: boolean | null
          attachments: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          provider_id?: string | null
          booking_id?: string | null
          type: Database["public"]["Enums"]["medical_record_type"]
          title: string
          content: string
          diagnosis_codes?: string[] | null
          procedures?: string[] | null
          medications?: string | null
          treatment_goals?: string | null
          treatment_frequency?: string | null
          is_confidential?: boolean | null
          attachments?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          provider_id?: string | null
          booking_id?: string | null
          type?: Database["public"]["Enums"]["medical_record_type"]
          title?: string
          content?: string
          diagnosis_codes?: string[] | null
          procedures?: string[] | null
          medications?: string | null
          treatment_goals?: string | null
          treatment_frequency?: string | null
          is_confidential?: boolean | null
          attachments?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          type: Database["public"]["Enums"]["package_type"]
          price: number
          vat_rate: number | null
          total_entries: number | null
          total_minutes: number | null
          valid_days: number | null
          service_ids: string[] | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: Database["public"]["Enums"]["package_type"]
          price: number
          vat_rate?: number | null
          total_entries?: number | null
          total_minutes?: number | null
          valid_days?: number | null
          service_ids?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: Database["public"]["Enums"]["package_type"]
          price?: number
          vat_rate?: number | null
          total_entries?: number | null
          total_minutes?: number | null
          valid_days?: number | null
          service_ids?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          client_id: string | null
          amount: number
          vat_amount: number | null
          currency: string | null
          method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"] | null
          booking_id: string | null
          package_id: string | null
          stripe_payment_id: string | null
          stripe_invoice_id: string | null
          description: string | null
          notes: string | null
          paid_at: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          amount: number
          vat_amount?: number | null
          currency?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"] | null
          booking_id?: string | null
          package_id?: string | null
          stripe_payment_id?: string | null
          stripe_invoice_id?: string | null
          description?: string | null
          notes?: string | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          amount?: number
          vat_amount?: number | null
          currency?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"] | null
          booking_id?: string | null
          package_id?: string | null
          stripe_payment_id?: string | null
          stripe_invoice_id?: string | null
          description?: string | null
          notes?: string | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          id: string
          code: string
          module: string
          action: string
          scope: string | null
          display_name: string
          description: string | null
        }
        Insert: {
          id?: string
          code: string
          module: string
          action: string
          scope?: string | null
          display_name: string
          description?: string | null
        }
        Update: {
          id?: string
          code?: string
          module?: string
          action?: string
          scope?: string | null
          display_name?: string
          description?: string | null
        }
        Relationships: []
      }
      provider_monthly_stats: {
        Row: {
          id: string
          user_id: string
          month: string
          available_hours: number | null
          worked_hours: number | null
          client_count: number | null
          session_count: number | null
          revenue: number | null
          cost: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          available_hours?: number | null
          worked_hours?: number | null
          client_count?: number | null
          session_count?: number | null
          revenue?: number | null
          cost?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          available_hours?: number | null
          worked_hours?: number | null
          client_count?: number | null
          session_count?: number | null
          revenue?: number | null
          cost?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_monthly_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_rates: {
        Row: {
          id: string
          user_id: string
          rate_type: string
          amount: number
          currency: string | null
          valid_from: string
          valid_until: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          rate_type: string
          amount: number
          currency?: string | null
          valid_from: string
          valid_until?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          rate_type?: string
          amount?: number
          currency?: string | null
          valid_from?: string
          valid_until?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_schedules: {
        Row: {
          id: string
          user_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          is_active: boolean | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          id: string
          date: string
          category: string
          code: string | null
          description: string | null
          client_name: string | null
          amount: number
          vat_rate: number | null
          net_amount: number | null
          payment_method: string | null
          document_type: string | null
          document_number: string | null
          department: string | null
          source_system: string | null
          import_batch_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          date: string
          category: string
          code?: string | null
          description?: string | null
          client_name?: string | null
          amount: number
          vat_rate?: number | null
          net_amount?: number | null
          payment_method?: string | null
          document_type?: string | null
          document_number?: string | null
          department?: string | null
          source_system?: string | null
          import_batch_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          category?: string
          code?: string | null
          description?: string | null
          client_name?: string | null
          amount?: number
          vat_rate?: number | null
          net_amount?: number | null
          payment_method?: string | null
          document_type?: string | null
          document_number?: string | null
          department?: string | null
          source_system?: string | null
          import_batch_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
        }
        Insert: {
          role_id: string
          permission_id: string
        }
        Update: {
          role_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          is_system: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          is_system?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          is_system?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          id: string
          user_id: string | null
          date: string
          is_available: boolean | null
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          date: string
          is_available?: boolean | null
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          date?: string
          is_available?: boolean | null
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          id: string
          name: string
          category: Database["public"]["Enums"]["service_category"]
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: Database["public"]["Enums"]["service_category"]
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: Database["public"]["Enums"]["service_category"]
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          duration_minutes: number
          price: number
          vat_rate: number | null
          max_participants: number | null
          requires_equipment: boolean | null
          is_active: boolean | null
          color: string | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          duration_minutes: number
          price: number
          vat_rate?: number | null
          max_participants?: number | null
          requires_equipment?: boolean | null
          is_active?: boolean | null
          color?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          duration_minutes?: number
          price?: number
          vat_rate?: number | null
          max_participants?: number | null
          requires_equipment?: boolean | null
          is_active?: boolean | null
          color?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          id: string
          name: string
          client_id: string | null
          trainer_id: string | null
          description: string | null
          goals: string | null
          exercises: Json | null
          is_active: boolean | null
          valid_from: string | null
          valid_until: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          trainer_id?: string | null
          description?: string | null
          goals?: string | null
          exercises?: Json | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          client_id?: string | null
          trainer_id?: string | null
          description?: string | null
          goals?: string | null
          exercises?: Json | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          user_id: string
          permission_id: string
          granted: boolean | null
        }
        Insert: {
          user_id: string
          permission_id: string
          granted?: boolean | null
        }
        Update: {
          user_id?: string
          permission_id?: string
          granted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
        }
        Insert: {
          user_id: string
          role_id: string
        }
        Update: {
          user_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          job_title: string | null
          specialization: string | null
          hourly_rate: number | null
          color: string | null
          google_calendar_id: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          job_title?: string | null
          specialization?: string | null
          hourly_rate?: number | null
          color?: string | null
          google_calendar_id?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          job_title?: string | null
          specialization?: string | null
          hourly_rate?: number | null
          color?: string | null
          google_calendar_id?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      booking_type:
        | "individual"
        | "group"
        | "recurring"
        | "block"
      campaign_channel:
        | "email"
        | "sms"
        | "push"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "cancelled"
      client_segment:
        | "vip"
        | "regular"
        | "new"
        | "inactive"
        | "at_risk"
        | "rehabilitation"
        | "fitness"
        | "senior"
        | "child"
        | "corporate"
      client_status:
        | "active"
        | "inactive"
        | "archived"
      contact_preference:
        | "email"
        | "phone"
        | "sms"
      cost_type:
        | "salary"
        | "rent"
        | "equipment"
        | "marketing"
        | "utilities"
        | "insurance"
        | "maintenance"
        | "supplies"
        | "software"
        | "other"
      gender:
        | "male"
        | "female"
        | "other"
      invoice_status:
        | "draft"
        | "issued"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
      lead_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      medical_record_type:
        | "initial_examination"
        | "follow_up"
        | "treatment_plan"
        | "discharge_summary"
        | "prescription"
        | "lab_results"
        | "imaging"
        | "consultation"
        | "progress_note"
      package_status:
        | "active"
        | "expired"
        | "depleted"
        | "cancelled"
        | "frozen"
      package_type:
        | "entries"
        | "minutes"
        | "unlimited"
        | "time_period"
      payment_method:
        | "cash"
        | "card"
        | "bank_transfer"
        | "stripe"
        | "benefit_card"
      payment_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      service_category:
        | "rehabilitation"
        | "fitness"
        | "wellness"
        | "diagnostics"
        | "consultation"
      user_status:
        | "active"
        | "inactive"
        | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
