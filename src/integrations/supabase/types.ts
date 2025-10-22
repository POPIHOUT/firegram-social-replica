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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advertisements: {
        Row: {
          active: boolean
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string
          thumbnail_url: string | null
          type: string
          user_id: string
        }
        Insert: {
          active?: boolean
          caption?: string | null
          created_at?: string
          expires_at: string
          id?: string
          media_url: string
          thumbnail_url?: string | null
          type: string
          user_id: string
        }
        Update: {
          active?: boolean
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string
          thumbnail_url?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          reel_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      effects: {
        Row: {
          created_at: string | null
          description: string | null
          effect_type: string
          icon: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effect_type: string
          icon?: string | null
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effect_type?: string
          icon?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      flame_purchases: {
        Row: {
          card_holder_name: string
          card_last4: string
          card_type: string
          created_at: string
          creator_commission_flames: number | null
          creator_id: string | null
          discount_percent: number | null
          flame_amount: number
          id: string
          price_usd: number
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          sac_code: string | null
          status: string
          user_id: string
        }
        Insert: {
          card_holder_name: string
          card_last4: string
          card_type: string
          created_at?: string
          creator_commission_flames?: number | null
          creator_id?: string | null
          discount_percent?: number | null
          flame_amount: number
          id?: string
          price_usd: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          sac_code?: string | null
          status?: string
          user_id: string
        }
        Update: {
          card_holder_name?: string
          card_last4?: string
          card_type?: string
          created_at?: string
          creator_commission_flames?: number | null
          creator_id?: string | null
          discount_percent?: number | null
          flame_amount?: number
          id?: string
          price_usd?: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          sac_code?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flame_purchases_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flame_purchases_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flame_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      frames: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reel_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          conversation_id: string | null
          created_at: string
          from_user_id: string | null
          id: string
          message: string | null
          post_id: string | null
          read: boolean
          reel_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          message?: string | null
          post_id?: string | null
          read?: boolean
          reel_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          message?: string | null
          post_id?: string | null
          read?: boolean
          reel_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string | null
          id: string
          image_url: string
          images: string[] | null
          likes_count: number | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          image_url: string
          images?: string[] | null
          likes_count?: number | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          image_url?: string
          images?: string[] | null
          likes_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned: boolean | null
          bio: string | null
          created_at: string | null
          custom_background_url: string | null
          date_of_birth: string | null
          fake_followers_count: number | null
          first_name: string | null
          flames: number
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_premium: boolean | null
          is_support: boolean | null
          is_verified: boolean | null
          last_name: string | null
          premium_until: string | null
          selected_effect_id: string | null
          selected_frame_id: string | null
          show_custom_background: boolean | null
          show_own_fire_effect: boolean | null
          suspended: boolean | null
          suspended_reason: string | null
          suspended_until: string | null
          updated_at: string | null
          username: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          created_at?: string | null
          custom_background_url?: string | null
          date_of_birth?: string | null
          fake_followers_count?: number | null
          first_name?: string | null
          flames?: number
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          is_premium?: boolean | null
          is_support?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          premium_until?: string | null
          selected_effect_id?: string | null
          selected_frame_id?: string | null
          show_custom_background?: boolean | null
          show_own_fire_effect?: boolean | null
          suspended?: boolean | null
          suspended_reason?: string | null
          suspended_until?: string | null
          updated_at?: string | null
          username: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          created_at?: string | null
          custom_background_url?: string | null
          date_of_birth?: string | null
          fake_followers_count?: number | null
          first_name?: string | null
          flames?: number
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_premium?: boolean | null
          is_support?: boolean | null
          is_verified?: boolean | null
          last_name?: string | null
          premium_until?: string | null
          selected_effect_id?: string | null
          selected_frame_id?: string | null
          show_custom_background?: boolean | null
          show_own_fire_effect?: boolean | null
          suspended?: boolean | null
          suspended_reason?: string | null
          suspended_until?: string | null
          updated_at?: string | null
          username?: string
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_effect_id_fkey"
            columns: ["selected_effect_id"]
            isOneToOne: false
            referencedRelation: "effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_selected_frame_id_fkey"
            columns: ["selected_frame_id"]
            isOneToOne: false
            referencedRelation: "frames"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string | null
          id: string
          likes_count: number | null
          thumbnail_url: string | null
          user_id: string
          video_url: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          likes_count?: number | null
          thumbnail_url?: string | null
          user_id: string
          video_url: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string | null
          id?: string
          likes_count?: number | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sac_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sac_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reel_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stories_user_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_ad_associations: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          story_owner_id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          story_owner_id: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          story_owner_id?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "fk_story"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      update_announcements: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_locks: {
        Row: {
          active: boolean
          bypass_user_ids: string[] | null
          created_at: string
          created_by: string
          id: string
          locked_until: string
          reason: string
        }
        Insert: {
          active?: boolean
          bypass_user_ids?: string[] | null
          created_at?: string
          created_by: string
          id?: string
          locked_until: string
          reason: string
        }
        Update: {
          active?: boolean
          bypass_user_ids?: string[] | null
          created_at?: string
          created_by?: string
          id?: string
          locked_until?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_locks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "update_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_effects: {
        Row: {
          effect_id: string
          id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          effect_id: string
          id?: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          effect_id?: string
          id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_effects_effect_id_fkey"
            columns: ["effect_id"]
            isOneToOne: false
            referencedRelation: "effects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_frames: {
        Row: {
          frame_id: string
          id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          frame_id: string
          id?: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          frame_id?: string
          id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_code_redemptions: {
        Row: {
          amount: number
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "wallet_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          current_uses: number
          expires_at: string | null
          id: string
          max_uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          value?: number
        }
        Relationships: []
      }
      wallet_deposits: {
        Row: {
          amount: number
          card_holder_name: string
          card_last4: string
          card_type: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          card_holder_name: string
          card_last4: string
          card_type: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_holder_name?: string
          card_last4?: string
          card_type?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_wallet_money: {
        Args: {
          amount_to_add: number
          description_text: string
          target_user_id: string
        }
        Returns: undefined
      }
      admin_remove_wallet_money: {
        Args: {
          amount_to_remove: number
          description_text: string
          target_user_id: string
        }
        Returns: undefined
      }
      approve_flame_purchase: {
        Args: { purchase_id: string }
        Returns: undefined
      }
      approve_wallet_deposit: {
        Args: { deposit_id: string }
        Returns: undefined
      }
      cancel_premium: { Args: never; Returns: undefined }
      create_or_get_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      delete_expired_stories: { Args: never; Returns: undefined }
      expire_premium_subscriptions: { Args: never; Returns: undefined }
      get_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      give_fake_followers: {
        Args: { follower_count: number; target_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      purchase_effect: { Args: { effect_uuid: string }; Returns: undefined }
      purchase_flames_with_wallet: {
        Args: { flame_amount: number; price_amount: number }
        Returns: undefined
      }
      purchase_frame: { Args: { frame_uuid: string }; Returns: undefined }
      purchase_premium: { Args: never; Returns: undefined }
      redeem_wallet_code: { Args: { code_text: string }; Returns: number }
      reject_flame_purchase: {
        Args: { purchase_id: string; reason: string }
        Returns: undefined
      }
      reject_wallet_deposit: {
        Args: { deposit_id: string; reason: string }
        Returns: undefined
      }
      remove_fake_followers: {
        Args: { follower_count: number; target_user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "support" | "system_manager"
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
      app_role: ["admin", "support", "system_manager"],
    },
  },
} as const
