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
      campanhas_log: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          qtd_leads: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          qtd_leads?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          qtd_leads?: number
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          anuncio_nome: string | null
          assigned_to: string | null
          campanha_id: string | null
          campanha_nome: string | null
          conjunto_nome: string | null
          created_at: string
          id: string
          last_interaction: string
          nascimento: string | null
          nome: string
          notas: string | null
          origem: string | null
          origem_tag: string
          prox_acao: string | null
          score: number
          status: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          anuncio_nome?: string | null
          assigned_to?: string | null
          campanha_id?: string | null
          campanha_nome?: string | null
          conjunto_nome?: string | null
          created_at?: string
          id?: string
          last_interaction?: string
          nascimento?: string | null
          nome: string
          notas?: string | null
          origem?: string | null
          origem_tag?: string
          prox_acao?: string | null
          score?: number
          status?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          anuncio_nome?: string | null
          assigned_to?: string | null
          campanha_id?: string | null
          campanha_nome?: string | null
          conjunto_nome?: string | null
          created_at?: string
          id?: string
          last_interaction?: string
          nascimento?: string | null
          nome?: string
          notas?: string | null
          origem?: string | null
          origem_tag?: string
          prox_acao?: string | null
          score?: number
          status?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          sender_id: string | null
          sender_name: string | null
          status: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          content: string
          created_at?: string
          direction: string
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          content?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_webhooks: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          empresa_nome: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_nome?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_nome?: string | null
          id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          empresa_nome: string | null
          evolution_api_key: string | null
          evolution_instance: string | null
          evolution_url: string | null
          logo_url: string | null
          mensagem_padrao: string | null
          updated_at: string
          user_id: string
          webhook_token: string
        }
        Insert: {
          created_at?: string
          empresa_nome?: string | null
          evolution_api_key?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          updated_at?: string
          user_id: string
          webhook_token?: string
        }
        Update: {
          created_at?: string
          empresa_nome?: string | null
          evolution_api_key?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          logo_url?: string | null
          mensagem_padrao?: string | null
          updated_at?: string
          user_id?: string
          webhook_token?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          capabilities: string[]
          created_at: string
          display_name: string
          email: string
          expires_at: string
          id: string
          owner_id: string
          role_title: string
          sector: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          display_name: string
          email: string
          expires_at?: string
          id?: string
          owner_id: string
          role_title?: string
          sector?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          display_name?: string
          email?: string
          expires_at?: string
          id?: string
          owner_id?: string
          role_title?: string
          sector?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          capabilities: string[]
          created_at: string
          display_name: string
          id: string
          member_user_id: string
          owner_id: string
          role_title: string
          sector: string
        }
        Insert: {
          active?: boolean
          capabilities?: string[]
          created_at?: string
          display_name: string
          id?: string
          member_user_id: string
          owner_id: string
          role_title?: string
          sector?: string
        }
        Update: {
          active?: boolean
          capabilities?: string[]
          created_at?: string
          display_name?: string
          id?: string
          member_user_id?: string
          owner_id?: string
          role_title?: string
          sector?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: {
        Args: { _display_name?: string; _token: string }
        Returns: Json
      }
      current_org_owner: { Args: { _uid: string }; Returns: string }
      has_capability: { Args: { _cap: string; _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
