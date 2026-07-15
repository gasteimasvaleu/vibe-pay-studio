export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asaas_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      chat_message_unlocks: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          id: string
          message_id: string
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          creator_id: string
          id?: string
          message_id: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          message_id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_unlocks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_unlocks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          price_cents: number
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          price_cents?: number
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          price_cents?: number
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: []
      }
      creator_streak_days: {
        Row: {
          chat_replies: number
          created_at: string
          creator_id: string
          day: string
          live_minutes: number
          publications_count: number
          revenue_cents: number
          updated_at: string
        }
        Insert: {
          chat_replies?: number
          created_at?: string
          creator_id: string
          day: string
          live_minutes?: number
          publications_count?: number
          revenue_cents?: number
          updated_at?: string
        }
        Update: {
          chat_replies?: number
          created_at?: string
          creator_id?: string
          day?: string
          live_minutes?: number
          publications_count?: number
          revenue_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      creator_wallets: {
        Row: {
          pending_international_cents: number
          pending_national_cents: number
          released_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          pending_international_cents?: number
          pending_national_cents?: number
          released_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          pending_international_cents?: number
          pending_national_cents?: number
          released_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          cover_url: string | null
          created_at: string
          creator_id: string
          ended_at: string | null
          gross_cents: number
          id: string
          started_at: string
          tips_cents: number
          title: string | null
          total_views: number
          updated_at: string
          viewers_peak: number
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          creator_id: string
          ended_at?: string | null
          gross_cents?: number
          id?: string
          started_at?: string
          tips_cents?: number
          title?: string | null
          total_views?: number
          updated_at?: string
          viewers_peak?: number
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          ended_at?: string | null
          gross_cents?: number
          id?: string
          started_at?: string
          tips_cents?: number
          title?: string | null
          total_views?: number
          updated_at?: string
          viewers_peak?: number
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          created_at: string
          event_id: string
          event_type: string | null
          id: string
          metadata: Json
          method: string | null
          payload: Json
          pix_copy_paste: string | null
          pix_qr_code: string | null
          processed_at: string | null
          provider: string
          transaction_id: string | null
        }
        Insert: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          event_id: string
          event_type?: string | null
          id?: string
          metadata?: Json
          method?: string | null
          payload?: Json
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          processed_at?: string | null
          provider: string
          transaction_id?: string | null
        }
        Update: {
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          event_id?: string
          event_type?: string | null
          id?: string
          metadata?: Json
          method?: string | null
          payload?: Json
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          processed_at?: string | null
          provider?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          account_number: string
          account_type: string
          agency: string
          bank_name: string
          created_at: string
          id: string
          pix_key: string
          pix_key_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_type: string
          agency: string
          bank_name: string
          created_at?: string
          id?: string
          pix_key: string
          pix_key_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: string
          agency?: string
          bank_name?: string
          created_at?: string
          id?: string
          pix_key?: string
          pix_key_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          asaas_account_id: string | null
          asaas_account_status: string | null
          asaas_api_key_encrypted: string | null
          asaas_customer_id: string | null
          asaas_wallet_id: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          cpf: string | null
          created_at: string
          discount_quarterly: number
          discount_semiannual: number
          display_name: string | null
          id: string
          instagram_handle: string | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_verified_at: string | null
          onboarding_completed_at: string | null
          price_monthly: number | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          username: string
          veriff_session_id: string | null
          video_call_default_minutes: number
          video_call_enabled: boolean
          video_call_price_cents: number
          x_handle: string | null
        }
        Insert: {
          account_type?: string
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          onboarding_completed_at?: string | null
          price_monthly?: number | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
          username: string
          veriff_session_id?: string | null
          video_call_default_minutes?: number
          video_call_enabled?: boolean
          video_call_price_cents?: number
          x_handle?: string | null
        }
        Update: {
          account_type?: string
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          onboarding_completed_at?: string | null
          price_monthly?: number | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          veriff_session_id?: string | null
          video_call_default_minutes?: number
          video_call_enabled?: boolean
          video_call_price_cents?: number
          x_handle?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          discount_pct: number
          duration_days: number
          ends_at: string
          id: string
          max_subscriptions: number
          monthly_price_snapshot: number
          name: string
          promo_price: number
          starts_at: string
          status: Database["public"]["Enums"]["promotion_status"]
          subscriptions_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          discount_pct: number
          duration_days: number
          ends_at: string
          id?: string
          max_subscriptions: number
          monthly_price_snapshot: number
          name: string
          promo_price: number
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          subscriptions_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          discount_pct?: number
          duration_days?: number
          ends_at?: string
          id?: string
          max_subscriptions?: number
          monthly_price_snapshot?: number
          name?: string
          promo_price?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          subscriptions_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      publication_bookmarks: {
        Row: {
          created_at: string
          publication_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          publication_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_bookmarks_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_challenge_tiers: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          position: number
          publication_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          position?: number
          publication_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          position?: number
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_challenge_tiers_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "publication_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          publication_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          publication_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "publication_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_comments_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_likes: {
        Row: {
          created_at: string
          publication_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          publication_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_likes_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_media: {
        Row: {
          created_at: string
          id: string
          position: number
          publication_id: string
          storage_path: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          publication_id: string
          storage_path: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          publication_id?: string
          storage_path?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_media_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_unlocks: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          id: string
          provider: string
          provider_ref: string | null
          publication_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          publication_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          publication_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_unlocks_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_unlocks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_views: {
        Row: {
          created_at: string
          id: string
          publication_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          publication_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          publication_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_views_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          archived_at: string | null
          audio_storage_path: string | null
          audio_url: string | null
          author_id: string
          caption: string | null
          challenge_cents: number | null
          comments_disabled: boolean
          created_at: string
          expires_at: string | null
          id: string
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          pinned: boolean
          preview_storage_path: string | null
          preview_url: string | null
          price_cents: number | null
          published_at: string | null
          scheduled_at: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          audio_storage_path?: string | null
          audio_url?: string | null
          author_id: string
          caption?: string | null
          challenge_cents?: number | null
          comments_disabled?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          pinned?: boolean
          preview_storage_path?: string | null
          preview_url?: string | null
          price_cents?: number | null
          published_at?: string | null
          scheduled_at?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          audio_storage_path?: string | null
          audio_url?: string | null
          author_id?: string
          caption?: string | null
          challenge_cents?: number | null
          comments_disabled?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          pinned?: boolean
          preview_storage_path?: string | null
          preview_url?: string | null
          price_cents?: number | null
          published_at?: string | null
          scheduled_at?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      saved_cards: {
        Row: {
          asaas_card_token: string
          asaas_customer_id: string
          brand: string | null
          created_at: string
          exp_month: string
          exp_year: string
          holder_name: string
          id: string
          last4: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_card_token: string
          asaas_customer_id: string
          brand?: string | null
          created_at?: string
          exp_month: string
          exp_year: string
          holder_name: string
          id?: string
          last4: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_card_token?: string
          asaas_customer_id?: string
          brand?: string | null
          created_at?: string
          exp_month?: string
          exp_year?: string
          holder_name?: string
          id?: string
          last4?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriber_wallets: {
        Row: {
          balance_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          creator_id: string
          current_period_end: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid: number
          promotion_id: string | null
          provider: string
          provider_ref: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          current_period_end: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid: number
          promotion_id?: string | null
          provider?: string
          provider_ref?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          current_period_end?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid?: number
          promotion_id?: string | null
          provider?: string
          provider_ref?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          id: string
          message: string | null
          provider: string
          provider_ref: string | null
          publication_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          id?: string
          message?: string | null
          provider?: string
          provider_ref?: string | null
          publication_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          id?: string
          message?: string | null
          provider?: string
          provider_ref?: string | null
          publication_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          access_until: string | null
          amount_cents_gross: number
          buyer_id: string | null
          commission_pct_applied: number
          country_code: string
          created_at: string
          creator_id: string | null
          gateway_fee_cents: number
          id: string
          is_international: boolean
          kind: Database["public"]["Enums"]["transaction_kind"]
          metadata: Json
          net_cents: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          platform_fee_cents: number
          provider: string
          provider_ref: string | null
          reference_id: string | null
          reference_table: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
          wallet_released_at: string | null
        }
        Insert: {
          access_until?: string | null
          amount_cents_gross: number
          buyer_id?: string | null
          commission_pct_applied: number
          country_code?: string
          created_at?: string
          creator_id?: string | null
          gateway_fee_cents?: number
          id?: string
          is_international?: boolean
          kind: Database["public"]["Enums"]["transaction_kind"]
          metadata?: Json
          net_cents: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          platform_fee_cents: number
          provider?: string
          provider_ref?: string | null
          reference_id?: string | null
          reference_table?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          wallet_released_at?: string | null
        }
        Update: {
          access_until?: string | null
          amount_cents_gross?: number
          buyer_id?: string | null
          commission_pct_applied?: number
          country_code?: string
          created_at?: string
          creator_id?: string | null
          gateway_fee_cents?: number
          id?: string
          is_international?: boolean
          kind?: Database["public"]["Enums"]["transaction_kind"]
          metadata?: Json
          net_cents?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          platform_fee_cents?: number
          provider?: string
          provider_ref?: string | null
          reference_id?: string | null
          reference_table?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          wallet_released_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_category_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          position: number
          publication_media_id: string | null
          source: string
          vault_upload_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          position?: number
          publication_media_id?: string | null
          source: string
          vault_upload_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          position?: number
          publication_media_id?: string | null
          source?: string
          vault_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_category_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vault_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_category_items_publication_media_id_fkey"
            columns: ["publication_media_id"]
            isOneToOne: false
            referencedRelation: "publication_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_category_items_vault_upload_id_fkey"
            columns: ["vault_upload_id"]
            isOneToOne: false
            referencedRelation: "vault_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_uploads: {
        Row: {
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime: string | null
          size_bytes: number | null
          storage_path: string
          type: string
          url: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path: string
          type: string
          url: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string
          type?: string
          url?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      video_calls: {
        Row: {
          created_at: string
          creator_id: string
          duration_minutes: number
          ended_at: string | null
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["transaction_status"]
          price_cents: number
          provider: string
          provider_ref: string | null
          requester_id: string
          room_url: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["video_call_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["transaction_status"]
          price_cents: number
          provider?: string
          provider_ref?: string | null
          requester_id: string
          room_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["video_call_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["transaction_status"]
          price_cents?: number
          provider?: string
          provider_ref?: string | null
          requester_id?: string
          room_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["video_call_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          fee_cents: number
          id: string
          is_first_withdrawal: boolean
          metadata: Json
          net_cents: number
          pix_key: string
          pix_key_type: string | null
          processed_at: string | null
          provider: string
          provider_ref: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          fee_cents?: number
          id?: string
          is_first_withdrawal?: boolean
          metadata?: Json
          net_cents: number
          pix_key: string
          pix_key_type?: string | null
          processed_at?: string | null
          provider?: string
          provider_ref?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          fee_cents?: number
          id?: string
          is_first_withdrawal?: boolean
          metadata?: Json
          net_cents?: number
          pix_key?: string
          pix_key_type?: string | null
          processed_at?: string | null
          provider?: string
          provider_ref?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_transaction_split:
        | {
            Args: { _commission_pct?: number; _gross_cents: number }
            Returns: {
              commission_pct_applied: number
              net_cents: number
              platform_fee_cents: number
            }[]
          }
        | {
            Args: {
              _commission_pct?: number
              _gross_cents: number
              _method?: Database["public"]["Enums"]["payment_method"]
            }
            Returns: {
              commission_pct_applied: number
              gateway_fee_cents: number
              net_cents: number
              platform_fee_cents: number
            }[]
          }
      calc_gateway_fee_cents: {
        Args: {
          _gross_cents: number
          _method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: number
      }
      can_see_publication: {
        Args: { _publication_id: string }
        Returns: boolean
      }
      ensure_creator_wallet: { Args: { _user_id: string }; Returns: undefined }
      ensure_subscriber_wallet: {
        Args: { _user_id: string }
        Returns: undefined
      }
      get_or_create_thread: { Args: { other_user: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pay_with_wallet: {
        Args: {
          _amount_cents?: number
          _creator_id?: string
          _kind: string
          _message?: string
          _message_id?: string
          _plan?: string
          _publication_id?: string
        }
        Returns: Json
      }
      release_matured_earnings: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "creator" | "subscriber"
      moderation_status: "pending" | "approved" | "hidden" | "removed"
      payment_method: "pix" | "credit_card" | "boleto" | "wallet" | "manual"
      promotion_status: "active" | "paused" | "ended"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      report_target: "publication" | "profile" | "chat_message"
      subscription_plan: "monthly" | "quarterly" | "semiannual"
      subscription_status: "active" | "cancelled" | "expired" | "pending"
      transaction_kind:
        | "subscription"
        | "publication_unlock"
        | "chat_unlock"
        | "tip"
        | "video_call"
        | "live_ticket"
        | "challenge_contribution"
        | "wallet_topup"
        | "wallet_bonus"
        | "referral_credit"
        | "affiliate_credit"
        | "withdrawal"
        | "refund"
      transaction_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled"
        | "authorized"
        | "in_analysis"
        | "partially_refunded"
      video_call_status:
        | "requested"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
        | "no_show"
      withdrawal_status:
        | "requested"
        | "in_review"
        | "approved"
        | "paid"
        | "rejected"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "creator", "subscriber"],
      moderation_status: ["pending", "approved", "hidden", "removed"],
      payment_method: ["pix", "credit_card", "boleto", "wallet", "manual"],
      promotion_status: ["active", "paused", "ended"],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      report_target: ["publication", "profile", "chat_message"],
      subscription_plan: ["monthly", "quarterly", "semiannual"],
      subscription_status: ["active", "cancelled", "expired", "pending"],
      transaction_kind: [
        "subscription",
        "publication_unlock",
        "chat_unlock",
        "tip",
        "video_call",
        "live_ticket",
        "challenge_contribution",
        "wallet_topup",
        "wallet_bonus",
        "referral_credit",
        "affiliate_credit",
        "withdrawal",
        "refund",
      ],
      transaction_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "cancelled",
        "authorized",
        "in_analysis",
        "partially_refunded",
      ],
      video_call_status: [
        "requested",
        "accepted",
        "declined",
        "cancelled",
        "completed",
        "no_show",
      ],
      withdrawal_status: [
        "requested",
        "in_review",
        "approved",
        "paid",
        "rejected",
        "failed",
      ],
    },
  },
} as const
