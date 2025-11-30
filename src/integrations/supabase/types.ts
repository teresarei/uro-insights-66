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
      diary_entries: {
        Row: {
          confidence: string | null
          created_at: string
          date: string
          dry_pad_weight_g: number | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          intake_type: string | null
          leakage_severity:
            | Database["public"]["Enums"]["leakage_severity"]
            | null
          leakage_weight_g: number | null
          notes: string | null
          source: Database["public"]["Enums"]["entry_source"]
          time: string
          trigger: string | null
          updated_at: string
          urgency: number | null
          user_id: string | null
          uses_catheter: boolean | null
          volume_ml: number | null
          volume_with_catheter_ml: number | null
          volume_without_catheter_ml: number | null
          wet_pad_weight_g: number | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          date?: string
          dry_pad_weight_g?: number | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          intake_type?: string | null
          leakage_severity?:
            | Database["public"]["Enums"]["leakage_severity"]
            | null
          leakage_weight_g?: number | null
          notes?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          time?: string
          trigger?: string | null
          updated_at?: string
          urgency?: number | null
          user_id?: string | null
          uses_catheter?: boolean | null
          volume_ml?: number | null
          volume_with_catheter_ml?: number | null
          volume_without_catheter_ml?: number | null
          wet_pad_weight_g?: number | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          date?: string
          dry_pad_weight_g?: number | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          intake_type?: string | null
          leakage_severity?:
            | Database["public"]["Enums"]["leakage_severity"]
            | null
          leakage_weight_g?: number | null
          notes?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          time?: string
          trigger?: string | null
          updated_at?: string
          urgency?: number | null
          user_id?: string | null
          uses_catheter?: boolean | null
          volume_ml?: number | null
          volume_with_catheter_ml?: number | null
          volume_without_catheter_ml?: number | null
          wet_pad_weight_g?: number | null
        }
        Relationships: []
      }
      recording_blocks: {
        Row: {
          clinical_patterns: Json | null
          created_at: string
          day_void_count: number | null
          day_voided_ml: number | null
          end_datetime: string
          id: string
          intake_count: number | null
          leakage_count: number | null
          max_void_volume: number | null
          median_void_volume: number | null
          min_void_volume: number | null
          night_void_count: number | null
          night_voided_ml: number | null
          overall_assessment: string | null
          start_datetime: string
          status: string
          total_intake_ml: number | null
          total_leakage_weight_g: number | null
          total_voided_ml: number | null
          treatment_plan: string | null
          treatment_plan_updated_at: string | null
          updated_at: string
          user_id: string | null
          void_count: number | null
        }
        Insert: {
          clinical_patterns?: Json | null
          created_at?: string
          day_void_count?: number | null
          day_voided_ml?: number | null
          end_datetime: string
          id?: string
          intake_count?: number | null
          leakage_count?: number | null
          max_void_volume?: number | null
          median_void_volume?: number | null
          min_void_volume?: number | null
          night_void_count?: number | null
          night_voided_ml?: number | null
          overall_assessment?: string | null
          start_datetime: string
          status?: string
          total_intake_ml?: number | null
          total_leakage_weight_g?: number | null
          total_voided_ml?: number | null
          treatment_plan?: string | null
          treatment_plan_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
          void_count?: number | null
        }
        Update: {
          clinical_patterns?: Json | null
          created_at?: string
          day_void_count?: number | null
          day_voided_ml?: number | null
          end_datetime?: string
          id?: string
          intake_count?: number | null
          leakage_count?: number | null
          max_void_volume?: number | null
          median_void_volume?: number | null
          min_void_volume?: number | null
          night_void_count?: number | null
          night_voided_ml?: number | null
          overall_assessment?: string | null
          start_datetime?: string
          status?: string
          total_intake_ml?: number | null
          total_leakage_weight_g?: number | null
          total_voided_ml?: number | null
          treatment_plan?: string | null
          treatment_plan_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
          void_count?: number | null
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
      entry_source: "scan" | "manual"
      event_type: "void" | "leakage" | "intake"
      leakage_severity: "small" | "medium" | "large"
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
      entry_source: ["scan", "manual"],
      event_type: ["void", "leakage", "intake"],
      leakage_severity: ["small", "medium", "large"],
    },
  },
} as const
