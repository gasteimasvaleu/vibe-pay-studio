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
      blog_categories: {
        Row: {
          created_at: string
          order: number
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          order?: number
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          order?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category_slug: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string
          featured_order: number | null
          is_featured: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category_slug: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          featured_order?: number | null
          is_featured?: boolean
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category_slug?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          featured_order?: number | null
          is_featured?: boolean
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      broadcast_jobs: {
        Row: {
          audience: string
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          failed_count: number
          filters: Json
          id: string
          media: Json
          message: string
          price_cents: number
          scheduled_at: string | null
          sent_count: number
          status: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience: string
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          failed_count?: number
          filters?: Json
          id?: string
          media?: Json
          message: string
          price_cents?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          failed_count?: number
          filters?: Json
          id?: string
          media?: Json
          message?: string
          price_cents?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_jobs_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_jobs_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          media_paths: string[]
          priority: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          media_paths?: string[]
          priority?: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          media_paths?: string[]
          priority?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_tokenize_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_media_requests: {
        Row: {
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          delivered_at: string | null
          expires_at: string
          id: string
          media: Json
          message_id: string | null
          paid_at: string | null
          payment_intent_id: string | null
          price_cents: number
          provider: string | null
          provider_ref: string | null
          requester_id: string
          status: string
          thread_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          delivered_at?: string | null
          expires_at?: string
          id?: string
          media?: Json
          message_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          price_cents: number
          provider?: string | null
          provider_ref?: string | null
          requester_id: string
          status?: string
          thread_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          delivered_at?: string | null
          expires_at?: string
          id?: string
          media?: Json
          message_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          price_cents?: number
          provider?: string | null
          provider_ref?: string | null
          requester_id?: string
          status?: string
          thread_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_media_requests_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_media_requests_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_media_requests_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_media_requests_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_media_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_hides: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_hides_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_hides_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_unlocks: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
            foreignKeyName: "chat_message_unlocks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_unlocks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_unlocks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_unlocks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_safe"
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
          creator_profile_id: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          price_cents: number
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          creator_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          price_cents?: number
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          price_cents?: number
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_safe"
            referencedColumns: ["id"]
          },
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
          cleared_at_a: string | null
          cleared_at_b: string | null
          created_at: string
          deleted_at_a: string | null
          deleted_at_b: string | null
          id: string
          last_message_at: string
          updated_at: string
          user_a: string
          user_a_profile_id: string | null
          user_b: string
          user_b_profile_id: string | null
        }
        Insert: {
          cleared_at_a?: string | null
          cleared_at_b?: string | null
          created_at?: string
          deleted_at_a?: string | null
          deleted_at_b?: string | null
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a: string
          user_a_profile_id?: string | null
          user_b: string
          user_b_profile_id?: string | null
        }
        Update: {
          cleared_at_a?: string | null
          cleared_at_b?: string | null
          created_at?: string
          deleted_at_a?: string | null
          deleted_at_b?: string | null
          id?: string
          last_message_at?: string
          updated_at?: string
          user_a?: string
          user_a_profile_id?: string | null
          user_b?: string
          user_b_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_user_a_profile_id_fkey"
            columns: ["user_a_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_user_a_profile_id_fkey"
            columns: ["user_a_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_user_b_profile_id_fkey"
            columns: ["user_b_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_user_b_profile_id_fkey"
            columns: ["user_b_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          reason: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          reason: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_leak_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          evidence_paths: string[]
          id: string
          leak_url: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          evidence_paths?: string[]
          id?: string
          leak_url: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          evidence_paths?: string[]
          id?: string
          leak_url?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
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
      creator_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          chat_welcome_enabled: boolean
          chat_welcome_media: Json
          chat_welcome_message: string | null
          chat_welcome_price_cents: number
          chat_welcome_tag: string | null
          cover_url: string | null
          created_at: string
          discount_quarterly: number
          discount_semiannual: number
          display_name: string | null
          id: string
          instagram_handle: string | null
          kind: string
          kyc_status: string
          price_monthly: number | null
          public_listing: boolean
          public_listing_reviewed_at: string | null
          public_listing_status: string
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          username: string
          verified_at: string | null
          x_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          chat_welcome_enabled?: boolean
          chat_welcome_media?: Json
          chat_welcome_message?: string | null
          chat_welcome_price_cents?: number
          chat_welcome_tag?: string | null
          cover_url?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          kind: string
          kyc_status?: string
          price_monthly?: number | null
          public_listing?: boolean
          public_listing_reviewed_at?: string | null
          public_listing_status?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
          username: string
          verified_at?: string | null
          x_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          chat_welcome_enabled?: boolean
          chat_welcome_media?: Json
          chat_welcome_message?: string | null
          chat_welcome_price_cents?: number
          chat_welcome_tag?: string | null
          cover_url?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          kind?: string
          kyc_status?: string
          price_monthly?: number | null
          public_listing?: boolean
          public_listing_reviewed_at?: string | null
          public_listing_status?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verified_at?: string | null
          x_handle?: string | null
        }
        Relationships: []
      }
      creator_streak_days: {
        Row: {
          chat_replies: number
          created_at: string
          creator_id: string
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
          day?: string
          live_minutes?: number
          publications_count?: number
          revenue_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_streak_days_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_streak_days_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_wallets: {
        Row: {
          creator_profile_id: string | null
          pending_international_cents: number
          pending_national_cents: number
          released_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          creator_profile_id?: string | null
          pending_international_cents?: number
          pending_national_cents?: number
          released_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          creator_profile_id?: string | null
          pending_international_cents?: number
          pending_national_cents?: number
          released_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_wallets_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_wallets_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          content_purchase: boolean
          free_to_paid: boolean
          post_sales: boolean
          subscription_sales: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content_purchase?: boolean
          free_to_paid?: boolean
          post_sales?: boolean
          subscription_sales?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content_purchase?: boolean
          free_to_paid?: boolean
          post_sales?: boolean
          subscription_sales?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          kind: Database["public"]["Enums"]["email_kind"]
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_html: string
          kind: Database["public"]["Enums"]["email_kind"]
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_html?: string
          kind?: Database["public"]["Enums"]["email_kind"]
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          creator_profile_id: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          creator_profile_id: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          owner_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          owner_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          owner_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      help_article_votes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          vote_type: string
          voter_fingerprint: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          vote_type: string
          voter_fingerprint: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          vote_type?: string
          voter_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_votes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category_id: string
          content: string
          created_at: string
          id: string
          promoted: boolean
          section_id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string
          id?: string
          promoted?: boolean
          section_id: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          promoted?: boolean
          section_id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "help_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          card_label: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          card_label: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          card_label?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_sections: {
        Row: {
          category_id: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_sections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      live_comments: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          creator_profile_id: string | null
          id: string
          live_id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          live_id: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          live_id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_comments_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_comments_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_comments_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_likes: {
        Row: {
          created_at: string
          creator_profile_id: string | null
          id: string
          live_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          live_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          live_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_likes_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_secrets: {
        Row: {
          cf_live_input_id: string | null
          cf_playback_hls: string | null
          cf_webrtc_play_url: string | null
          cf_webrtc_url: string | null
          created_at: string
          live_id: string
          updated_at: string
        }
        Insert: {
          cf_live_input_id?: string | null
          cf_playback_hls?: string | null
          cf_webrtc_play_url?: string | null
          cf_webrtc_url?: string | null
          created_at?: string
          live_id: string
          updated_at?: string
        }
        Update: {
          cf_live_input_id?: string | null
          cf_playback_hls?: string | null
          cf_webrtc_play_url?: string | null
          cf_webrtc_url?: string | null
          created_at?: string
          live_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_secrets_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: true
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          cover_url: string | null
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          description: string | null
          ended_at: string | null
          followers_only: boolean
          gross_cents: number
          id: string
          likes_count: number
          price_cents: number
          started_at: string
          status: string
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
          creator_profile_id?: string | null
          description?: string | null
          ended_at?: string | null
          followers_only?: boolean
          gross_cents?: number
          id?: string
          likes_count?: number
          price_cents?: number
          started_at?: string
          status?: string
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
          creator_profile_id?: string | null
          description?: string | null
          ended_at?: string | null
          followers_only?: boolean
          gross_cents?: number
          id?: string
          likes_count?: number
          price_cents?: number
          started_at?: string
          status?: string
          tips_cents?: number
          title?: string | null
          total_views?: number
          updated_at?: string
          viewers_peak?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      live_tickets: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          id: string
          live_id: string
          provider: string
          provider_ref: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          id?: string
          live_id: string
          provider?: string
          provider_ref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          id?: string
          live_id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_tickets_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_tickets_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_tickets_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_profiles: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          muter_id?: string
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
          processing_started_at: string | null
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
          processing_started_at?: string | null
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
          processing_started_at?: string | null
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
          account_number: string | null
          account_type: string | null
          agency: string | null
          bank_name: string | null
          created_at: string
          creator_profile_id: string | null
          id: string
          payout_mode: string
          pix_key: string
          pix_key_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          payout_mode?: string
          pix_key: string
          pix_key_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          payout_mode?: string
          pix_key?: string
          pix_key_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_pct_international: number
          commission_pct_national: number
          feature_broadcasts_enabled: boolean
          feature_lives_enabled: boolean
          feature_stories_enabled: boolean
          feature_videocalls_enabled: boolean
          gateway_fee_pct: number
          id: boolean
          min_dm_cents: number
          min_ppv_cents: number
          min_videocall_cents: number
          min_withdrawal_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commission_pct_international?: number
          commission_pct_national?: number
          feature_broadcasts_enabled?: boolean
          feature_lives_enabled?: boolean
          feature_stories_enabled?: boolean
          feature_videocalls_enabled?: boolean
          gateway_fee_pct?: number
          id?: boolean
          min_dm_cents?: number
          min_ppv_cents?: number
          min_videocall_cents?: number
          min_withdrawal_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commission_pct_international?: number
          commission_pct_national?: number
          feature_broadcasts_enabled?: boolean
          feature_lives_enabled?: boolean
          feature_stories_enabled?: boolean
          feature_videocalls_enabled?: boolean
          gateway_fee_pct?: number
          id?: boolean
          min_dm_cents?: number
          min_ppv_cents?: number
          min_videocall_cents?: number
          min_withdrawal_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profile_verification_requests: {
        Row: {
          admin_notes: string | null
          code: string
          created_at: string
          creator_profile_id: string
          id: string
          photo_paths: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          code: string
          created_at?: string
          creator_profile_id: string
          id?: string
          photo_paths?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          code?: string
          created_at?: string
          creator_profile_id?: string
          id?: string
          photo_paths?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_verification_requests_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_verification_requests_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          country: string | null
          created_at: string
          creator_profile_id: string | null
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          active_profile_id: string | null
          active_view: string
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          asaas_account_id: string | null
          asaas_account_status: string | null
          asaas_api_key_encrypted: string | null
          asaas_customer_id: string | null
          asaas_wallet_id: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          birth_date: string | null
          chat_welcome_enabled: boolean
          chat_welcome_media: Json
          chat_welcome_message: string | null
          chat_welcome_price_cents: number
          chat_welcome_tag: string | null
          country: string | null
          cover_url: string | null
          cpf: string | null
          created_at: string
          discount_quarterly: number
          discount_semiannual: number
          display_name: string | null
          emails_enabled: boolean
          feed_welcome_seen_at: string | null
          free_avatar_url: string | null
          free_display_name: string | null
          free_profile_enabled: boolean
          free_username: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_verified_at: string | null
          last_seen_at: string | null
          location: string | null
          nickname: string | null
          onboarding_completed_at: string | null
          paid_dm_upload_enabled: boolean
          paid_dm_upload_max_cents: number
          paid_dm_upload_min_cents: number
          phone: string | null
          price_monthly: number | null
          referred_by: string | null
          restrict_friendships: boolean
          restrict_mentions: boolean
          restrict_search: boolean
          restrict_search_br: boolean
          restrict_search_country: boolean
          show_followers: boolean
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
          active_profile_id?: string | null
          active_view?: string
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          birth_date?: string | null
          chat_welcome_enabled?: boolean
          chat_welcome_media?: Json
          chat_welcome_message?: string | null
          chat_welcome_price_cents?: number
          chat_welcome_tag?: string | null
          country?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          emails_enabled?: boolean
          feed_welcome_seen_at?: string | null
          free_avatar_url?: string | null
          free_display_name?: string | null
          free_profile_enabled?: boolean
          free_username?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          last_seen_at?: string | null
          location?: string | null
          nickname?: string | null
          onboarding_completed_at?: string | null
          paid_dm_upload_enabled?: boolean
          paid_dm_upload_max_cents?: number
          paid_dm_upload_min_cents?: number
          phone?: string | null
          price_monthly?: number | null
          referred_by?: string | null
          restrict_friendships?: boolean
          restrict_mentions?: boolean
          restrict_search?: boolean
          restrict_search_br?: boolean
          restrict_search_country?: boolean
          show_followers?: boolean
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
          active_profile_id?: string | null
          active_view?: string
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_encrypted?: string | null
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          birth_date?: string | null
          chat_welcome_enabled?: boolean
          chat_welcome_media?: Json
          chat_welcome_message?: string | null
          chat_welcome_price_cents?: number
          chat_welcome_tag?: string | null
          country?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          discount_quarterly?: number
          discount_semiannual?: number
          display_name?: string | null
          emails_enabled?: boolean
          feed_welcome_seen_at?: string | null
          free_avatar_url?: string | null
          free_display_name?: string | null
          free_profile_enabled?: boolean
          free_username?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          last_seen_at?: string | null
          location?: string | null
          nickname?: string | null
          onboarding_completed_at?: string | null
          paid_dm_upload_enabled?: boolean
          paid_dm_upload_max_cents?: number
          paid_dm_upload_min_cents?: number
          phone?: string | null
          price_monthly?: number | null
          referred_by?: string | null
          restrict_friendships?: boolean
          restrict_mentions?: boolean
          restrict_search?: boolean
          restrict_search_br?: boolean
          restrict_search_country?: boolean
          show_followers?: boolean
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
        Relationships: [
          {
            foreignKeyName: "profiles_active_profile_id_fkey"
            columns: ["active_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_profile_id_fkey"
            columns: ["active_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          creator_id: string
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "promotions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_bookmarks: {
        Row: {
          created_at: string
          creator_profile_id: string | null
          publication_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          publication_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_bookmarks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_bookmarks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
          id: string
          position: number
          publication_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          position?: number
          publication_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          position?: number
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_challenge_tiers_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_challenge_tiers_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          creator_profile_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          creator_profile_id?: string | null
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
          {
            foreignKeyName: "publication_comment_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_comment_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_comments: {
        Row: {
          body: string
          created_at: string
          creator_profile_id: string | null
          id: string
          parent_id: string | null
          publication_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          parent_id?: string | null
          publication_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          parent_id?: string | null
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_comments_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_comments_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
      publication_hides: {
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
            foreignKeyName: "publication_hides_publication_id_fkey"
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
          creator_profile_id: string | null
          publication_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          publication_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          publication_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_likes_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
          duration_seconds: number | null
          id: string
          position: number
          publication_id: string
          storage_path: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          publication_id: string
          storage_path: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          publication_id?: string
          storage_path?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_media_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_media_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_media_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_profile_mentions: {
        Row: {
          created_at: string
          creator_profile_id: string
          id: string
          position: number
          publication_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_profile_id: string
          id?: string
          position?: number
          publication_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string
          id?: string
          position?: number
          publication_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_profile_mentions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_profile_mentions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_profile_mentions_publication_id_fkey"
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
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
          id?: string
          provider?: string
          provider_ref?: string | null
          publication_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_unlocks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_unlocks_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
          id: string
          publication_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          publication_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          publication_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_views_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_views_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "publications_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          asaas_payment_id: string | null
          created_at: string
          id: string
          reason: string
          reference_id: string
          reference_type: Database["public"]["Enums"]["refund_request_type"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["refund_request_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          asaas_payment_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reference_id: string
          reference_type: Database["public"]["Enums"]["refund_request_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["refund_request_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          asaas_payment_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string
          reference_type?: Database["public"]["Enums"]["refund_request_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["refund_request_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      revoked_sessions: {
        Row: {
          id: string
          ip: string | null
          revoked_at: string
          revoked_reason: string
          session_created_at: string | null
          session_id: string
          session_last_active_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip?: string | null
          revoked_at?: string
          revoked_reason?: string
          session_created_at?: string | null
          session_id: string
          session_last_active_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip?: string | null
          revoked_at?: string
          revoked_reason?: string
          session_created_at?: string | null
          session_id?: string
          session_last_active_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_cards: {
        Row: {
          asaas_card_token: string
          asaas_customer_id: string
          brand: string | null
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      stories: {
        Row: {
          caption: string | null
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          expires_at: string
          id: string
          media_path: string
          media_type: string
          price_cents: number
          published_at: string
          thumb_path: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          expires_at?: string
          id?: string
          media_path: string
          media_type: string
          price_cents?: number
          published_at?: string
          thumb_path?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          expires_at?: string
          id?: string
          media_path?: string
          media_type?: string
          price_cents?: number
          published_at?: string
          thumb_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      story_unlocks: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          id: string
          provider: string
          provider_ref: string | null
          status: string
          story_id: string
          transaction_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          story_id: string
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          story_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_unlocks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_restrictions: {
        Row: {
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          subscriber_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_restrictions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_restrictions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_wallets: {
        Row: {
          balance_cents: number
          blocked_at: string | null
          blocked_reason: string | null
          debt_cents: number
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          debt_cents?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          debt_cents?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_subscription_id: string | null
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          current_period_end: string
          id: string
          last_payment_id: string | null
          next_charge_at: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid: number
          promotion_id: string | null
          provider: string
          provider_ref: string | null
          reminder_sent_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          asaas_subscription_id?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          creator_profile_id?: string | null
          current_period_end: string
          id?: string
          last_payment_id?: string | null
          next_charge_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid: number
          promotion_id?: string | null
          provider?: string
          provider_ref?: string | null
          reminder_sent_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          asaas_subscription_id?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          creator_profile_id?: string | null
          current_period_end?: string
          id?: string
          last_payment_id?: string | null
          next_charge_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_cents_paid?: number
          promotion_id?: string | null
          provider?: string
          provider_ref?: string | null
          reminder_sent_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
            foreignKeyName: "tips_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
      transaction_hides: {
        Row: {
          created_at: string
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_hides_transaction_id_fkey"
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
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "transactions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      trophy_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          creator_profile_id: string | null
          id: string
          milestone_cents: number
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          milestone_cents: number
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          milestone_cents?: number
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      user_status: {
        Row: {
          clear_after_at: string | null
          created_at: string
          status: Database["public"]["Enums"]["user_status_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clear_after_at?: string | null
          created_at?: string
          status?: Database["public"]["Enums"]["user_status_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clear_after_at?: string | null
          created_at?: string
          status?: Database["public"]["Enums"]["user_status_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_categories: {
        Row: {
          created_at: string
          creator_profile_id: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_categories_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_categories_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_category_items: {
        Row: {
          category_id: string
          created_at: string
          creator_profile_id: string | null
          id: string
          position: number
          publication_media_id: string | null
          source: string
          vault_upload_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          creator_profile_id?: string | null
          id?: string
          position?: number
          publication_media_id?: string | null
          source: string
          vault_upload_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          creator_profile_id?: string | null
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
            foreignKeyName: "vault_category_items_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_category_items_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
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
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "vault_uploads_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_uploads_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          created_at: string
          creator_id: string
          creator_profile_id: string | null
          duration_minutes: number
          ended_at: string | null
          expires_at: string | null
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
          creator_profile_id?: string | null
          duration_minutes?: number
          ended_at?: string | null
          expires_at?: string | null
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
          creator_profile_id?: string | null
          duration_minutes?: number
          ended_at?: string | null
          expires_at?: string | null
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
            foreignKeyName: "video_calls_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_hides: {
        Row: {
          created_at: string
          id: string
          user_id: string
          withdrawal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          withdrawal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_hides_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          creator_profile_id: string | null
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
          creator_profile_id?: string | null
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
          creator_profile_id?: string | null
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
            foreignKeyName: "withdrawals_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
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
      chat_messages_safe: {
        Row: {
          content: string | null
          created_at: string | null
          creator_profile_id: string | null
          deleted_at: string | null
          id: string | null
          metadata: Json | null
          price_cents: number | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles_search: {
        Row: {
          avatar_url: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          kyc_verified_at: string | null
          restrict_mentions: boolean | null
          restrict_search: boolean | null
          restrict_search_br: boolean | null
          restrict_search_country: boolean | null
          user_id: string | null
          username: string | null
          verified_at: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          account_type: string | null
          active_profile_id: string | null
          active_view: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          discount_quarterly: number | null
          discount_semiannual: number | null
          display_name: string | null
          free_avatar_url: string | null
          free_display_name: string | null
          free_profile_enabled: boolean | null
          free_username: string | null
          id: string | null
          instagram_handle: string | null
          is_verified: boolean | null
          last_seen_at: string | null
          location: string | null
          onboarding_completed_at: string | null
          paid_dm_upload_enabled: boolean | null
          paid_dm_upload_max_cents: number | null
          paid_dm_upload_min_cents: number | null
          price_monthly: number | null
          restrict_friendships: boolean | null
          restrict_mentions: boolean | null
          restrict_search: boolean | null
          restrict_search_br: boolean | null
          restrict_search_country: boolean | null
          show_followers: boolean | null
          tiktok_handle: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          video_call_default_minutes: number | null
          video_call_enabled: boolean | null
          video_call_price_cents: number | null
          x_handle: string | null
        }
        Insert: {
          account_type?: string | null
          active_profile_id?: string | null
          active_view?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          discount_quarterly?: number | null
          discount_semiannual?: number | null
          display_name?: string | null
          free_avatar_url?: string | null
          free_display_name?: string | null
          free_profile_enabled?: boolean | null
          free_username?: string | null
          id?: string | null
          instagram_handle?: string | null
          is_verified?: never
          last_seen_at?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          paid_dm_upload_enabled?: boolean | null
          paid_dm_upload_max_cents?: number | null
          paid_dm_upload_min_cents?: number | null
          price_monthly?: number | null
          restrict_friendships?: boolean | null
          restrict_mentions?: boolean | null
          restrict_search?: boolean | null
          restrict_search_br?: boolean | null
          restrict_search_country?: boolean | null
          show_followers?: boolean | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          video_call_default_minutes?: number | null
          video_call_enabled?: boolean | null
          video_call_price_cents?: number | null
          x_handle?: string | null
        }
        Update: {
          account_type?: string | null
          active_profile_id?: string | null
          active_view?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          discount_quarterly?: number | null
          discount_semiannual?: number | null
          display_name?: string | null
          free_avatar_url?: string | null
          free_display_name?: string | null
          free_profile_enabled?: boolean | null
          free_username?: string | null
          id?: string | null
          instagram_handle?: string | null
          is_verified?: never
          last_seen_at?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          paid_dm_upload_enabled?: boolean | null
          paid_dm_upload_max_cents?: number | null
          paid_dm_upload_min_cents?: number | null
          price_monthly?: number | null
          restrict_friendships?: boolean | null
          restrict_mentions?: boolean | null
          restrict_search?: boolean | null
          restrict_search_br?: boolean | null
          restrict_search_country?: boolean | null
          show_followers?: boolean | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          video_call_default_minutes?: number | null
          video_call_enabled?: boolean | null
          video_call_price_cents?: number | null
          x_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_profile_id_fkey"
            columns: ["active_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_profile_id_fkey"
            columns: ["active_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_daily_revenue: {
        Args: { _from: string; _to: string }
        Returns: {
          day: string
          gross_cents: number
          platform_fee_cents: number
          tx_count: number
        }[]
      }
      admin_financial_summary: {
        Args: { _from: string; _to: string }
        Returns: {
          earning_creators: number
          gateway_fee_cents: number
          gross_cents: number
          net_cents: number
          paying_users: number
          platform_fee_cents: number
          tx_count: number
        }[]
      }
      admin_review_public_listing: {
        Args: { _creator_profile_id: string; _status: string }
        Returns: undefined
      }
      admin_unblock_wallet: {
        Args: { _note: string; _user_id: string }
        Returns: undefined
      }
      admin_user_ids: { Args: never; Returns: string[] }
      admin_wallets_snapshot: {
        Args: never
        Returns: {
          creator_pending_international_cents: number
          creator_pending_national_cents: number
          creator_released_cents: number
          subscriber_balance_cents: number
          withdrawals_pending_cents: number
        }[]
      }
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
      buyer_country_code: { Args: { _buyer: string }; Returns: string }
      buyer_is_international: { Args: { _buyer: string }; Returns: boolean }
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
      can_see_story: { Args: { _story_id: string }; Returns: boolean }
      can_send_email: {
        Args: { _kind: string; _user_id: string }
        Returns: boolean
      }
      chat_mask_metadata: { Args: { md: Json }; Returns: Json }
      check_card_tokenize_rate: {
        Args: { _ip: string; _user_id: string }
        Returns: boolean
      }
      count_author_media: {
        Args: { _author_id: string }
        Returns: {
          photos: number
          total: number
          videos: number
        }[]
      }
      creator_content_stats: {
        Args: { _author_id: string; _creator_profile_id?: string }
        Returns: {
          last_post_at: string
          video_seconds: number
        }[]
      }
      default_paid_profile: { Args: { _user_id: string }; Returns: string }
      em_alta_feed: { Args: never; Returns: Json }
      em_alta_section: {
        Args: { _limit?: number; _offset?: number; _section: string }
        Returns: Json
      }
      ensure_creator_wallet: { Args: { _user_id: string }; Returns: undefined }
      ensure_subscriber_wallet: {
        Args: { _user_id: string }
        Returns: undefined
      }
      get_or_create_thread: { Args: { other_user: string }; Returns: string }
      has_live_access: {
        Args: { _live_id: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_confirmed: { Args: { _email: string }; Returns: boolean }
      is_end_user_writer: { Args: never; Returns: boolean }
      is_muted: { Args: { _muter: string; _target: string }; Returns: boolean }
      is_privileged_writer: { Args: never; Returns: boolean }
      is_restricted: {
        Args: { _creator: string; _subscriber: string }
        Returns: boolean
      }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      list_my_revoked_sessions: {
        Args: never
        Returns: {
          id: string
          ip: string
          revoked_at: string
          revoked_reason: string
          session_created_at: string
          session_id: string
          session_last_active_at: string
          user_agent: string
        }[]
      }
      list_my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          refreshed_at: string
          updated_at: string
          user_agent: string
        }[]
      }
      media_path_owned_by: {
        Args: { _owner: string; _val: string }
        Returns: boolean
      }
      pay_with_wallet:
        | {
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
        | {
            Args: {
              _amount_cents?: number
              _creator_id?: string
              _creator_profile_id?: string
              _kind: string
              _message?: string
              _message_id?: string
              _plan?: string
              _publication_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount_cents?: number
              _call_id?: string
              _creator_id?: string
              _creator_profile_id?: string
              _kind: string
              _message?: string
              _message_id?: string
              _plan?: string
              _publication_id?: string
              _request_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount_cents?: number
              _creator_id?: string
              _creator_profile_id?: string
              _kind: string
              _message?: string
              _message_id?: string
              _plan?: string
              _publication_id?: string
              _story_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount_cents?: number
              _call_id?: string
              _creator_id?: string
              _creator_profile_id?: string
              _kind: string
              _message?: string
              _message_id?: string
              _plan?: string
              _publication_id?: string
              _request_id?: string
              _story_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount_cents?: number
              _call_id?: string
              _creator_id?: string
              _creator_profile_id?: string
              _kind: string
              _live_id?: string
              _message?: string
              _message_id?: string
              _plan?: string
              _publication_id?: string
              _request_id?: string
              _story_id?: string
            }
            Returns: Json
          }
      platform_commission_pct: {
        Args: { _international?: boolean }
        Returns: number
      }
      public_creator_by_username: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          display_name: string
          kind: string
          price_monthly: number
          updated_at: string
          username: string
        }[]
      }
      public_creator_directory: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          display_name: string
          kind: string
          price_monthly: number
          updated_at: string
          username: string
        }[]
      }
      release_matured_earnings: { Args: never; Returns: number }
      request_withdrawal: {
        Args: { _amount_cents: number; _pix_key: string; _pix_key_type: string }
        Returns: string
      }
      resolve_active_creator_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          chat_welcome_enabled: boolean
          chat_welcome_media: Json
          chat_welcome_message: string | null
          chat_welcome_price_cents: number
          chat_welcome_tag: string | null
          cover_url: string | null
          created_at: string
          discount_quarterly: number
          discount_semiannual: number
          display_name: string | null
          id: string
          instagram_handle: string | null
          kind: string
          kyc_status: string
          price_monthly: number | null
          public_listing: boolean
          public_listing_reviewed_at: string | null
          public_listing_status: string
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          username: string
          verified_at: string | null
          x_handle: string | null
        }
        SetofOptions: {
          from: "*"
          to: "creator_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_active_profile: { Args: { _user_id: string }; Returns: string }
      resolve_available_username: { Args: { desired: string }; Returns: string }
      reverse_wallet_topup: {
        Args: { _amount_cents: number; _event: string; _provider_ref: string }
        Returns: Json
      }
      revoke_all_other_sessions: { Args: never; Returns: number }
      revoke_session: { Args: { p_session_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "creator" | "subscriber"
      email_kind:
        | "free_to_paid"
        | "post_sales"
        | "subscription_sales"
        | "content_purchase"
        | "creator_referrals"
        | "pix_invoice"
      moderation_status: "pending" | "approved" | "hidden" | "removed"
      payment_method: "pix" | "credit_card" | "boleto" | "wallet" | "manual"
      promotion_status: "active" | "paused" | "ended"
      refund_request_status: "pending" | "approved" | "rejected" | "cancelled"
      refund_request_type:
        | "publication_unlock"
        | "chat_message_unlock"
        | "subscription"
        | "tip"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      report_target: "publication" | "profile" | "chat_message"
      subscription_plan: "monthly" | "quarterly" | "semiannual"
      subscription_status:
        | "active"
        | "cancelled"
        | "expired"
        | "pending"
        | "past_due"
        | "superseded"
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
        | "story_unlock"
      transaction_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled"
        | "authorized"
        | "in_analysis"
        | "partially_refunded"
      user_status_kind: "online" | "offline" | "in_chat"
      video_call_status:
        | "requested"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
        | "no_show"
        | "pending_payment"
        | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      email_kind: [
        "free_to_paid",
        "post_sales",
        "subscription_sales",
        "content_purchase",
        "creator_referrals",
        "pix_invoice",
      ],
      moderation_status: ["pending", "approved", "hidden", "removed"],
      payment_method: ["pix", "credit_card", "boleto", "wallet", "manual"],
      promotion_status: ["active", "paused", "ended"],
      refund_request_status: ["pending", "approved", "rejected", "cancelled"],
      refund_request_type: [
        "publication_unlock",
        "chat_message_unlock",
        "subscription",
        "tip",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      report_target: ["publication", "profile", "chat_message"],
      subscription_plan: ["monthly", "quarterly", "semiannual"],
      subscription_status: [
        "active",
        "cancelled",
        "expired",
        "pending",
        "past_due",
        "superseded",
      ],
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
        "story_unlock",
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
      user_status_kind: ["online", "offline", "in_chat"],
      video_call_status: [
        "requested",
        "accepted",
        "declined",
        "cancelled",
        "completed",
        "no_show",
        "pending_payment",
        "expired",
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
