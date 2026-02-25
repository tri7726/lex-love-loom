export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          xp: number
          streak: number
          level: string
          last_active_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          xp?: number
          streak?: number
          level?: string
          last_active_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          xp?: number
          streak?: number
          level?: string
          last_active_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      video_sources: {
        Row: {
          id: string
          youtube_id: string
          title: string
          description: string | null
          duration: number | null
          thumbnail_url: string | null
          jlpt_level: string | null
          processed: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          youtube_id: string
          title: string
          description?: string | null
          duration?: number | null
          thumbnail_url?: string | null
          jlpt_level?: string | null
          processed?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          youtube_id?: string
          title?: string
          description?: string | null
          duration?: number | null
          thumbnail_url?: string | null
          jlpt_level?: string | null
          processed?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sources_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      video_segments: {
        Row: {
          id: string
          video_id: string
          segment_index: number
          start_time: number
          end_time: number
          japanese_text: string
          vietnamese_text: string | null
          grammar_notes: Json | null
          vocabulary: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          segment_index: number
          start_time: number
          end_time: number
          japanese_text: string
          vietnamese_text?: string | null
          grammar_notes?: Json | null
          vocabulary?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          segment_index?: number
          start_time?: number
          end_time?: number
          japanese_text?: string
          vietnamese_text?: string | null
          grammar_notes?: Json | null
          vocabulary?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_segments_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          }
        ]
      }
      video_questions: {
        Row: {
          id: string
          video_id: string
          segment_id: string | null
          question_text: string
          options: Json
          correct_answer: number
          explanation: string | null
          question_type: string
          difficulty: string | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          segment_id?: string | null
          question_text: string
          options?: Json
          correct_answer?: number
          explanation?: string | null
          question_type?: string
          difficulty?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          segment_id?: string | null
          question_text?: string
          options?: Json
          correct_answer?: number
          explanation?: string | null
          question_type?: string
          difficulty?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_questions_segment_id_fkey"
            columns: ["segment_id"]
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_questions_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_vocabulary: {
        Row: {
          id: string
          user_id: string
          word: string
          reading: string | null
          meaning: string
          example_sentence: string | null
          source_segment_id: string | null
          mastery_level: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          reading?: string | null
          meaning: string
          example_sentence?: string | null
          source_segment_id?: string | null
          mastery_level?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          reading?: string | null
          meaning?: string
          example_sentence?: string | null
          source_segment_id?: string | null
          mastery_level?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_vocabulary_source_segment_id_fkey"
            columns: ["source_segment_id"]
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_vocabulary_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          word: string
          reading: string | null
          hanviet: string | null
          meaning: string
          example_sentence: string | null
          example_translation: string | null
          audio_url: string | null
          image_url: string | null
          notes: string | null
          jlpt_level: string | null
          word_type: string | null
          tags: string[] | null
          ease_factor: number
          interval: number
          repetitions: number
          next_review_date: string
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          reading?: string | null
          hanviet?: string | null
          meaning: string
          example_sentence?: string | null
          example_translation?: string | null
          audio_url?: string | null
          image_url?: string | null
          notes?: string | null
          jlpt_level?: string | null
          word_type?: string | null
          tags?: string[] | null
          ease_factor?: number | null
          interval?: number | null
          repetitions?: number | null
          next_review_date?: string | null
          last_reviewed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          reading?: string | null
          hanviet?: string | null
          meaning?: string
          example_sentence?: string | null
          example_translation?: string | null
          audio_url?: string | null
          image_url?: string | null
          notes?: string | null
          jlpt_level?: string | null
          word_type?: string | null
          tags?: string[] | null
          ease_factor?: number
          interval?: number
          repetitions?: number
          next_review_date?: string
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      kanji: {
        Row: {
          id: string
          character: string
          onyomi: string[] | null
          kunyomi: string[] | null
          hanviet: string | null
          meaning_vi: string
          meaning_en: string | null
          jlpt_level: string | null
          grade: number | null
          frequency: number | null
          radical: string | null
          radical_id: string | null
          stroke_count: number
          components: string[] | null
          svg_data: string | null
          svg_url: string | null
          stroke_order: Json | null
          conversion_rules: string | null
          mnemonic: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character: string
          onyomi?: string[] | null
          kunyomi?: string[] | null
          hanviet?: string | null
          meaning_vi: string
          meaning_en?: string | null
          jlpt_level?: string | null
          grade?: number | null
          frequency?: number | null
          radical?: string | null
          radical_id?: string | null
          stroke_count: number
          components?: string[] | null
          svg_data?: string | null
          svg_url?: string | null
          stroke_order?: Json | null
          conversion_rules?: string | null
          mnemonic?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          character?: string
          onyomi?: string[] | null
          kunyomi?: string[] | null
          hanviet?: string | null
          meaning_vi?: string
          meaning_en?: string | null
          jlpt_level?: string | null
          grade?: number | null
          frequency?: number | null
          radical?: string | null
          radical_id?: string | null
          stroke_count?: number
          components?: string[] | null
          svg_data?: string | null
          svg_url?: string | null
          stroke_order?: Json | null
          conversion_rules?: string | null
          mnemonic?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanji_radical_id_fkey"
            columns: ["radical_id"]
            referencedRelation: "radicals"
            referencedColumns: ["id"]
          }
        ]
      }
      radicals: {
        Row: {
          id: string
          radical: string
          name: string | null
          meaning_vi: string | null
          meaning_en: string | null
          stroke_count: number | null
          traditional_form: string | null
          position: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          radical: string
          name?: string | null
          meaning_vi?: string | null
          meaning_en?: string | null
          stroke_count?: number | null
          traditional_form?: string | null
          position?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          radical?: string
          name?: string | null
          meaning_vi?: string | null
          meaning_en?: string | null
          stroke_count?: number | null
          traditional_form?: string | null
          position?: string | null
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
      get_folder_flashcard_count: {
        Args: {
          folder_uuid: string
        }
        Returns: number
      }
      get_due_flashcards_count: {
        Args: {
          user_uuid: string
        }
        Returns: number
      }
      get_kanji_details: {
        Args: {
          kanji_char: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
