export interface Member {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  pixKey?: string;
  role: 'organizador' | 'socio' | 'convidado';
  active: boolean;
  joinedDate: string;
}

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado';

export interface MensalidadeRecord {
  id: string;
  memberId: string;
  monthYear: string; // "2026-10"
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  receiptId?: string;
  notes?: string;
}

export interface TerceiroTempoExpense {
  id: string;
  description: string;
  amount: number;
  category: 'carne' | 'bebida' | 'gelo_carvao' | 'campo_juiz' | 'limpeza' | 'outro';
}

export interface TerceiroTempoParticipant {
  memberId: string;
  status: 'pago' | 'pendente';
  shareAmount: number;
  paidDate?: string;
  receiptId?: string;
}

export interface TerceiroTempo {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  totalCost: number;
  perPersonCost: number;
  expenses: TerceiroTempoExpense[];
  participants: TerceiroTempoParticipant[];
  location?: string;
  notes?: string;
}

export interface EventoExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  supplier?: string;
  paidDate: string;
}

export interface EventoTicket {
  id: string;
  memberId: string;
  memberName: string;
  guestCount: number; // ex: 2 pessoas da família
  totalAmount: number;
  status: 'pago' | 'pendente';
  paidDate?: string;
  receiptId?: string;
  notes?: string;
}

export interface Evento {
  id: string;
  name: string; // "Festa Dia das Mães", "Churrasco Dia dos Pais", "Festa de Fim de Ano"
  category: 'dia_das_maes' | 'dia_dos_pais' | 'fim_de_ano' | 'torneio' | 'outro';
  date: string;
  targetBudget: number;
  ticketPricePerPerson: number;
  status: 'planejado' | 'em_andamento' | 'concluido';
  expenses: EventoExpense[];
  tickets: EventoTicket[];
  notes?: string;
}

export interface PedidoMaterialItem {
  id: string;
  memberId: string;
  memberName: string;
  itemDetails?: string; // ex: "Tamanho G • Camisa 10" ou "Mochila Preta Personalizada"
  amount: number;
  status: 'pago' | 'pendente';
  paidDate?: string;
}

export interface PedidoMaterial {
  id: string;
  title: string; // "Novo Jogo de Uniformes 2026", "Bolsas Esportivas da Turma"
  category: 'uniforme' | 'bolsa' | 'agasalho' | 'material_esportivo' | 'outro';
  date: string;
  supplier?: string;
  totalManufacturerCost: number; // Custo cobrado pela confecção
  clubSubsidy: number; // Valor subsidiado pelo caixa do clube
  pricePerAthlete: number; // Valor a pagar por cada atleta
  items: PedidoMaterialItem[];
  notes?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number; // positivo para entrada, negativo ou positivo com type para saída
  type: 'entrada' | 'saida';
  category: 'mensalidade' | 'terceiro_tempo' | 'evento' | 'patrocinio' | 'material' | 'manutencao' | 'outro';
  memberId?: string;
  referenceId?: string;
  receiptInfo?: {
    payerName?: string;
    transactionId?: string;
    bank?: string;
    imageUrl?: string;
  };
}

export interface ScannedReceiptResult {
  payerName: string;
  payerCpfOrKey?: string;
  receiverName?: string;
  amount: number;
  date: string;
  time?: string;
  transactionId?: string;
  bankOrApp: string;
  paymentType: string;
  description?: string;
  matchedMemberId?: string;
  matchedDebtId?: string;
  confidence: number;
  suggestedCategory: 'mensalidade' | 'terceiro_tempo' | 'evento' | 'material' | 'outro';
  rawSummary: string;
}

export interface PendingDebtItem {
  id: string;
  memberId: string;
  memberName: string;
  memberNickname: string;
  memberPhone: string;
  title: string;
  category: 'mensalidade' | 'terceiro_tempo' | 'evento' | 'material' | 'outro';
  amount: number;
  dueDate: string;
  referenceId: string; // id da mensalidade, do 3 tempo, do ticket ou do pedido
  referenceSubId?: string;
  daysLate: number;
}
