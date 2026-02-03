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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          translation: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          translation?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          translation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorite_videos: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          created_at: string
          date: string
          flashcards_reviewed: number | null
          id: string
          quiz_score: number | null
          quiz_total: number | null
          reading_minutes: number | null
          speaking_minutes: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          flashcards_reviewed?: number | null
          id?: string
          quiz_score?: number | null
          quiz_total?: number | null
          reading_minutes?: number | null
          speaking_minutes?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          flashcards_reviewed?: number | null
          id?: string
          quiz_score?: number | null
          quiz_total?: number | null
          reading_minutes?: number | null
          speaking_minutes?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number | null
          display_name: string | null
          id: string
          jlpt_level: string | null
          longest_streak: number | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          id?: string
          jlpt_level?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          id?: string
          jlpt_level?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pronunciation_results: {
        Row: {
          accuracy_score: number | null
          created_at: string
          duration_score: number | null
          feedback: string | null
          fluency_score: number | null
          id: string
          mode: string
          original_text: string
          recognized_text: string
          rhythm_score: number | null
          score: number
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          duration_score?: number | null
          feedback?: string | null
          fluency_score?: number | null
          id?: string
          mode?: string
          original_text: string
          recognized_text: string
          rhythm_score?: number | null
          score?: number
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          duration_score?: number | null
          feedback?: string | null
          fluency_score?: number | null
          id?: string
          mode?: string
          original_text?: string
          recognized_text?: string
          rhythm_score?: number | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      reading_passages: {
        Row: {
          category: string | null
          content: string
          content_with_furigana: string | null
          created_at: string
          id: string
          level: string
          preloaded_vocabulary: Json | null
          title: string
          updated_at: string
          user_id: string | null
          vocabulary_list: Json | null
        }
        Insert: {
          category?: string | null
          content: string
          content_with_furigana?: string | null
          created_at?: string
          id?: string
          level?: string
          preloaded_vocabulary?: Json | null
          title: string
          updated_at?: string
          user_id?: string | null
          vocabulary_list?: Json | null
        }
        Update: {
          category?: string | null
          content?: string
          content_with_furigana?: string | null
          created_at?: string
          id?: string
          level?: string
          preloaded_vocabulary?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
          vocabulary_list?: Json | null
        }
        Relationships: []
      }
      saved_vocabulary: {
        Row: {
          created_at: string
          example_sentence: string | null
          id: string
          mastery_level: number | null
          meaning: string
          reading: string | null
          source_segment_id: string | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          example_sentence?: string | null
          id?: string
          mastery_level?: number | null
          meaning: string
          reading?: string | null
          source_segment_id?: string | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          example_sentence?: string | null
          id?: string
          mastery_level?: number | null
          meaning?: string
          reading?: string | null
          source_segment_id?: string | null
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_vocabulary_source_segment_id_fkey"
            columns: ["source_segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_video_progress: {
        Row: {
          attempts: number | null
          created_at: string
          id: string
          last_practiced_at: string
          score: number | null
          segment_id: string
          status: string | null
          user_id: string
          user_input: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          id?: string
          last_practiced_at?: string
          score?: number | null
          segment_id: string
          status?: string | null
          user_id: string
          user_input?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          id?: string
          last_practiced_at?: string
          score?: number | null
          segment_id?: string
          status?: string | null
          user_id?: string
          user_input?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_video_progress_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      video_segments: {
        Row: {
          created_at: string
          end_time: number
          grammar_notes: Json | null
          id: string
          japanese_text: string
          segment_index: number
          start_time: number
          video_id: string
          vietnamese_text: string | null
          vocabulary: Json | null
        }
        Insert: {
          created_at?: string
          end_time: number
          grammar_notes?: Json | null
          id?: string
          japanese_text: string
          segment_index: number
          start_time: number
          video_id: string
          vietnamese_text?: string | null
          vocabulary?: Json | null
        }
        Update: {
          created_at?: string
          end_time?: number
          grammar_notes?: Json | null
          id?: string
          japanese_text?: string
          segment_index?: number
          start_time?: number
          video_id?: string
          vietnamese_text?: string | null
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "video_segments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration: number | null
          id: string
          jlpt_level: string | null
          processed: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          jlpt_level?: string | null
          processed?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          jlpt_level?: string | null
          processed?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          created_at: string
          example_sentence: string | null
          example_translation: string | null
          id: string
          jlpt_level: string | null
          kanji: string | null
          last_reviewed_at: string | null
          meaning: string
          reading: string
          review_count: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          example_sentence?: string | null
          example_translation?: string | null
          id?: string
          jlpt_level?: string | null
          kanji?: string | null
          last_reviewed_at?: string | null
          meaning: string
          reading: string
          review_count?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          example_sentence?: string | null
          example_translation?: string | null
          id?: string
          jlpt_level?: string | null
          kanji?: string | null
          last_reviewed_at?: string | null
          meaning?: string
          reading?: string
          review_count?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      word_cache: {
        Row: {
          created_at: string
          examples: Json | null
          id: string
          meaning: string
          notes: string | null
          reading: string | null
          source: string | null
          updated_at: string
          word: string
          word_type: string | null
        }
        Insert: {
          created_at?: string
          examples?: Json | null
          id?: string
          meaning: string
          notes?: string | null
          reading?: string | null
          source?: string | null
          updated_at?: string
          word: string
          word_type?: string | null
        }
        Update: {
          created_at?: string
          examples?: Json | null
          id?: string
          meaning?: string
          notes?: string | null
          reading?: string | null
          source?: string | null
          updated_at?: string
          word?: string
          word_type?: string | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
