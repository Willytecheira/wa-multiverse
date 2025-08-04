export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          usage_count: number
          user_id: string
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          usage_count?: number
          user_id: string
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          from_number: string
          id: string
          is_from_me: boolean
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          session_id: string
          status: Database["public"]["Enums"]["message_status"]
          timestamp: string
          to_number: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          from_number: string
          id?: string
          is_from_me?: boolean
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          session_id: string
          status?: Database["public"]["Enums"]["message_status"]
          timestamp?: string
          to_number: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          from_number?: string
          id?: string
          is_from_me?: boolean
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          session_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          timestamp?: string
          to_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          recorded_at: string
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          recorded_at?: string
          value: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          recorded_at?: string
          value?: number
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhooks: {
        Row: {
          created_at: string
          error_count: number
          events: Database["public"]["Enums"]["webhook_event"][]
          id: string
          is_active: boolean
          last_triggered: string | null
          name: string
          secret_key: string | null
          session_id: string
          success_count: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          name: string
          secret_key?: string | null
          session_id: string
          success_count?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_count?: number
          events?: Database["public"]["Enums"]["webhook_event"][]
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          name?: string
          secret_key?: string | null
          session_id?: string
          success_count?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          client_info: Json | null
          connected_at: string | null
          created_at: string
          id: string
          is_active: boolean
          last_activity: string | null
          name: string
          phone: string | null
          qr_code: string | null
          session_key: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          client_info?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity?: string | null
          name: string
          phone?: string | null
          qr_code?: string | null
          session_key: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          client_info?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity?: string | null
          name?: string
          phone?: string | null
          qr_code?: string | null
          session_key?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      message_status: "sent" | "delivered" | "read" | "failed"
      session_status:
        | "initializing"
        | "qr_ready"
        | "connected"
        | "disconnected"
        | "auth_failure"
      webhook_event:
        | "all"
        | "message-received"
        | "message-delivered"
        | "message-from-me"
        | "session-status"
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
      app_role: ["admin", "user"],
      message_status: ["sent", "delivered", "read", "failed"],
      session_status: [
        "initializing",
        "qr_ready",
        "connected",
        "disconnected",
        "auth_failure",
      ],
      webhook_event: [
        "all",
        "message-received",
        "message-delivered",
        "message-from-me",
        "session-status",
      ],
    },
  },
} as const
