// Generado por scripts/gen-db-types.mjs a partir de supabase/migrations. No editar a mano.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          id: number
          at: string
          actor_id: string | null
          actor_email: string
          action: string
          entity: string
          entity_id: string | null
          summary: string
        }
        Insert: {
          id?: never
          at?: string
          actor_id?: string | null
          actor_email: string
          action: string
          entity: string
          entity_id?: string | null
          summary: string
        }
        Update: {
          id?: never
          at?: string
          actor_id?: string | null
          actor_email?: string
          action?: string
          entity?: string
          entity_id?: string | null
          summary?: string
        }
        Relationships: []
      }
      admin_tasks: {
        Row: {
          id: string
          title: string
          description: string
          status: Database["public"]["Enums"]["task_status"]
          priority: Database["public"]["Enums"]["task_priority"]
          assignee: string | null
          tags: string[]
          due_on: string | null
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          assignee?: string | null
          tags?: string[]
          due_on?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          assignee?: string | null
          tags?: string[]
          due_on?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          id: string
          name: string
          code: string
          commission_bps: number
          active: boolean
          created_at: string
          email: string
          notes: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          commission_bps?: number
          active?: boolean
          created_at?: string
          email?: string
          notes?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          commission_bps?: number
          active?: boolean
          created_at?: string
          email?: string
          notes?: string
        }
        Relationships: []
      }
      boxie_content: {
        Row: {
          boxie_id: string
          slide_key: string
          props: Json
          updated_at: string
        }
        Insert: {
          boxie_id: string
          slide_key: string
          props?: Json
          updated_at?: string
        }
        Update: {
          boxie_id?: string
          slide_key?: string
          props?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boxie_content_boxie_id_fkey"
            columns: ["boxie_id"]
            isOneToOne: false
            referencedRelation: "boxies"
            referencedColumns: ["id"]
          },
        ]
      }
      boxies: {
        Row: {
          id: string
          code: string
          order_id: string
          theme_version_id: string
          status: Database["public"]["Enums"]["boxie_status"]
          gift_token_hash: string
          gift_token_enc: string
          edit_token_hash: string
          gift_password_hash: string | null
          recipient_name: string
          sender_name: string
          locked_at: string | null
          expires_at: string
          access_email_sent_at: string | null
          gift_email_sent_at: string | null
          first_opened_at: string | null
          open_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          order_id: string
          theme_version_id: string
          status?: Database["public"]["Enums"]["boxie_status"]
          gift_token_hash: string
          gift_token_enc: string
          edit_token_hash: string
          gift_password_hash?: string | null
          recipient_name?: string
          sender_name?: string
          locked_at?: string | null
          expires_at: string
          access_email_sent_at?: string | null
          gift_email_sent_at?: string | null
          first_opened_at?: string | null
          open_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          order_id?: string
          theme_version_id?: string
          status?: Database["public"]["Enums"]["boxie_status"]
          gift_token_hash?: string
          gift_token_enc?: string
          edit_token_hash?: string
          gift_password_hash?: string | null
          recipient_name?: string
          sender_name?: string
          locked_at?: string | null
          expires_at?: string
          access_email_sent_at?: string | null
          gift_email_sent_at?: string | null
          first_opened_at?: string | null
          open_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boxies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boxies_theme_version_id_fkey"
            columns: ["theme_version_id"]
            isOneToOne: false
            referencedRelation: "theme_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          id: string
          code: string
          kind: Database["public"]["Enums"]["coupon_kind"]
          value: number
          active: boolean
          max_uses: number | null
          used_count: number
          starts_at: string | null
          expires_at: string | null
          affiliate_id: string | null
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          kind: Database["public"]["Enums"]["coupon_kind"]
          value: number
          active?: boolean
          max_uses?: number | null
          used_count?: number
          starts_at?: string | null
          expires_at?: string | null
          affiliate_id?: string | null
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          kind?: Database["public"]["Enums"]["coupon_kind"]
          value?: number
          active?: boolean
          max_uses?: number | null
          used_count?: number
          starts_at?: string | null
          expires_at?: string | null
          affiliate_id?: string | null
          description?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          category: Database["public"]["Enums"]["expense_category"]
          description: string
          vendor: string
          amount_cents: number
          recurrence: string
          starts_on: string
          ends_on: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: Database["public"]["Enums"]["expense_category"]
          description: string
          vendor?: string
          amount_cents: number
          recurrence: string
          starts_on: string
          ends_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: Database["public"]["Enums"]["expense_category"]
          description?: string
          vendor?: string
          amount_cents?: number
          recurrence?: string
          starts_on?: string
          ends_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          id: string
          owner_type: Database["public"]["Enums"]["media_owner"]
          owner_id: string
          bucket: string
          path: string
          mime: string
          bytes: number
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_type: Database["public"]["Enums"]["media_owner"]
          owner_id: string
          bucket: string
          path: string
          mime: string
          bytes: number
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_type?: Database["public"]["Enums"]["media_owner"]
          owner_id?: string
          bucket?: string
          path?: string
          mime?: string
          bytes?: number
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          status: Database["public"]["Enums"]["order_status"]
          theme_id: string
          theme_version_id: string
          currency: string
          list_price_cents: number
          discount_cents: number
          amount_cents: number
          coupon_id: string | null
          coupon_code: string | null
          affiliate_id: string | null
          buyer_name: string
          buyer_email: string
          buyer_phone: string | null
          payment_provider: string
          mp_preference_id: string | null
          mp_payment_id: string | null
          provider_status: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
          plan_id: string | null
        }
        Insert: {
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          theme_id: string
          theme_version_id: string
          currency?: string
          list_price_cents: number
          discount_cents?: number
          amount_cents: number
          coupon_id?: string | null
          coupon_code?: string | null
          affiliate_id?: string | null
          buyer_name: string
          buyer_email: string
          buyer_phone?: string | null
          payment_provider: string
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          provider_status?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          plan_id?: string | null
        }
        Update: {
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          theme_id?: string
          theme_version_id?: string
          currency?: string
          list_price_cents?: number
          discount_cents?: number
          amount_cents?: number
          coupon_id?: string | null
          coupon_code?: string | null
          affiliate_id?: string | null
          buyer_name?: string
          buyer_email?: string
          buyer_phone?: string | null
          payment_provider?: string
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          provider_status?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_version_fk"
            columns: ["theme_version_id", "theme_id"]
            isOneToOne: false
            referencedRelation: "theme_versions"
            referencedColumns: ["id", "theme_id"]
          },
        ]
      }
      payment_events: {
        Row: {
          id: number
          order_id: string | null
          provider: string
          provider_payment_id: string
          status: string
          source: string
          outcome: string | null
          raw: Json
          received_at: string
        }
        Insert: {
          id?: never
          order_id?: string | null
          provider: string
          provider_payment_id: string
          status: string
          source: string
          outcome?: string | null
          raw?: Json
          received_at?: string
        }
        Update: {
          id?: never
          order_id?: string | null
          provider?: string
          provider_payment_id?: string
          status?: string
          source?: string
          outcome?: string | null
          raw?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          id: string
          slug: string
          name: string
          tagline: string
          price_cents: number
          compare_at_cents: number | null
          rank: number
          color: string
          features: Json
          gift_lifetime_days: number
          max_photos: number
          allow_password: boolean
          highlighted: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          tagline?: string
          price_cents: number
          compare_at_cents?: number | null
          rank: number
          color?: string
          features?: Json
          gift_lifetime_days?: number
          max_photos?: number
          allow_password?: boolean
          highlighted?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          tagline?: string
          price_cents?: number
          compare_at_cents?: number | null
          rank?: number
          color?: string
          features?: Json
          gift_lifetime_days?: number
          max_photos?: number
          allow_password?: boolean
          highlighted?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: boolean
          base_price_cents: number
          currency: string
          gift_lifetime_days: number
          offer_coupon_id: string | null
          offer_delay_seconds: number
          updated_at: string
          gateway_fee_bps: number
          gateway_vat_bps: number
          gateway_fixed_cents: number
          tax_bps: number
          variable_cost_cents: number
          monthly_goal_cents: number
          business_name: string
          support_email: string
          whatsapp: string
          instagram: string
          sales_paused: boolean
        }
        Insert: {
          id?: boolean
          base_price_cents: number
          currency?: string
          gift_lifetime_days?: number
          offer_coupon_id?: string | null
          offer_delay_seconds?: number
          updated_at?: string
          gateway_fee_bps?: number
          gateway_vat_bps?: number
          gateway_fixed_cents?: number
          tax_bps?: number
          variable_cost_cents?: number
          monthly_goal_cents?: number
          business_name?: string
          support_email?: string
          whatsapp?: string
          instagram?: string
          sales_paused?: boolean
        }
        Update: {
          id?: boolean
          base_price_cents?: number
          currency?: string
          gift_lifetime_days?: number
          offer_coupon_id?: string | null
          offer_delay_seconds?: number
          updated_at?: string
          gateway_fee_bps?: number
          gateway_vat_bps?: number
          gateway_fixed_cents?: number
          tax_bps?: number
          variable_cost_cents?: number
          monthly_goal_cents?: number
          business_name?: string
          support_email?: string
          whatsapp?: string
          instagram?: string
          sales_paused?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "settings_offer_coupon_id_fkey"
            columns: ["offer_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_versions: {
        Row: {
          id: string
          theme_id: string
          version: number
          config: Json
          published_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          theme_id: string
          version: number
          config: Json
          published_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          theme_id?: string
          version?: number
          config?: Json
          published_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          id: string
          slug: string
          name: string
          category: string
          description: string
          status: Database["public"]["Enums"]["theme_status"]
          price_cents: number | null
          sort_order: number
          listing: Json
          draft_config: Json | null
          current_version_id: string | null
          created_at: string
          updated_at: string
          origin: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          category: string
          description?: string
          status?: Database["public"]["Enums"]["theme_status"]
          price_cents?: number | null
          sort_order?: number
          listing?: Json
          draft_config?: Json | null
          current_version_id?: string | null
          created_at?: string
          updated_at?: string
          origin?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          category?: string
          description?: string
          status?: Database["public"]["Enums"]["theme_status"]
          price_cents?: number | null
          sort_order?: number
          listing?: Json
          draft_config?: Json | null
          current_version_id?: string | null
          created_at?: string
          updated_at?: string
          origin?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_current_version_fk"
            columns: ["current_version_id", "id"]
            isOneToOne: false
            referencedRelation: "theme_versions"
            referencedColumns: ["id", "theme_id"]
          },
        ]
      }
      users: {
        Row: {
          user_id: string
          email: string | null
          name: string
          role: Database["public"]["Enums"]["admin_role"] | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          preferences: Json
          invited_at: string | null
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          email?: string | null
          name?: string
          role?: Database["public"]["Enums"]["admin_role"] | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          preferences?: Json
          invited_at?: string | null
          last_seen_at?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          email?: string | null
          name?: string
          role?: Database["public"]["Enums"]["admin_role"] | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          preferences?: Json
          invited_at?: string | null
          last_seen_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_boxie_stats: {
        Row: {
          boxie_id: string | null
          last_edited_at: string | null
          filled_slides: number | null
          photos: number | null
          has_password: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_coupon_ranking: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: {
          coupon_id: string
          code: string
          uses: number
          discount_cents: number
          revenue_cents: number
        }[]
      }
      admin_kpis: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: {
          orders_created: number
          orders_paid: number
          revenue_cents: number
          discount_cents: number
          avg_ticket_cents: number
          boxies_locked: number
          gifts_opened: number
        }[]
      }
      admin_plan_ranking: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: {
          plan_id: string
          plan_name: string
          orders_paid: number
          revenue_cents: number
        }[]
      }
      admin_refund_boxie: {
        Args: {
          p_boxie_id: string
        }
        Returns: undefined
      }
      admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      admin_sales_by_day: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: {
          day: string
          orders_created: number
          orders_paid: number
          revenue_cents: number
        }[]
      }
      admin_theme_ranking: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: {
          theme_id: string
          theme_name: string
          orders_paid: number
          revenue_cents: number
        }[]
      }
      apply_payment: {
        Args: {
          p_order_id: string
          p_provider: string
          p_payment_id: string
          p_status: string
          p_amount_cents: number
          p_currency: string
          p_source: string
          p_raw: Json
          p_gift_token_hash: string
          p_gift_token_enc: string
          p_edit_token_hash: string
        }
        Returns: {
          outcome: string
          boxie_id: string
          created: boolean
        }[]
      }
      generate_boxie_code: {
        Args: never
        Returns: string
      }
      is_admin: {
        Args: never
        Returns: boolean
      }
      is_admin_or_service: {
        Args: never
        Returns: boolean
      }
      lock_boxie: {
        Args: {
          p_boxie_id: string
        }
        Returns: Database["public"]["Tables"]["boxies"]["Row"]
      }
      publish_theme: {
        Args: {
          p_theme_id: string
          p_config: Json
        }
        Returns: Database["public"]["Tables"]["theme_versions"]["Row"]
      }
      register_gift_open: {
        Args: {
          p_boxie_id: string
        }
        Returns: undefined
      }
      save_boxie_content: {
        Args: {
          p_boxie_id: string
          p_recipient_name: string
          p_sender_name: string
          p_slides: Json
        }
        Returns: string
      }
    }
    Enums: {
      admin_role: "owner" | "admin" | "editor" | "support"
      boxie_status: "active" | "refunded" | "expired"
      coupon_kind: "percent" | "fixed"
      expense_category: "infraestructura" | "marketing" | "herramientas" | "equipo" | "impuestos" | "otros"
      media_owner: "boxie" | "theme"
      order_status: "pending" | "paid" | "refunded" | "cancelled"
      task_priority: "alta" | "media" | "baja"
      task_status: "todo" | "doing" | "done"
      theme_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
