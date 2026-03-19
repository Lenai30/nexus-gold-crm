export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: string;
  originTag: "paid" | "organic";
  score: number; // 1-5
  column: "novos" | "negociacao" | "followup" | "posvenda";
  lastInteraction: Date;
  createdAt: Date;
  notes?: string;
  followUpDate?: Date;
}

export const COLUMNS = [
  { id: "novos" as const, title: "Novos", emoji: "✨" },
  { id: "negociacao" as const, title: "Em Negociação", emoji: "🤝" },
  { id: "followup" as const, title: "Follow-up", emoji: "📞" },
  { id: "posvenda" as const, title: "Pós-Venda", emoji: "🎯" },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: "1", name: "Carla Mendes", phone: "+5511999990001",
    origin: "FB Ads - Campanha Verão", originTag: "paid", score: 5,
    column: "novos", lastInteraction: new Date(), createdAt: new Date(),
  },
  {
    id: "2", name: "João Silva", phone: "+5511999990002",
    origin: "Google Ads - Marca", originTag: "paid", score: 4,
    column: "novos", lastInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "3", name: "Ana Beatriz", phone: "+5511999990003",
    origin: "Instagram Orgânico", originTag: "organic", score: 3,
    column: "negociacao", lastInteraction: new Date(Date.now() - 4 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 2 * 86400000),
  },
  {
    id: "4", name: "Pedro Costa", phone: "+5511999990004",
    origin: "FB Ads - Campanha Black", originTag: "paid", score: 5,
    column: "negociacao", lastInteraction: new Date(Date.now() - 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 3 * 86400000),
  },
  {
    id: "5", name: "Mariana Rocha", phone: "+5511999990005",
    origin: "Indicação", originTag: "organic", score: 2,
    column: "followup", lastInteraction: new Date(Date.now() - 48 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 5 * 86400000),
    followUpDate: new Date(Date.now() + 86400000),
  },
  {
    id: "6", name: "Lucas Ferreira", phone: "+5511999990006",
    origin: "Google Ads - Produto", originTag: "paid", score: 4,
    column: "followup", lastInteraction: new Date(Date.now() - 72 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 7 * 86400000),
    followUpDate: new Date(Date.now() - 86400000),
  },
  {
    id: "7", name: "Fernanda Lima", phone: "+5511999990007",
    origin: "Site - Formulário", originTag: "organic", score: 3,
    column: "posvenda", lastInteraction: new Date(Date.now() - 1 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 10 * 86400000),
  },
  {
    id: "8", name: "Roberto Alves", phone: "+5511999990008",
    origin: "FB Ads - Remarketing", originTag: "paid", score: 5,
    column: "novos", lastInteraction: new Date(Date.now() - 30 * 60 * 1000), createdAt: new Date(),
  },
  {
    id: "9", name: "Camila Santos", phone: "+5511999990009",
    origin: "LinkedIn Orgânico", originTag: "organic", score: 1,
    column: "negociacao", lastInteraction: new Date(Date.now() - 96 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 8 * 86400000),
  },
  {
    id: "10", name: "Thiago Barbosa", phone: "+5511999990010",
    origin: "FB Ads - Lookalike", originTag: "paid", score: 4,
    column: "posvenda", lastInteraction: new Date(Date.now() - 6 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 4 * 86400000),
  },
];
