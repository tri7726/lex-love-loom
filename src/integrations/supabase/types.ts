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
      course_modules: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          updated_at?: string | null
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
          {
            foreignKeyName: "favorite_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources_public"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          audio_url: string | null
          created_at: string | null
          ease_factor: number | null
          example_sentence: string | null
          example_translation: string | null
          hanviet: string | null
          id: string
          image_url: string | null
          interval: number | null
          jlpt_level: string | null
          last_reviewed_at: string | null
          meaning: string
          next_review_date: string | null
          notes: string | null
          reading: string | null
          repetitions: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          word: string
          word_type: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          ease_factor?: number | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          interval?: number | null
          jlpt_level?: string | null
          last_reviewed_at?: string | null
          meaning: string
          next_review_date?: string | null
          notes?: string | null
          reading?: string | null
          repetitions?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          word: string
          word_type?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          ease_factor?: number | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          interval?: number | null
          jlpt_level?: string | null
          last_reviewed_at?: string | null
          meaning?: string
          next_review_date?: string | null
          notes?: string | null
          reading?: string | null
          repetitions?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          word?: string
          word_type?: string | null
        }
        Relationships: []
      }
      kanji: {
        Row: {
          character: string
          components: string[] | null
          conversion_rules: string | null
          created_at: string | null
          frequency: number | null
          grade: number | null
          hanviet: string | null
          id: string
          jlpt_level: string | null
          kunyomi: string[] | null
          meaning_en: string | null
          meaning_vi: string
          mnemonic: string | null
          onyomi: string[] | null
          radical: string | null
          radical_id: string | null
          stroke_count: number
          stroke_order: Json | null
          svg_data: string | null
          svg_url: string | null
          updated_at: string | null
        }
        Insert: {
          character: string
          components?: string[] | null
          conversion_rules?: string | null
          created_at?: string | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string
          jlpt_level?: string | null
          kunyomi?: string[] | null
          meaning_en?: string | null
          meaning_vi: string
          mnemonic?: string | null
          onyomi?: string[] | null
          radical?: string | null
          radical_id?: string | null
          stroke_count: number
          stroke_order?: Json | null
          svg_data?: string | null
          svg_url?: string | null
          updated_at?: string | null
        }
        Update: {
          character?: string
          components?: string[] | null
          conversion_rules?: string | null
          created_at?: string | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string
          jlpt_level?: string | null
          kunyomi?: string[] | null
          meaning_en?: string | null
          meaning_vi?: string
          mnemonic?: string | null
          onyomi?: string[] | null
          radical?: string | null
          radical_id?: string | null
          stroke_count?: number
          stroke_order?: Json | null
          svg_data?: string | null
          svg_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanji_radical_id_fkey"
            columns: ["radical_id"]
            isOneToOne: false
            referencedRelation: "radicals"
            referencedColumns: ["id"]
          },
        ]
      }
      kanji_relationships: {
        Row: {
          created_at: string | null
          id: string
          kanji_id: string | null
          reason: string | null
          related_kanji_id: string | null
          relationship_type: string
          strength: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          reason?: string | null
          related_kanji_id?: string | null
          relationship_type: string
          strength?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          reason?: string | null
          related_kanji_id?: string | null
          relationship_type?: string
          strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanji_relationships_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanji_relationships_related_kanji_id_fkey"
            columns: ["related_kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
        ]
      }
      kanji_vocab_junction: {
        Row: {
          created_at: string | null
          id: string
          kanji_id: string | null
          position: number | null
          vocabulary_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          position?: number | null
          vocabulary_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          position?: number | null
          vocabulary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanji_vocab_junction_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanji_vocab_junction_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "kanji_vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanji_vocabulary: {
        Row: {
          audio_url: string | null
          created_at: string | null
          example_sentence: string | null
          example_translation: string | null
          hanviet: string | null
          id: string
          jlpt_level: string | null
          meaning_en: string | null
          meaning_vi: string
          part_of_speech: string | null
          reading: string
          updated_at: string | null
          word: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          jlpt_level?: string | null
          meaning_en?: string | null
          meaning_vi: string
          part_of_speech?: string | null
          reading: string
          updated_at?: string | null
          word: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          jlpt_level?: string | null
          meaning_en?: string | null
          meaning_vi?: string
          part_of_speech?: string | null
          reading?: string
          updated_at?: string | null
          word?: string
        }
        Relationships: []
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
          role: string | null
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
          role?: string | null
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
          role?: string | null
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
      radicals: {
        Row: {
          created_at: string | null
          id: string
          meaning_en: string | null
          meaning_vi: string | null
          name: string | null
          position: string | null
          radical: string
          stroke_count: number | null
          traditional_form: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meaning_en?: string | null
          meaning_vi?: string | null
          name?: string | null
          position?: string | null
          radical: string
          stroke_count?: number | null
          traditional_form?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meaning_en?: string | null
          meaning_vi?: string | null
          name?: string | null
          position?: string | null
          radical?: string
          stroke_count?: number | null
          traditional_form?: string | null
          updated_at?: string | null
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
      textbook_vocabulary: {
        Row: {
          created_at: string | null
          id: string
          lesson_number: number | null
          page_number: number | null
          textbook: string
          unit_title: string | null
          vocabulary_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_number?: number | null
          page_number?: number | null
          textbook: string
          unit_title?: string | null
          vocabulary_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_number?: number | null
          page_number?: number | null
          textbook?: string
          unit_title?: string | null
          vocabulary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbook_vocabulary_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "kanji_vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_kanji_progress: {
        Row: {
          created_at: string | null
          ease_factor: number | null
          id: string
          interval: number | null
          kanji_id: string | null
          last_review: string | null
          last_writing_score: number | null
          next_review: string | null
          notes: string | null
          recognition_accuracy: number | null
          recognition_correct: number | null
          recognition_total: number | null
          repetitions: number | null
          starred: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          writing_accuracy: number | null
          writing_attempts: number | null
          writing_total_score: number | null
        }
        Insert: {
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval?: number | null
          kanji_id?: string | null
          last_review?: string | null
          last_writing_score?: number | null
          next_review?: string | null
          notes?: string | null
          recognition_accuracy?: number | null
          recognition_correct?: number | null
          recognition_total?: number | null
          repetitions?: number | null
          starred?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          writing_accuracy?: number | null
          writing_attempts?: number | null
          writing_total_score?: number | null
        }
        Update: {
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval?: number | null
          kanji_id?: string | null
          last_review?: string | null
          last_writing_score?: number | null
          next_review?: string | null
          notes?: string | null
          recognition_accuracy?: number | null
          recognition_correct?: number | null
          recognition_total?: number | null
          repetitions?: number | null
          starred?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          writing_accuracy?: number | null
          writing_attempts?: number | null
          writing_total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_kanji_progress_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
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
      user_writing_sessions: {
        Row: {
          accuracy_score: number | null
          created_at: string | null
          id: string
          kanji_id: string | null
          stroke_count: number | null
          stroke_order_correct: boolean | null
          strokes_drawn: Json | null
          time_taken: number | null
          user_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          stroke_count?: number | null
          stroke_order_correct?: boolean | null
          strokes_drawn?: Json | null
          time_taken?: number | null
          user_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          kanji_id?: string | null
          stroke_count?: number | null
          stroke_order_correct?: boolean | null
          strokes_drawn?: Json | null
          time_taken?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_writing_sessions_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
        ]
      }
      video_questions: {
        Row: {
          correct_answer: number
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question_text: string
          question_type: string
          segment_id: string | null
          video_id: string
        }
        Insert: {
          correct_answer?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question_text: string
          question_type?: string
          segment_id?: string | null
          video_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          question_type?: string
          segment_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_questions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_questions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_questions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources_public"
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
          {
            foreignKeyName: "video_segments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_sources_public"
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
      vocabulary_folder_items: {
        Row: {
          added_at: string | null
          flashcard_id: string
          folder_id: string
          id: string
          order_index: number | null
        }
        Insert: {
          added_at?: string | null
          flashcard_id: string
          folder_id: string
          id?: string
          order_index?: number | null
        }
        Update: {
          added_at?: string | null
          flashcard_id?: string
          folder_id?: string
          id?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_folder_items_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          module_id: string | null
          name: string
          order_index: number | null
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          module_id?: string | null
          name: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          module_id?: string | null
          name?: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_folders_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_folders"
            referencedColumns: ["id"]
          },
        ]
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
      video_sources_public: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          id: string | null
          jlpt_level: string | null
          processed: boolean | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          youtube_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string | null
          jlpt_level?: string | null
          processed?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string | null
          jlpt_level?: string | null
          processed?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_due_flashcards_count: { Args: { user_uuid: string }; Returns: number }
      get_folder_flashcard_count: {
        Args: { folder_uuid: string }
        Returns: number
      }
      get_kanji_details: { Args: { kanji_char: string }; Returns: Json }
      update_kanji_progress: {
        Args: {
          p_kanji_id: string
          p_quality: number
          p_user_id: string
          p_writing_score?: number
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
