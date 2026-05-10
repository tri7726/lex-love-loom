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
      abuse_alerts: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          identifier: string
          identifier_type: string
          reading_minutes: number | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          identifier: string
          identifier_type: string
          reading_minutes?: number | null
          reason: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          identifier?: string
          identifier_type?: string
          reading_minutes?: number | null
          reason?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string
          icon: string
          id: string
          title: string
          title_reward: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string
          condition_type: string
          condition_value: number
          created_at?: string | null
          description: string
          icon?: string
          id: string
          title: string
          title_reward?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          title?: string
          title_reward?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      admin_docs: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          id: string
          mime: string
          size_bytes: number | null
          slug: string
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime?: string
          size_bytes?: number | null
          slug: string
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime?: string
          size_bytes?: number | null
          slug?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          is_pinned: boolean | null
          metadata: Json | null
          mode: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          metadata?: Json | null
          mode?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          metadata?: Json | null
          mode?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analysis_history: {
        Row: {
          analysis: Json
          content: string
          created_at: string | null
          engine: string | null
          id: string
          schema_version: number
          user_id: string
        }
        Insert: {
          analysis: Json
          content: string
          created_at?: string | null
          engine?: string | null
          id?: string
          schema_version?: number
          user_id: string
        }
        Update: {
          analysis?: Json
          content?: string
          created_at?: string | null
          engine?: string | null
          id?: string
          schema_version?: number
          user_id?: string
        }
        Relationships: []
      }
      analysis_telemetry: {
        Row: {
          created_at: string
          event: string
          feature: string
          id: string
          meta: Json | null
          reading: string | null
          reason: string | null
          user_id: string | null
          word: string | null
        }
        Insert: {
          created_at?: string
          event: string
          feature: string
          id?: string
          meta?: Json | null
          reading?: string | null
          reason?: string | null
          user_id?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          feature?: string
          id?: string
          meta?: Json | null
          reading?: string | null
          reason?: string | null
          user_id?: string | null
          word?: string | null
        }
        Relationships: []
      }
      bosses: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          max_hp: number
          name: string
          reward_item_id: string | null
          reward_xp: number | null
          unlock_condition_folder_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          max_hp: number
          name: string
          reward_item_id?: string | null
          reward_xp?: number | null
          unlock_condition_folder_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          max_hp?: number
          name?: string
          reward_item_id?: string | null
          reward_xp?: number | null
          unlock_condition_folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bosses_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bosses_unlock_condition_folder_id_fkey"
            columns: ["unlock_condition_folder_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_suggestions: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          score: number
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          suggested_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          suggested_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenger_id: string | null
          challenger_score: number | null
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          opponent_id: string | null
          opponent_score: number | null
          status: string | null
          topic: string
          winner_id: string | null
        }
        Insert: {
          challenger_id?: string | null
          challenger_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          opponent_id?: string | null
          opponent_score?: number | null
          status?: string | null
          topic: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string | null
          challenger_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          opponent_id?: string | null
          opponent_score?: number | null
          status?: string | null
          topic?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      class_assignment_progress: {
        Row: {
          assignment_id: string
          class_id: string
          completed_at: string | null
          exam_result_id: string | null
          id: string
          is_completed: boolean | null
          max_score: number | null
          score: number | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          class_id: string
          completed_at?: string | null
          exam_result_id?: string | null
          id?: string
          is_completed?: boolean | null
          max_score?: number | null
          score?: number | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          class_id?: string
          completed_at?: string | null
          exam_result_id?: string | null
          id?: string
          is_completed?: boolean | null
          max_score?: number | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assignment_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignment_progress_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignment_progress_exam_result_id_fkey"
            columns: ["exam_result_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_results"
            referencedColumns: ["id"]
          },
        ]
      }
      class_assignments: {
        Row: {
          assignment_type: string
          class_id: string
          created_at: string | null
          deadline: string | null
          description: string | null
          exam_id: string | null
          id: string
          is_active: boolean | null
          teacher_id: string
          title: string
          vocab_config: Json | null
        }
        Insert: {
          assignment_type?: string
          class_id: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          exam_id?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id: string
          title: string
          vocab_config?: Json | null
        }
        Update: {
          assignment_type?: string
          class_id?: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          exam_id?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id?: string
          title?: string
          vocab_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invite_code: string
          is_active: boolean | null
          jlpt_level: string | null
          name: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean | null
          jlpt_level?: string | null
          name: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean | null
          jlpt_level?: string | null
          name?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      community_deck_cards: {
        Row: {
          deck_id: string
          example_sentence: string | null
          example_translation: string | null
          id: string
          meaning: string
          notes: string | null
          order_index: number | null
          reading: string | null
          word: string
        }
        Insert: {
          deck_id: string
          example_sentence?: string | null
          example_translation?: string | null
          id?: string
          meaning: string
          notes?: string | null
          order_index?: number | null
          reading?: string | null
          word: string
        }
        Update: {
          deck_id?: string
          example_sentence?: string | null
          example_translation?: string | null
          id?: string
          meaning?: string
          notes?: string | null
          order_index?: number | null
          reading?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "community_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_decks: {
        Row: {
          author_id: string
          created_at: string | null
          description: string | null
          downloads_count: number | null
          id: string
          is_published: boolean | null
          jlpt_level: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          upvotes_count: number | null
        }
        Insert: {
          author_id: string
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_published?: boolean | null
          jlpt_level?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          upvotes_count?: number | null
        }
        Update: {
          author_id?: string
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_published?: boolean | null
          jlpt_level?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          upvotes_count?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          user_1: string
          user_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          user_1: string
          user_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          user_1?: string
          user_2?: string
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
      curriculum_items: {
        Row: {
          content_link: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          order_index: number
          status: string | null
          title: string
          type: string
          unit_id: string
        }
        Insert: {
          content_link?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order_index: number
          status?: string | null
          title: string
          type: string
          unit_id: string
        }
        Update: {
          content_link?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number
          status?: string | null
          title?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_levels: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          title: string
          xp_required: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          xp_required?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          xp_required?: number | null
        }
        Relationships: []
      }
      curriculum_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean | null
          item_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          item_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          item_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "curriculum_items"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_units: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          level_id: string
          order_index: number
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          level_id: string
          order_index: number
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          level_id?: string
          order_index?: number
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_units_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "curriculum_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quest_progress: {
        Row: {
          is_claimed: boolean | null
          is_completed: boolean | null
          quest_date: string
          quest_id: string
          user_id: string
        }
        Insert: {
          is_claimed?: boolean | null
          is_completed?: boolean | null
          quest_date?: string
          quest_id: string
          user_id: string
        }
        Update: {
          is_claimed?: boolean | null
          is_completed?: boolean | null
          quest_date?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          created_at: string | null
          description: string
          id: string
          quest_type: string
          reward_xp: number
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          quest_type: string
          reward_xp: number
          target_value: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          quest_type?: string
          reward_xp?: number
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      deck_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          deck_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deck_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deck_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_ratings_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "public_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          category: string | null
          correct_index: number
          created_at: string | null
          exam_id: string
          explanation: string | null
          id: string
          options: Json
          order_index: number | null
          question: string
          section: string
        }
        Insert: {
          category?: string | null
          correct_index?: number
          created_at?: string | null
          exam_id: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number | null
          question: string
          section?: string
        }
        Update: {
          category?: string | null
          correct_index?: number
          created_at?: string | null
          exam_id?: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number | null
          question?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_assignments: {
        Row: {
          assigned_at: string
          experiment_key: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_key: string
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_key?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      experiment_events: {
        Row: {
          event: string
          experiment_key: string
          id: string
          ts: string
          user_id: string
          value: number | null
          variant: string
        }
        Insert: {
          event: string
          experiment_key: string
          id?: string
          ts?: string
          user_id: string
          value?: number | null
          variant: string
        }
        Update: {
          event?: string
          experiment_key?: string
          id?: string
          ts?: string
          user_id?: string
          value?: number | null
          variant?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          traffic: number
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          traffic?: number
          updated_at?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          traffic?: number
          updated_at?: string
          variants?: Json
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
          due: string | null
          ease_factor: number | null
          example_sentence: string | null
          example_translation: string | null
          hanviet: string | null
          id: string
          image_url: string | null
          interval: number | null
          jlpt_level: string | null
          lapses: number | null
          last_reviewed_at: string | null
          meaning: string
          next_review_date: string | null
          notes: string | null
          reading: string | null
          repetitions: number | null
          reps: number | null
          state: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          word: string
          word_type: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          due?: string | null
          ease_factor?: number | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          interval?: number | null
          jlpt_level?: string | null
          lapses?: number | null
          last_reviewed_at?: string | null
          meaning: string
          next_review_date?: string | null
          notes?: string | null
          reading?: string | null
          repetitions?: number | null
          reps?: number | null
          state?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          word: string
          word_type?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          due?: string | null
          ease_factor?: number | null
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          interval?: number | null
          jlpt_level?: string | null
          lapses?: number | null
          last_reviewed_at?: string | null
          meaning?: string
          next_review_date?: string | null
          notes?: string | null
          reading?: string | null
          repetitions?: number | null
          reps?: number | null
          state?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          word?: string
          word_type?: string | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          cost_coins: number
          description: string
          emoji: string
          energy_restore: number
          happiness_bonus: number
          hp_restore: number | null
          hunger_restore: number
          id: string
          is_revive: boolean | null
          name: string
          pet_xp_bonus: number
        }
        Insert: {
          cost_coins?: number
          description: string
          emoji: string
          energy_restore?: number
          happiness_bonus?: number
          hp_restore?: number | null
          hunger_restore?: number
          id: string
          is_revive?: boolean | null
          name: string
          pet_xp_bonus?: number
        }
        Update: {
          cost_coins?: number
          description?: string
          emoji?: string
          energy_restore?: number
          happiness_bonus?: number
          hp_restore?: number | null
          hunger_restore?: number
          id?: string
          is_revive?: boolean | null
          name?: string
          pet_xp_bonus?: number
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grammar_mistakes: {
        Row: {
          corrected_part: string | null
          corrected_text: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          grammar_point: string
          id: string
          mistake_type: string
          original_part: string | null
          original_text: string
          sentence_id: string | null
          user_id: string
        }
        Insert: {
          corrected_part?: string | null
          corrected_text: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          grammar_point: string
          id?: string
          mistake_type: string
          original_part?: string | null
          original_text: string
          sentence_id?: string | null
          user_id: string
        }
        Update: {
          corrected_part?: string | null
          corrected_text?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          grammar_point?: string
          id?: string
          mistake_type?: string
          original_part?: string | null
          original_text?: string
          sentence_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grammar_points: {
        Row: {
          category: string | null
          comparisons: Json | null
          created_at: string | null
          examples: Json | null
          explanation: string
          id: string
          lesson: number | null
          level: string
          pitfall: string | null
          related_ids: string[] | null
          structure: string | null
          title: string
          updated_at: string | null
          usage: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          comparisons?: Json | null
          created_at?: string | null
          examples?: Json | null
          explanation: string
          id?: string
          lesson?: number | null
          level: string
          pitfall?: string | null
          related_ids?: string[] | null
          structure?: string | null
          title: string
          updated_at?: string | null
          usage?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          comparisons?: Json | null
          created_at?: string | null
          examples?: Json | null
          explanation?: string
          id?: string
          lesson?: number | null
          level?: string
          pitfall?: string | null
          related_ids?: string[] | null
          structure?: string | null
          title?: string
          updated_at?: string | null
          usage?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      kanji: {
        Row: {
          character: string
          components: string[] | null
          created_at: string | null
          examples: Json | null
          frequency: number | null
          grade: number | null
          hanviet: string | null
          id: string
          jlpt_level: string
          kunyomi: string[] | null
          meaning: string
          meaning_vi: string | null
          onyomi: string[] | null
          radical_id: string | null
          stroke_count: number | null
          updated_at: string | null
        }
        Insert: {
          character: string
          components?: string[] | null
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string
          jlpt_level: string
          kunyomi?: string[] | null
          meaning: string
          meaning_vi?: string | null
          onyomi?: string[] | null
          radical_id?: string | null
          stroke_count?: number | null
          updated_at?: string | null
        }
        Update: {
          character?: string
          components?: string[] | null
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string
          jlpt_level?: string
          kunyomi?: string[] | null
          meaning?: string
          meaning_vi?: string | null
          onyomi?: string[] | null
          radical_id?: string | null
          stroke_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kanji_battle_scores: {
        Row: {
          created_at: string | null
          difficulty: string
          id: string
          kanji_count: number | null
          max_combo: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty: string
          id?: string
          kanji_count?: number | null
          max_combo?: number
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty?: string
          id?: string
          kanji_count?: number | null
          max_combo?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      kanji_radicals: {
        Row: {
          character: string
          created_at: string | null
          id: string
          meaning: string
          reading: string
          strokes: number
        }
        Insert: {
          character: string
          created_at?: string | null
          id?: string
          meaning: string
          reading: string
          strokes: number
        }
        Update: {
          character?: string
          created_at?: string | null
          id?: string
          meaning?: string
          reading?: string
          strokes?: number
        }
        Relationships: []
      }
      kanji_relationships: {
        Row: {
          child_kanji_id: string | null
          description: string | null
          id: string
          parent_kanji_id: string | null
          relationship_type: string
        }
        Insert: {
          child_kanji_id?: string | null
          description?: string | null
          id?: string
          parent_kanji_id?: string | null
          relationship_type: string
        }
        Update: {
          child_kanji_id?: string | null
          description?: string | null
          id?: string
          parent_kanji_id?: string | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanji_relationships_child_kanji_id_fkey"
            columns: ["child_kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanji_relationships_child_kanji_id_fkey"
            columns: ["child_kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanji_relationships_parent_kanji_id_fkey"
            columns: ["parent_kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanji_relationships_parent_kanji_id_fkey"
            columns: ["parent_kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji_details"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          created_at: string | null
          date: string
          id: string
          listening_minutes: number | null
          reading_minutes: number | null
          speaking_minutes: number | null
          updated_at: string | null
          user_id: string
          words_learned: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          listening_minutes?: number | null
          reading_minutes?: number | null
          speaking_minutes?: number | null
          updated_at?: string | null
          user_id: string
          words_learned?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          listening_minutes?: number | null
          reading_minutes?: number | null
          speaking_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          words_learned?: number | null
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          answers: Json | null
          completed_at: string | null
          last_slide_index: number | null
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          last_slide_index?: number | null
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          last_slide_index?: number | null
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_slides: {
        Row: {
          body: string | null
          correct_index: number | null
          created_at: string | null
          explanation: string | null
          id: string
          image_caption: string | null
          image_url: string | null
          lesson_id: string
          options: Json | null
          order_index: number
          question_text: string | null
          settings: Json | null
          slide_type: string
          title: string | null
        }
        Insert: {
          body?: string | null
          correct_index?: number | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_caption?: string | null
          image_url?: string | null
          lesson_id: string
          options?: Json | null
          order_index?: number
          question_text?: string | null
          settings?: Json | null
          slide_type?: string
          title?: string | null
        }
        Update: {
          body?: string | null
          correct_index?: number | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_caption?: string | null
          image_url?: string | null
          lesson_id?: string
          options?: Json | null
          order_index?: number
          question_text?: string | null
          settings?: Json | null
          slide_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_slides_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          status: Database["public"]["Enums"]["lesson_status"] | null
          teacher_id: string
          title: string
          type: Database["public"]["Enums"]["lesson_type"] | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          teacher_id: string
          title: string
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          teacher_id?: string
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_exercises: {
        Row: {
          audio_url: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          jlpt_level: string | null
          source: string | null
          title: string
          transcript: string
          translation: string | null
          type: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          jlpt_level?: string | null
          source?: string | null
          title: string
          transcript: string
          translation?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          jlpt_level?: string | null
          source?: string | null
          title?: string
          transcript?: string
          translation?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          class_id: string
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          meeting_link: string
          platform: string | null
          start_time: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          meeting_link: string
          platform?: string | null
          start_time: string
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          meeting_link?: string
          platform?: string | null
          start_time?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
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
      minna_lessons: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          jlpt_level: string | null
          lesson_number: number
          order_index: number | null
          textbook: string
          title_jp: string
          title_vi: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          jlpt_level?: string | null
          lesson_number: number
          order_index?: number | null
          textbook?: string
          title_jp: string
          title_vi: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          jlpt_level?: string | null
          lesson_number?: number
          order_index?: number | null
          textbook?: string
          title_jp?: string
          title_vi?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      minna_vocabulary: {
        Row: {
          audio_url: string | null
          created_at: string
          example_en: string | null
          example_jp: string | null
          example_vi: string | null
          hanviet: string | null
          id: string
          image_url: string | null
          jlpt_level: string | null
          kana: string
          kanji: string | null
          lesson_id: string | null
          lesson_number: number
          meaning_en: string | null
          meaning_vi: string
          notes: string | null
          order_index: number | null
          part_of_speech: string | null
          romaji: string | null
          tags: string[] | null
          textbook: string
          updated_at: string
          word: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          example_en?: string | null
          example_jp?: string | null
          example_vi?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          jlpt_level?: string | null
          kana: string
          kanji?: string | null
          lesson_id?: string | null
          lesson_number: number
          meaning_en?: string | null
          meaning_vi: string
          notes?: string | null
          order_index?: number | null
          part_of_speech?: string | null
          romaji?: string | null
          tags?: string[] | null
          textbook?: string
          updated_at?: string
          word: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          example_en?: string | null
          example_jp?: string | null
          example_vi?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          jlpt_level?: string | null
          kana?: string
          kanji?: string | null
          lesson_id?: string | null
          lesson_number?: number
          meaning_en?: string | null
          meaning_vi?: string
          notes?: string | null
          order_index?: number | null
          part_of_speech?: string | null
          romaji?: string | null
          tags?: string[] | null
          textbook?: string
          updated_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "minna_vocabulary_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "minna_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_questions: {
        Row: {
          audio_url: string | null
          correct: number
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          image_url: string | null
          options: Json
          order_index: number | null
          passage: string | null
          point_weight: number | null
          question: string
          section: string
          section_type: string | null
        }
        Insert: {
          audio_url?: string | null
          correct?: number
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number | null
          passage?: string | null
          point_weight?: number | null
          question: string
          section?: string
          section_type?: string | null
        }
        Update: {
          audio_url?: string | null
          correct?: number
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number | null
          passage?: string | null
          point_weight?: number | null
          question?: string
          section?: string
          section_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_results: {
        Row: {
          answers: Json | null
          category_scores: Json | null
          completed_at: string | null
          created_at: string | null
          exam_id: string
          id: string
          level: string | null
          max_score: number | null
          score: number
          time_taken: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          created_at?: string | null
          exam_id: string
          id?: string
          level?: string | null
          max_score?: number | null
          score?: number
          time_taken?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          created_at?: string | null
          exam_id?: string
          id?: string
          level?: string | null
          max_score?: number | null
          score?: number
          time_taken?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration: number
          id: string
          is_published: boolean | null
          level: string
          passing_total: number | null
          section_benchmarks: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number
          id?: string
          is_published?: boolean | null
          level?: string
          passing_total?: number | null
          section_benchmarks?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number
          id?: string
          is_published?: boolean | null
          level?: string
          passing_total?: number | null
          section_benchmarks?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_action_cooldowns: {
        Row: {
          action_type: string
          id: string
          last_action_at: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          id?: string
          last_action_at?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          id?: string
          last_action_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pet_adventure_areas: {
        Row: {
          base_coin_reward: number | null
          base_xp_reward: number | null
          description: string | null
          duration_minutes: number | null
          emoji: string | null
          energy_cost: number | null
          id: string
          image_url: string | null
          level_req: number | null
          name: string
          possible_loot: Json | null
        }
        Insert: {
          base_coin_reward?: number | null
          base_xp_reward?: number | null
          description?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          energy_cost?: number | null
          id?: string
          image_url?: string | null
          level_req?: number | null
          name: string
          possible_loot?: Json | null
        }
        Update: {
          base_coin_reward?: number | null
          base_xp_reward?: number | null
          description?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          energy_cost?: number | null
          id?: string
          image_url?: string | null
          level_req?: number | null
          name?: string
          possible_loot?: Json | null
        }
        Relationships: []
      }
      pet_evolution_config: {
        Row: {
          emoji: string
          evolution_level: number
          form_name: string
          id: string
          pet_type: string
          xp_required: number
        }
        Insert: {
          emoji: string
          evolution_level: number
          form_name: string
          id?: string
          pet_type: string
          xp_required: number
        }
        Update: {
          emoji?: string
          evolution_level?: number
          form_name?: string
          id?: string
          pet_type?: string
          xp_required?: number
        }
        Relationships: []
      }
      pet_expeditions: {
        Row: {
          area_id: string | null
          ends_at: string | null
          id: string
          loot_obtained: Json | null
          started_at: string | null
          status: string | null
          user_id: string | null
          xp_gained: number | null
        }
        Insert: {
          area_id?: string | null
          ends_at?: string | null
          id?: string
          loot_obtained?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          xp_gained?: number | null
        }
        Update: {
          area_id?: string | null
          ends_at?: string | null
          id?: string
          loot_obtained?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          xp_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_expeditions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "pet_adventure_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_gear: {
        Row: {
          def_bonus: number | null
          description: string | null
          emoji: string | null
          hp_bonus: number | null
          id: string
          image_url: string | null
          int_bonus: number | null
          luk_bonus: number | null
          name: string
          str_bonus: number | null
          type: string
        }
        Insert: {
          def_bonus?: number | null
          description?: string | null
          emoji?: string | null
          hp_bonus?: number | null
          id: string
          image_url?: string | null
          int_bonus?: number | null
          luk_bonus?: number | null
          name: string
          str_bonus?: number | null
          type: string
        }
        Update: {
          def_bonus?: number | null
          description?: string | null
          emoji?: string | null
          hp_bonus?: number | null
          id?: string
          image_url?: string | null
          int_bonus?: number | null
          luk_bonus?: number | null
          name?: string
          str_bonus?: number | null
          type?: string
        }
        Relationships: []
      }
      pet_history: {
        Row: {
          created_at: string | null
          ended_at: string | null
          evolution_level: number | null
          id: string
          max_pet_xp: number | null
          pet_name: string | null
          pet_type: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          evolution_level?: number | null
          id?: string
          max_pet_xp?: number | null
          pet_name?: string | null
          pet_type: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          evolution_level?: number | null
          id?: string
          max_pet_xp?: number | null
          pet_name?: string | null
          pet_type?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pet_inventory: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_materials: {
        Row: {
          description: string | null
          emoji: string | null
          id: string
          name: string
          rarity: string | null
        }
        Insert: {
          description?: string | null
          emoji?: string | null
          id: string
          name: string
          rarity?: string | null
        }
        Update: {
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          rarity?: string | null
        }
        Relationships: []
      }
      pet_monsters: {
        Row: {
          attack: number
          coin_reward: number | null
          defense: number
          description: string | null
          element: string | null
          emoji: string | null
          hp: number
          id: string
          image_url: string | null
          level: number
          loot_table: Json | null
          name: string
          xp_reward: number | null
        }
        Insert: {
          attack?: number
          coin_reward?: number | null
          defense?: number
          description?: string | null
          element?: string | null
          emoji?: string | null
          hp?: number
          id?: string
          image_url?: string | null
          level?: number
          loot_table?: Json | null
          name: string
          xp_reward?: number | null
        }
        Update: {
          attack?: number
          coin_reward?: number | null
          defense?: number
          description?: string | null
          element?: string | null
          emoji?: string | null
          hp?: number
          id?: string
          image_url?: string | null
          level?: number
          loot_table?: Json | null
          name?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      pet_recipes: {
        Row: {
          cost_coins: number | null
          craft_coins_cost: number
          description: string
          emoji: string
          id: string
          ingredients: Json
          name: string
          output_gear_id: string | null
          result_item_id: string | null
          special_effect: string | null
        }
        Insert: {
          cost_coins?: number | null
          craft_coins_cost?: number
          description: string
          emoji: string
          id: string
          ingredients: Json
          name: string
          output_gear_id?: string | null
          result_item_id?: string | null
          special_effect?: string | null
        }
        Update: {
          cost_coins?: number | null
          craft_coins_cost?: number
          description?: string
          emoji?: string
          id?: string
          ingredients?: Json
          name?: string
          output_gear_id?: string | null
          result_item_id?: string | null
          special_effect?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_recipes_output_gear_id_fkey"
            columns: ["output_gear_id"]
            isOneToOne: false
            referencedRelation: "pet_gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_recipes_result_item_id_fkey"
            columns: ["result_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_shop_items: {
        Row: {
          category: string | null
          description: string | null
          effect_value: number | null
          id: string
          image_url: string | null
          name: string
          price: number
          type: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          effect_value?: number | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          type: string
        }
        Update: {
          category?: string | null
          description?: string | null
          effect_value?: number | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          type?: string
        }
        Relationships: []
      }
      pet_tickle_stats: {
        Row: {
          daily_xp_count: number
          last_reset_at: string
          last_tickle_at: string
          user_id: string
        }
        Insert: {
          daily_xp_count?: number
          last_reset_at?: string
          last_tickle_at?: string
          user_id: string
        }
        Update: {
          daily_xp_count?: number
          last_reset_at?: string
          last_tickle_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pitch_accent_overrides: {
        Row: {
          alternates: number[] | null
          created_at: string
          created_by: string | null
          downstep: number
          id: string
          note: string | null
          reading: string
          updated_at: string
          word: string
        }
        Insert: {
          alternates?: number[] | null
          created_at?: string
          created_by?: string | null
          downstep: number
          id?: string
          note?: string | null
          reading: string
          updated_at?: string
          word: string
        }
        Update: {
          alternates?: number[] | null
          created_at?: string
          created_by?: string | null
          downstep?: number
          id?: string
          note?: string | null
          reading?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_title: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          current_streak: number
          daily_goal_minutes: number | null
          daily_minutes_target: number | null
          daily_xp_earned: number
          display_name: string | null
          full_name: string | null
          furigana_mode: string | null
          id: string
          is_private: boolean | null
          is_public: boolean
          jlpt_level: string | null
          last_activity_date: string | null
          last_xp_reset: string
          learning_goal: string | null
          location: string | null
          longest_streak: number
          looking_for_buddy: boolean
          onboarded: boolean
          pet_coins: number | null
          preferences: Json | null
          role: Database["public"]["Enums"]["app_role"] | null
          social_links: Json | null
          target_jlpt_level: string | null
          timezone: string | null
          total_xp: number
          updated_at: string | null
          user_id: string
          username: string | null
          website: string | null
          weekly_xp: number
        }
        Insert: {
          active_title?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number
          daily_goal_minutes?: number | null
          daily_minutes_target?: number | null
          daily_xp_earned?: number
          display_name?: string | null
          full_name?: string | null
          furigana_mode?: string | null
          id: string
          is_private?: boolean | null
          is_public?: boolean
          jlpt_level?: string | null
          last_activity_date?: string | null
          last_xp_reset?: string
          learning_goal?: string | null
          location?: string | null
          longest_streak?: number
          looking_for_buddy?: boolean
          onboarded?: boolean
          pet_coins?: number | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          social_links?: Json | null
          target_jlpt_level?: string | null
          timezone?: string | null
          total_xp?: number
          updated_at?: string | null
          user_id: string
          username?: string | null
          website?: string | null
          weekly_xp?: number
        }
        Update: {
          active_title?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number
          daily_goal_minutes?: number | null
          daily_minutes_target?: number | null
          daily_xp_earned?: number
          display_name?: string | null
          full_name?: string | null
          furigana_mode?: string | null
          id?: string
          is_private?: boolean | null
          is_public?: boolean
          jlpt_level?: string | null
          last_activity_date?: string | null
          last_xp_reset?: string
          learning_goal?: string | null
          location?: string | null
          longest_streak?: number
          looking_for_buddy?: boolean
          onboarded?: boolean
          pet_coins?: number | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          social_links?: Json | null
          target_jlpt_level?: string | null
          timezone?: string | null
          total_xp?: number
          updated_at?: string | null
          user_id?: string
          username?: string | null
          website?: string | null
          weekly_xp?: number
        }
        Relationships: []
      }
      pronunciation_results: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          original_text: string
          recognized_text: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          original_text: string
          recognized_text?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          original_text?: string
          recognized_text?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      public_deck_items: {
        Row: {
          audio_url: string | null
          deck_id: string
          example_sentence: string | null
          example_translation: string | null
          hanviet: string | null
          id: string
          image_url: string | null
          jlpt_level: string | null
          meaning: string | null
          notes: string | null
          reading: string | null
          tags: string[] | null
          word: string
          word_type: string | null
        }
        Insert: {
          audio_url?: string | null
          deck_id: string
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          jlpt_level?: string | null
          meaning?: string | null
          notes?: string | null
          reading?: string | null
          tags?: string[] | null
          word: string
          word_type?: string | null
        }
        Update: {
          audio_url?: string | null
          deck_id?: string
          example_sentence?: string | null
          example_translation?: string | null
          hanviet?: string | null
          id?: string
          image_url?: string | null
          jlpt_level?: string | null
          meaning?: string | null
          notes?: string | null
          reading?: string | null
          tags?: string[] | null
          word?: string
          word_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_deck_items_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "public_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      public_decks: {
        Row: {
          avg_rating: number | null
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_premium: boolean | null
          original_deck_id: string | null
          price_xp: number | null
          tags: string[] | null
          title: string
          total_clones: number | null
        }
        Insert: {
          avg_rating?: number | null
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          original_deck_id?: string | null
          price_xp?: number | null
          tags?: string[] | null
          title: string
          total_clones?: number | null
        }
        Update: {
          avg_rating?: number | null
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          original_deck_id?: string | null
          price_xp?: number | null
          tags?: string[] | null
          title?: string
          total_clones?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          count: number | null
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          count?: number | null
          endpoint: string
          id?: string
          identifier: string
          identifier_type: string
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          count?: number | null
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          window_start?: string | null
        }
        Relationships: []
      }
      reader_articles: {
        Row: {
          content: string
          created_at: string
          id: string
          source_domain: string | null
          title: string
          url: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          source_domain?: string | null
          title: string
          url?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          source_domain?: string | null
          title?: string
          url?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      reading_passages: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          furigana_content: string | null
          grammar: Json | null
          id: string
          image_url: string | null
          level: string
          questions: Json | null
          title: string
          topic: string | null
          translation: string | null
          updated_at: string | null
          user_id: string | null
          vocabulary: Json | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          furigana_content?: string | null
          grammar?: Json | null
          id?: string
          image_url?: string | null
          level?: string
          questions?: Json | null
          title: string
          topic?: string | null
          translation?: string | null
          updated_at?: string | null
          user_id?: string | null
          vocabulary?: Json | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          furigana_content?: string | null
          grammar?: Json | null
          id?: string
          image_url?: string | null
          level?: string
          questions?: Json | null
          title?: string
          topic?: string | null
          translation?: string | null
          updated_at?: string | null
          user_id?: string | null
          vocabulary?: Json | null
        }
        Relationships: []
      }
      roleplay_scenarios: {
        Row: {
          created_at: string | null
          description: string | null
          goals: Json
          id: string
          level: string
          personas: Json
          setting: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          goals?: Json
          id?: string
          level?: string
          personas?: Json
          setting: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          goals?: Json
          id?: string
          level?: string
          personas?: Json
          setting?: string
          title?: string
        }
        Relationships: []
      }
      saved_sentences: {
        Row: {
          created_at: string | null
          id: string
          japanese: string
          japanese_text: string | null
          meaning: string
          notes: string | null
          reading: string | null
          segment_id: string | null
          source_id: string | null
          source_type: string | null
          tags: string[] | null
          user_id: string
          video_id: string | null
          vietnamese_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          japanese: string
          japanese_text?: string | null
          meaning: string
          notes?: string | null
          reading?: string | null
          segment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          user_id: string
          video_id?: string | null
          vietnamese_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          japanese?: string
          japanese_text?: string | null
          meaning?: string
          notes?: string | null
          reading?: string | null
          segment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          user_id?: string
          video_id?: string | null
          vietnamese_text?: string | null
        }
        Relationships: []
      }
      saved_vocabulary: {
        Row: {
          created_at: string | null
          example_sentence: string | null
          id: string
          mastery_level: number | null
          meaning: string
          reading: string | null
          updated_at: string | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string | null
          example_sentence?: string | null
          id?: string
          mastery_level?: number | null
          meaning: string
          reading?: string | null
          updated_at?: string | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string | null
          example_sentence?: string | null
          id?: string
          mastery_level?: number | null
          meaning?: string
          reading?: string | null
          updated_at?: string | null
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      sensei_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          jlpt_level: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          jlpt_level?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          jlpt_level?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shadowing_practices: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          level: string
          speed: number | null
          title: string
          transcript: string
          translation: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          level?: string
          speed?: number | null
          title: string
          transcript: string
          translation?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          level?: string
          speed?: number | null
          title?: string
          transcript?: string
          translation?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          item_type: string
          name: string
          price_coins: number
          price_xp: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          item_type: string
          name: string
          price_coins?: number
          price_xp?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          item_type?: string
          name?: string
          price_coins?: number
          price_xp?: number
        }
        Relationships: []
      }
      speaking_lessons: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          jlpt_level: string | null
          title: string
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          jlpt_level?: string | null
          title: string
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          jlpt_level?: string | null
          title?: string
        }
        Relationships: []
      }
      squad_goals: {
        Row: {
          created_at: string | null
          current_value: number
          description: string | null
          expires_at: string
          id: string
          reward_xp: number
          squad_id: string
          status: string | null
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          description?: string | null
          expires_at: string
          id?: string
          reward_xp?: number
          squad_id: string
          status?: string | null
          target_value?: number
          title: string
        }
        Update: {
          created_at?: string | null
          current_value?: number
          description?: string | null
          expires_at?: string
          id?: string
          reward_xp?: number
          squad_id?: string
          status?: string | null
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_goals_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "study_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          squad_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          squad_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          squad_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "study_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          squad_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          squad_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_messages_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "study_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      study_squads: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          total_xp: number | null
          updated_at: string | null
          weekly_xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          weekly_xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          weekly_xp?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          type: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          type: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          type?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      user_boss_progress: {
        Row: {
          attempts: number | null
          boss_id: string
          current_hp: number
          id: string
          is_defeated: boolean | null
          last_attack_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          boss_id: string
          current_hp: number
          id?: string
          is_defeated?: boolean | null
          last_attack_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          boss_id?: string
          current_hp?: number
          id?: string
          is_defeated?: boolean | null
          last_attack_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boss_progress_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_evolved_skills: {
        Row: {
          challenge_data: Json
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          jlpt_level: string | null
          last_reviewed_at: string | null
          status: string
          title: string
          type: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          challenge_data?: Json
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          jlpt_level?: string | null
          last_reviewed_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          challenge_data?: Json
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          jlpt_level?: string | null
          last_reviewed_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_grammar_progress: {
        Row: {
          grammar_id: string | null
          id: string
          last_practiced_at: string | null
          mastery_score: number | null
          user_id: string | null
        }
        Insert: {
          grammar_id?: string | null
          id?: string
          last_practiced_at?: string | null
          mastery_score?: number | null
          user_id?: string | null
        }
        Update: {
          grammar_id?: string | null
          id?: string
          last_practiced_at?: string | null
          mastery_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_grammar_progress_grammar_id_fkey"
            columns: ["grammar_id"]
            isOneToOne: false
            referencedRelation: "grammar_points"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          id: string
          item_id: string
          purchased_at: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string | null
          quantity?: number
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_kanji_progress: {
        Row: {
          consecutive_correct: number | null
          created_at: string | null
          ease_factor: number | null
          id: string
          interval: number | null
          kanji_id: string | null
          last_review: string | null
          next_review: string | null
          repetitions: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          consecutive_correct?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval?: number | null
          kanji_id?: string | null
          last_review?: string | null
          next_review?: string | null
          repetitions?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          consecutive_correct?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval?: number | null
          kanji_id?: string | null
          last_review?: string | null
          next_review?: string | null
          repetitions?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_kanji_progress_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_kanji_progress_kanji_id_fkey"
            columns: ["kanji_id"]
            isOneToOne: false
            referencedRelation: "kanji_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_listening_attempts: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          mistakes: Json
          mode: string
          playback_rate: number | null
          score: number
          user_id: string
          user_input: string | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          mistakes?: Json
          mode: string
          playback_rate?: number | null
          score?: number
          user_id: string
          user_input?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          mistakes?: Json
          mode?: string
          playback_rate?: number | null
          score?: number
          user_id?: string
          user_input?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_listening_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "listening_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pet_gear: {
        Row: {
          gear_id: string
          is_equipped: boolean | null
          quantity: number | null
          user_id: string
        }
        Insert: {
          gear_id: string
          is_equipped?: boolean | null
          quantity?: number | null
          user_id: string
        }
        Update: {
          gear_id?: string
          is_equipped?: boolean | null
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pet_gear_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "pet_gear"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pet_inventory: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          quantity: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pet_shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pet_materials: {
        Row: {
          material_id: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          material_id: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          material_id?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pet_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "pet_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pets: {
        Row: {
          active_buffs: Json | null
          attribute_points: number
          created_at: string
          def: number
          energy: number
          evolution_level: number
          happiness: number
          hp: number
          hunger: number
          id: string
          int: number
          last_fed_at: string | null
          last_interaction_at: string | null
          luk: number
          max_hp: number
          pet_name: string | null
          pet_type: string
          pet_xp: number
          status: string | null
          str: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_buffs?: Json | null
          attribute_points?: number
          created_at?: string
          def?: number
          energy?: number
          evolution_level?: number
          happiness?: number
          hp?: number
          hunger?: number
          id?: string
          int?: number
          last_fed_at?: string | null
          last_interaction_at?: string | null
          luk?: number
          max_hp?: number
          pet_name?: string | null
          pet_type?: string
          pet_xp?: number
          status?: string | null
          str?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_buffs?: Json | null
          attribute_points?: number
          created_at?: string
          def?: number
          energy?: number
          evolution_level?: number
          happiness?: number
          hp?: number
          hunger?: number
          id?: string
          int?: number
          last_fed_at?: string | null
          last_interaction_at?: string | null
          luk?: number
          max_hp?: number
          pet_name?: string | null
          pet_type?: string
          pet_xp?: number
          status?: string | null
          str?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quests: {
        Row: {
          completed_at: string | null
          current_value: number | null
          id: string
          is_completed: boolean | null
          last_reset_at: string | null
          quest_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          last_reset_at?: string | null
          quest_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          last_reset_at?: string | null
          quest_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reading_progress: {
        Row: {
          id: string
          is_completed: boolean | null
          last_read_at: string | null
          passage_id: string | null
          quiz_score: number | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          passage_id?: string | null
          quiz_score?: number | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          passage_id?: string | null
          quiz_score?: number | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reading_progress_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          push_auth: string | null
          push_enabled: boolean | null
          push_endpoint: string | null
          push_p256dh: string | null
          push_reminder_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          push_auth?: string | null
          push_enabled?: boolean | null
          push_endpoint?: string | null
          push_p256dh?: string | null
          push_reminder_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          push_auth?: string | null
          push_enabled?: boolean | null
          push_endpoint?: string | null
          push_p256dh?: string | null
          push_reminder_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_shadowing_progress: {
        Row: {
          attempts_count: number | null
          best_score: number | null
          id: string
          last_practiced_at: string | null
          practice_id: string
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          best_score?: number | null
          id?: string
          last_practiced_at?: string | null
          practice_id: string
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          best_score?: number | null
          id?: string
          last_practiced_at?: string | null
          practice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shadowing_progress_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "shadowing_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_metrics: {
        Row: {
          category: string
          last_updated: string | null
          total_correct: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          category: string
          last_updated?: string | null
          total_correct?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          category?: string
          last_updated?: string | null
          total_correct?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
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
      user_vocabulary_progress: {
        Row: {
          correct_count: number
          created_at: string
          ease_factor: number
          id: string
          incorrect_count: number
          interval_days: number
          is_starred: boolean
          last_reviewed_at: string | null
          mastery_level: number
          next_review_at: string
          repetitions: number
          updated_at: string
          user_id: string
          vocabulary_id: string
          xp_earned: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          ease_factor?: number
          id?: string
          incorrect_count?: number
          interval_days?: number
          is_starred?: boolean
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_at?: string
          repetitions?: number
          updated_at?: string
          user_id: string
          vocabulary_id: string
          xp_earned?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          ease_factor?: number
          id?: string
          incorrect_count?: number
          interval_days?: number
          is_starred?: boolean
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_at?: string
          repetitions?: number
          updated_at?: string
          user_id?: string
          vocabulary_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_vocabulary_progress_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "minna_vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_weakness_patterns: {
        Row: {
          category: string
          created_at: string
          evidence: Json
          id: string
          jlpt_level: string | null
          label: string
          last_seen_at: string
          pattern_key: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          evidence?: Json
          id?: string
          jlpt_level?: string | null
          label: string
          last_seen_at?: string
          pattern_key: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          evidence?: Json
          id?: string
          jlpt_level?: string | null
          label?: string
          last_seen_at?: string
          pattern_key?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: string | null
          video_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type?: string | null
          video_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string | null
          video_id?: string
        }
        Relationships: []
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
          clone_count: number | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          jlpt_level: string | null
          language: string | null
          module_id: string | null
          name: string
          order_index: number | null
          parent_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clone_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          jlpt_level?: string | null
          language?: string | null
          module_id?: string | null
          name: string
          order_index?: number | null
          parent_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clone_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          jlpt_level?: string | null
          language?: string | null
          module_id?: string | null
          name?: string
          order_index?: number | null
          parent_id?: string | null
          tags?: string[] | null
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
      xp_events: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_telemetry_top_misses: {
        Row: {
          feature: string | null
          last_seen_at: string | null
          miss_count: number | null
          reading: string | null
          reason: string | null
          word: string | null
        }
        Relationships: []
      }
      kanji_details: {
        Row: {
          character: string | null
          created_at: string | null
          examples: Json | null
          frequency: number | null
          grade: number | null
          hanviet: string | null
          id: string | null
          jlpt: number | null
          kun_reading: string | null
          meaning: string | null
          meaning_vi: string | null
          on_reading: string | null
          stroke_count: number | null
          updated_at: string | null
        }
        Insert: {
          character?: string | null
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string | null
          jlpt?: never
          kun_reading?: never
          meaning?: string | null
          meaning_vi?: string | null
          on_reading?: never
          stroke_count?: number | null
          updated_at?: string | null
        }
        Update: {
          character?: string | null
          created_at?: string | null
          examples?: Json | null
          frequency?: number | null
          grade?: number | null
          hanviet?: string | null
          id?: string | null
          jlpt?: never
          kun_reading?: never
          meaning?: string | null
          meaning_vi?: string | null
          on_reading?: never
          stroke_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_public_profile: {
        Row: {
          active_title: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          current_streak: number | null
          display_name: string | null
          jlpt_level: string | null
          longest_streak: number | null
          total_xp: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          active_title?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          jlpt_level?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          active_title?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          jlpt_level?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      v_user_mastery_matrix: {
        Row: {
          attempted: number | null
          category: string | null
          level: string | null
          mastered: number | null
          user_id: string | null
        }
        Relationships: []
      }
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
      assign_experiment_variant: { Args: { p_key: string }; Returns: string }
      attack_boss: {
        Args: { p_boss_id: string; p_damage?: number; p_is_correct?: boolean }
        Returns: Json
      }
      bathe_pet: { Args: never; Returns: Json }
      block_identifier: {
        Args: {
          p_duration: string
          p_endpoint: string
          p_id: string
          p_type: string
        }
        Returns: undefined
      }
      buy_food_item: { Args: { p_item_id: string }; Returns: Json }
      calculate_pet_total_stats: { Args: { p_user_id: string }; Returns: Json }
      check_achievements: {
        Args: { p_event?: string; p_user_id: string }
        Returns: undefined
      }
      check_and_apply_streak_protection: { Args: never; Returns: Json }
      check_pet_cooldown: {
        Args: { p_action?: string; p_interval?: string }
        Returns: undefined
      }
      claim_expedition_rewards: {
        Args: { p_expedition_id: string }
        Returns: Json
      }
      clone_public_deck: { Args: { p_public_id: string }; Returns: string }
      craft_item: { Args: { p_recipe_id: string }; Returns: Json }
      craft_pet_gear: { Args: { p_gear_id: string }; Returns: Json }
      create_pet: { Args: { p_pet_type?: string }; Returns: Json }
      decay_weakness_score: {
        Args: { _delta?: number; _pattern_key: string }
        Returns: undefined
      }
      earn_xp: {
        Args: { p_amount: number; p_metadata?: Json; p_source: string }
        Returns: undefined
      }
      equip_pet_gear: { Args: { p_gear_id: string }; Returns: Json }
      feed_pet: { Args: never; Returns: Json }
      find_buddy_matches: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          current_streak: number
          daily_minutes_target: number
          display_name: string
          jlpt_level: string
          learning_goal: string
          match_score: number
          timezone: string
          total_xp: number
          user_id: string
          username: string
        }[]
      }
      generate_weakness_quest: {
        Args: { p_category: string; p_level?: string; p_limit?: number }
        Returns: Json
      }
      get_adaptive_review_queue: {
        Args: { _limit?: number }
        Returns: {
          injected_reason: string
          item_id: string
          jlpt_level: string
          meaning: string
          pattern_key: string
          reading: string
          source: string
          word: string
        }[]
      }
      get_class_skill_analytics: {
        Args: { p_class_id: string }
        Returns: {
          display_name: string
          skills: Json
          user_id: string
        }[]
      }
      get_class_student_progress: {
        Args: { p_class_id: string }
        Returns: {
          avatar_url: string
          avg_score: number
          current_streak: number
          display_name: string
          exams_done: number
          total_xp: number
          user_id: string
          weekly_xp: number
        }[]
      }
      get_community_decks: {
        Args: never
        Returns: {
          card_count: number
          clone_count: number
          created_at: string
          description: string
          id: string
          name: string
          owner_name: string
        }[]
      }
      get_due_flashcards_count: { Args: { _user_id: string }; Returns: number }
      get_experiment_funnel: {
        Args: { p_key: string }
        Returns: {
          count: number
          event: string
          variant: string
        }[]
      }
      get_folder_flashcard_count: {
        Args: { folder_uuid: string }
        Returns: number
      }
      get_folder_flashcards: {
        Args: { folder_uuid: string }
        Returns: {
          audio_url: string
          example_sentence: string
          example_translation: string
          hanviet: string
          id: string
          image_url: string
          jlpt_level: string
          meaning: string
          notes: string
          reading: string
          tags: string[]
          word: string
          word_type: string
        }[]
      }
      get_global_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          current_streak: number
          display_name: string
          jlpt_level: string
          total_xp: number
          user_id: string
        }[]
      }
      get_inventory: { Args: never; Returns: Json }
      get_kanji_battle_leaderboard: {
        Args: { p_period?: string }
        Returns: {
          avatar_url: string
          display_name: string
          max_score: number
          user_id: string
        }[]
      }
      get_pet: { Args: never; Returns: Json }
      get_pet_level_from_xp: { Args: { p_xp: number }; Returns: number }
      get_pet_level_requirement: { Args: { p_level: number }; Returns: number }
      get_recommended_reading:
        | {
            Args: { p_limit?: number }
            Returns: {
              learning_count: number
              level: string
              mastered_count: number
              match_percentage: number
              passage_id: string
              title: string
            }[]
          }
        | {
            Args: { p_limit?: number; p_user_id: string }
            Returns: {
              category: string
              learning_count: number
              level: string
              mastered_count: number
              match_percentage: number
              passage_id: string
              title: string
            }[]
          }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      increment_rate_limit: {
        Args: {
          p_endpoint: string
          p_id: string
          p_tier?: string
          p_type: string
        }
        Returns: number
      }
      is_classroom_teacher: {
        Args: { p_class_id: string; p_user_id: string }
        Returns: boolean
      }
      join_class_by_code: { Args: { p_code: string }; Returns: Json }
      log_experiment_event: {
        Args: { p_event: string; p_key: string; p_value?: number }
        Returns: undefined
      }
      match_sensei_knowledge: {
        Args: {
          match_count: number
          match_threshold: number
          p_category?: string
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          jlpt_level: string
          similarity: number
          tags: string[]
          title: string
        }[]
      }
      pet_interact: { Args: never; Returns: Json }
      pet_sleep: { Args: never; Returns: Json }
      pet_tickle_game: { Args: { p_score: number }; Returns: Json }
      play_with_pet: { Args: never; Returns: Json }
      publish_deck: {
        Args: { p_description: string; p_folder_id: string; p_title: string }
        Returns: string
      }
      purchase_item_with_xp: { Args: { p_item_id: string }; Returns: undefined }
      purge_old_telemetry: { Args: { p_days?: number }; Returns: number }
      rate_public_deck: {
        Args: { p_comment?: string; p_deck_id: string; p_rating: number }
        Returns: undefined
      }
      record_activity: { Args: never; Returns: undefined }
      rename_pet: { Args: { p_name: string }; Returns: Json }
      reset_weekly_xp_all: { Args: never; Returns: undefined }
      reward_top_squads: { Args: never; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_attribute_point: { Args: { p_attr: string }; Returns: Json }
      sync_user_quests: { Args: never; Returns: undefined }
      unpublish_deck: { Args: { p_public_id: string }; Returns: undefined }
      update_kanji_progress: {
        Args: { p_kanji_id: string; p_quality: number }
        Returns: undefined
      }
      update_user_streak: { Args: { v_user_id: string }; Returns: undefined }
      update_vocab_progress: {
        Args: { p_quality: number; p_vocabulary_id: string }
        Returns: Json
      }
      use_food_item: { Args: { p_item_id: string }; Returns: Json }
      walk_pet: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "teacher" | "user" | "parent"
      lesson_status: "draft" | "published"
      lesson_type: "presentation" | "assessment" | "video" | "paragraph"
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
      app_role: ["admin", "teacher", "user", "parent"],
      lesson_status: ["draft", "published"],
      lesson_type: ["presentation", "assessment", "video", "paragraph"],
    },
  },
} as const
