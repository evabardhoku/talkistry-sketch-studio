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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clarification_questions: {
        Row: {
          answer: string
          answer_message_id: string | null
          asked_message_id: string | null
          blueprint_stage: string | null
          created_at: string
          history: Json
          id: string
          is_current: boolean
          meeting_id: string | null
          owner_id: string | null
          priority: string
          project_id: string
          question: string
          rationale: string | null
          requirement_id: string | null
          screen_id: string | null
          session_id: string
          stage_key: string | null
          status: Database["public"]["Enums"]["question_status"]
          suggested_answers: Json
          topic: string
          updated_at: string
        }
        Insert: {
          answer?: string
          answer_message_id?: string | null
          asked_message_id?: string | null
          blueprint_stage?: string | null
          created_at?: string
          history?: Json
          id?: string
          is_current?: boolean
          meeting_id?: string | null
          owner_id?: string | null
          priority?: string
          project_id: string
          question: string
          rationale?: string | null
          requirement_id?: string | null
          screen_id?: string | null
          session_id: string
          stage_key?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          suggested_answers?: Json
          topic?: string
          updated_at?: string
        }
        Update: {
          answer?: string
          answer_message_id?: string | null
          asked_message_id?: string | null
          blueprint_stage?: string | null
          created_at?: string
          history?: Json
          id?: string
          is_current?: boolean
          meeting_id?: string | null
          owner_id?: string | null
          priority?: string
          project_id?: string
          question?: string
          rationale?: string | null
          requirement_id?: string | null
          screen_id?: string | null
          session_id?: string
          stage_key?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          suggested_answers?: Json
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarification_questions_answer_message_id_fkey"
            columns: ["answer_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_asked_message_id_fkey"
            columns: ["asked_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "product_screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "discovery_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          meta: Json
          project_id: string
          role: string
          session_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          meta?: Json
          project_id: string
          role: string
          session_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          meta?: Json
          project_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "discovery_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          action: string
          created_at: string
          decided_by: string | null
          id: string
          note: string | null
          project_id: string
          requirement_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string | null
          project_id: string
          requirement_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string | null
          project_id?: string
          requirement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_req_fk"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      development_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          insight_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          insight_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          insight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_comments_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "development_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      development_insights: {
        Row: {
          author_id: string
          created_at: string
          description: string
          id: string
          owner_id: string | null
          priority: string
          project_id: string
          promoted_question_id: string | null
          requirement_id: string | null
          screen_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          description?: string
          id?: string
          owner_id?: string | null
          priority?: string
          project_id: string
          promoted_question_id?: string | null
          requirement_id?: string | null
          screen_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string
          id?: string
          owner_id?: string | null
          priority?: string
          project_id?: string
          promoted_question_id?: string | null
          requirement_id?: string | null
          screen_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_insights_promoted_question_id_fkey"
            columns: ["promoted_question_id"]
            isOneToOne: false
            referencedRelation: "clarification_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_insights_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_insights_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "product_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_sessions: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          active_stage: number
          agenda: Json
          brief: string
          created_at: string
          created_by: string
          duration_minutes: number
          elapsed_seconds: number
          ended_at: string | null
          goals: string
          id: string
          participants: Json
          project_id: string
          purpose: string
          running_since: string | null
          started_at: string | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          active_stage?: number
          agenda?: Json
          brief?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          elapsed_seconds?: number
          ended_at?: string | null
          goals?: string
          id?: string
          participants?: Json
          project_id: string
          purpose?: string
          running_since?: string | null
          started_at?: string | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          active_stage?: number
          agenda?: Json
          brief?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          elapsed_seconds?: number
          ended_at?: string | null
          goals?: string
          id?: string
          participants?: Json
          project_id?: string
          purpose?: string
          running_since?: string | null
          started_at?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_screens: {
        Row: {
          change_note: string | null
          changed_message_id: string | null
          components: Json
          created_at: string
          id: string
          key: string
          layout_h: number | null
          layout_w: number | null
          layout_x: number | null
          layout_y: number | null
          name: string
          position: number
          project_id: string
          purpose: string
          unresolved: Json
          updated_at: string
          user_role: string | null
        }
        Insert: {
          change_note?: string | null
          changed_message_id?: string | null
          components?: Json
          created_at?: string
          id?: string
          key: string
          layout_h?: number | null
          layout_w?: number | null
          layout_x?: number | null
          layout_y?: number | null
          name: string
          position?: number
          project_id: string
          purpose?: string
          unresolved?: Json
          updated_at?: string
          user_role?: string | null
        }
        Update: {
          change_note?: string | null
          changed_message_id?: string | null
          components?: Json
          created_at?: string
          id?: string
          key?: string
          layout_h?: number | null
          layout_w?: number | null
          layout_x?: number | null
          layout_y?: number | null
          name?: string
          position?: number
          project_id?: string
          purpose?: string
          unresolved?: Json
          updated_at?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_screens_changed_message_id_fkey"
            columns: ["changed_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_screens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          access_expires_at: string | null
          baseline_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          link_expires_at: string
          project_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_expires_at?: string | null
          baseline_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          link_expires_at?: string
          project_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_expires_at?: string | null
          baseline_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          link_expires_at?: string
          project_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "specification_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          baseline_id: string | null
          created_at: string
          expires_at: string | null
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          baseline_id?: string | null
          created_at?: string
          expires_at?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          baseline_id?: string | null
          created_at?: string
          expires_at?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "specification_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          owner_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          owner_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          owner_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      requirements: {
        Row: {
          category: string
          created_at: string
          description: string
          evidence: string | null
          id: string
          last_decision_id: string | null
          origin: string
          project_id: string
          reviewer_id: string | null
          source_message_id: string | null
          status: Database["public"]["Enums"]["req_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          evidence?: string | null
          id?: string
          last_decision_id?: string | null
          origin?: string
          project_id: string
          reviewer_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["req_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          evidence?: string | null
          id?: string
          last_decision_id?: string | null
          origin?: string
          project_id?: string
          reviewer_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["req_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_last_decision_id_fkey"
            columns: ["last_decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          project_id: string
          requirement_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          scope_change_id: string | null
          screen_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          kind?: string
          project_id: string
          requirement_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scope_change_id?: string | null
          screen_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          requirement_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scope_change_id?: string | null
          screen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_scope_change_id_fkey"
            columns: ["scope_change_id"]
            isOneToOne: false
            referencedRelation: "scope_changes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "product_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_changes: {
        Row: {
          after_text: string
          baseline_id: string
          before_requirement_id: string | null
          before_text: string | null
          created_at: string
          developer_estimate: string | null
          estimate_by: string | null
          explanation: string
          id: string
          kind: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_message_id: string | null
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          after_text: string
          baseline_id: string
          before_requirement_id?: string | null
          before_text?: string | null
          created_at?: string
          developer_estimate?: string | null
          estimate_by?: string | null
          explanation?: string
          id?: string
          kind: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_message_id?: string | null
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          after_text?: string
          baseline_id?: string
          before_requirement_id?: string | null
          before_text?: string | null
          created_at?: string
          developer_estimate?: string | null
          estimate_by?: string | null
          explanation?: string
          id?: string
          kind?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_message_id?: string | null
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_changes_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "specification_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_changes_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          kind: string
          notes: string | null
          project_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          project_id: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          project_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "specification_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_connections: {
        Row: {
          created_at: string
          from_screen_id: string
          id: string
          label: string
          project_id: string
          to_screen_id: string
        }
        Insert: {
          created_at?: string
          from_screen_id: string
          id?: string
          label?: string
          project_id: string
          to_screen_id: string
        }
        Update: {
          created_at?: string
          from_screen_id?: string
          id?: string
          label?: string
          project_id?: string
          to_screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_connections_from_screen_id_fkey"
            columns: ["from_screen_id"]
            isOneToOne: false
            referencedRelation: "product_screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_connections_to_screen_id_fkey"
            columns: ["to_screen_id"]
            isOneToOne: false
            referencedRelation: "product_screens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      add_sample_projects: { Args: never; Returns: string[] }
      approve_baseline: {
        Args: { _notes: string; _project_id: string }
        Returns: string
      }
      can_edit_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      claim_discovery_turn: {
        Args: {
          _content: string
          _project_id: string
          _request_id: string
          _session_id: string
          _skip: boolean
        }
        Returns: Json
      }
      control_meeting: {
        Args: { _action: string; _id: string; _minutes?: number }
        Returns: {
          active_stage: number
          agenda: Json
          brief: string
          created_at: string
          created_by: string
          duration_minutes: number
          elapsed_seconds: number
          ended_at: string | null
          goals: string
          id: string
          participants: Json
          project_id: string
          purpose: string
          running_since: string | null
          started_at: string | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "meetings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_meeting_demo: { Args: never; Returns: string }
      delete_owned_project: {
        Args: { _project_id: string }
        Returns: undefined
      }
      get_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          project_name: string
          reason: string
          role: string
          valid: boolean
        }[]
      }
      get_project_people: {
        Args: { _project_id: string }
        Returns: {
          baseline_id: string
          display_name: string
          email: string
          expires_at: string
          role: string
          user_id: string
        }[]
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_internal_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      member_role_of: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      promote_development_question: {
        Args: { _id: string; _question: string }
        Returns: string
      }
      seed_demo_project: { Args: { _user: string }; Returns: string }
    }
    Enums: {
      member_role: "owner" | "editor" | "viewer" | "client" | "developer"
      question_status:
        | "open"
        | "answered"
        | "skipped"
        | "deferred"
        | "needs_technical_review"
        | "resolved"
      req_status:
        | "confirmed"
        | "proposed"
        | "unresolved"
        | "deferred"
        | "excluded"
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
      member_role: ["owner", "editor", "viewer", "client", "developer"],
      question_status: [
        "open",
        "answered",
        "skipped",
        "deferred",
        "needs_technical_review",
        "resolved",
      ],
      req_status: [
        "confirmed",
        "proposed",
        "unresolved",
        "deferred",
        "excluded",
      ],
    },
  },
} as const
