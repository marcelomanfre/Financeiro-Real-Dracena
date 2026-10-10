import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  Calendar,
  Beer,
  PartyPopper,
  BookOpen,
  Users,
  DollarSign,
  Download,
  RotateCcw,
  CheckCircle2,
  Menu,
  X,
  CreditCard,
  FileSpreadsheet,
  Shirt,
} from 'lucide-react';
import {
  Member,
  MensalidadeRecord,
  TerceiroTempo,
  Evento,
  Transaction,
  ScannedReceiptResult,
  PendingDebtItem,
  EventoExpense,
  PedidoMaterial,
  PedidoMaterialItem,
} from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_MENSALIDADES,
  INITIAL_TERCEIROS_TEMPOS,
  INITIAL_EVENTOS,
  INITIAL_TRANSACTIONS,
  INITIAL_PEDIDOS_MATERIAIS,
} from './data/initialData';
import {
  calculateAllPendingDebts,
  formatBRL,
  formatDateBR,
  getMonthNameBR,
  getSecondWednesdayOfMonth,
} from './utils/helpers';
import { DashboardView } from './components/DashboardView';
import { ReceiptScanner } from './components/ReceiptScanner';
import { DebtsView } from './components/DebtsView';
import { MensalidadesView } from './components/MensalidadesView';
import { TerceiroTempoView } from './components/TerceiroTempoView';
import { EventosView } from './components/EventosView';
import { LivroCaixaView } from './components/LivroCaixaView';
import { MembrosView } from './components/MembrosView';
import { RelatoriosDREView } from './components/RelatoriosDREView';
import { UniformesMateriaisView } from './components/UniformesMateriaisView';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'scanner' | 'devedores' | 'mensalidades' | 'terceiro_tempo' | 'eventos' | 'materiais' | 'caixa' | 'relatorios' | 'membros'
  >('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Persistent State
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('rp_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [mensalidades, setMensalidades] = useState<MensalidadeRecord[]>(() => {
    const saved = localStorage.getItem('rp_mensalidades');
    return saved ? JSON.parse(saved) : INITIAL_MENSALIDADES;
  });

  const [terceirosTempos, setTerceirosTempos] = useState<TerceiroTempo[]>(() => {
    const saved = localStorage.getItem('rp_terceiros_tempos');
    return saved ? JSON.parse(saved) : INITIAL_TERCEIROS_TEMPOS;
  });

  const [eventos, setEventos] = useState<Evento[]>(() => {
    const saved = localStorage.getItem('rp_eventos');
    return saved ? JSON.parse(saved) : INITIAL_EVENTOS;
  });

  const [pedidosMateriais, setPedidosMateriais] = useState<PedidoMaterial[]>(() => {
    const saved = localStorage.getItem('rp_pedidos_materiais');
    return saved ? JSON.parse(saved) : INITIAL_PEDIDOS_MATERIAIS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('rp_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('rp_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('rp_mensalidades', JSON.stringify(mensalidades));
  }, [mensalidades]);

  useEffect(() => {
    localStorage.setItem('rp_terceiros_tempos', JSON.stringify(terceirosTempos));
  }, [terceirosTempos]);

  useEffect(() => {
    localStorage.setItem('rp_eventos', JSON.stringify(eventos));
  }, [eventos]);

  useEffect(() => {
    localStorage.setItem('rp_pedidos_materiais', JSON.stringify(pedidosMateriais));
  }, [pedidosMateriais]);

  useEffect(() => {
    localStorage.setItem('rp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Derived: All pending debts across all 4 modules
  const pendingDebts = useMemo(() => {
    return calculateAllPendingDebts(members, mensalidades, terceirosTempos, eventos, pedidosMateriais);
  }, [members, mensalidades, terceirosTempos, eventos, pedidosMateriais]);

  const overdueCount = pendingDebts.filter((d) => d.daysLate > 0).length;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // --- ACTIONS ---

  // Helper to execute single settlement following the user's FIFO rule:
  // "se um atleta tem 3 mensalidades atrasados e faz o pagamento de uma, já quita automaticamente a mais antiga."
  const processPaymentSettlement = (
    payment: {
      scanned: ScannedReceiptResult;
      matchedMemberId: string;
      matchedDebtId?: string;
    },
    currentData: {
      mensalidades: MensalidadeRecord[];
      terceirosTempos: TerceiroTempo[];
      eventos: Evento[];
      pedidosMateriais: PedidoMaterial[];
    }
  ) => {
    const { scanned, matchedMemberId, matchedDebtId } = payment;
    const member = members.find((m) => m.id === matchedMemberId);
    const memberName = member ? member.nickname : scanned.payerName;
    const today = new Date().toISOString().split('T')[0];
    const paidDate = scanned.date || today;

    let updatedMensalidades = [...currentData.mensalidades];
    let updatedTT = [...currentData.terceirosTempos];
    let updatedEventos = [...currentData.eventos];
    let updatedMateriais = [...currentData.pedidosMateriais];

    let category: Transaction['category'] = 'outro';
    let debtTitle = 'Pagamento Pix com IA';
    let settlementDetail = '';

    // Check if debt was specifically locked to a non-mensalidade category
    const targetedDebt = matchedDebtId
      ? pendingDebts.find((d) => d.id === matchedDebtId || d.referenceId === matchedDebtId)
      : null;

    if (targetedDebt && targetedDebt.category === 'terceiro_tempo') {
      category = 'terceiro_tempo';
      debtTitle = targetedDebt.title;
      settlementDetail = `Quitou ${targetedDebt.title}`;
      updatedTT = updatedTT.map((tt) =>
        tt.id === targetedDebt.referenceId
          ? {
              ...tt,
              participants: tt.participants.map((p) =>
                p.memberId === targetedDebt.referenceSubId || p.memberId === matchedMemberId
                  ? { ...p, status: 'pago', paidDate }
                  : p
              ),
            }
          : tt
      );
    } else if (targetedDebt && targetedDebt.category === 'evento') {
      category = 'evento';
      debtTitle = targetedDebt.title;
      settlementDetail = `Quitou ${targetedDebt.title}`;
      updatedEventos = updatedEventos.map((ev) =>
        ev.id === targetedDebt.referenceId
          ? {
              ...ev,
              tickets: ev.tickets.map((t) =>
                t.id === targetedDebt.referenceSubId || t.memberId === matchedMemberId
                  ? { ...t, status: 'pago', paidDate }
                  : t
              ),
            }
          : ev
      );
    } else if (targetedDebt && targetedDebt.category === 'material') {
      category = 'material';
      debtTitle = targetedDebt.title;
      settlementDetail = `Quitou ${targetedDebt.title}`;
      updatedMateriais = updatedMateriais.map((ped) =>
        ped.id === targetedDebt.referenceId
          ? {
              ...ped,
              items: ped.items.map((i) =>
                i.id === targetedDebt.referenceSubId || i.memberId === matchedMemberId
                  ? { ...i, status: 'pago', paidDate }
                  : i
              ),
            }
          : ped
      );
    } else {
      // Mensalidade or generic payment:
      // FIFO Rule: "se um atleta tem 3 mensalidades atrasados e faz o pagamento de uma, já quita automaticamente a mais antiga."
      category = 'mensalidade';

      const unpaidMensalidades = updatedMensalidades
        .filter((m) => m.memberId === matchedMemberId && m.status !== 'pago')
        .sort((a, b) => (a.dueDate || a.monthYear).localeCompare(b.dueDate || b.monthYear));

      if (unpaidMensalidades.length > 0) {
        // How many mensalidades does the amount cover?
        let remainingAmountToSettle = scanned.amount;
        const settledMonths: string[] = [];
        const settledIds = new Set<string>();

        for (const unpaid of unpaidMensalidades) {
          if (remainingAmountToSettle >= unpaid.amount * 0.8 || settledIds.size === 0) {
            settledIds.add(unpaid.id);
            settledMonths.push(getMonthNameBR(unpaid.monthYear));
            remainingAmountToSettle -= unpaid.amount;
          }
          if (remainingAmountToSettle <= 0) break;
        }

        updatedMensalidades = updatedMensalidades.map((rec) => {
          if (settledIds.has(rec.id)) {
            return {
              ...rec,
              status: 'pago',
              paidDate,
              paymentMethod: scanned.paymentType || 'PIX',
              notes: `Baixa automática via IA (Quitou mais antiga em atraso: ${settledMonths.join(', ')})`,
            };
          }
          return rec;
        });

        debtTitle = `Mensalidade ${settledMonths.join(' e ')}`;
        settlementDetail = `Quitou automaticamente a mensalidade mais antiga: ${settledMonths.join(', ')}`;
      } else {
        // No unpaid mensalidades: check if has any other pending debt
        const otherDebt = pendingDebts.find((d) => d.memberId === matchedMemberId);
        if (otherDebt) {
          category = otherDebt.category;
          debtTitle = otherDebt.title;
          settlementDetail = `Quitou ${otherDebt.title}`;

          if (otherDebt.category === 'terceiro_tempo') {
            updatedTT = updatedTT.map((tt) =>
              tt.id === otherDebt.referenceId
                ? {
                    ...tt,
                    participants: tt.participants.map((p) =>
                      p.memberId === matchedMemberId ? { ...p, status: 'pago', paidDate } : p
                    ),
                  }
                : tt
            );
          } else if (otherDebt.category === 'material') {
            updatedMateriais = updatedMateriais.map((ped) =>
              ped.id === otherDebt.referenceId
                ? {
                    ...ped,
                    items: ped.items.map((i) =>
                      i.memberId === matchedMemberId ? { ...i, status: 'pago', paidDate } : i
                    ),
                  }
                : ped
            );
          }
        } else {
          debtTitle = `Mensalidade Adiantada / Crédito`;
          settlementDetail = `Crédito em caixa (Atleta 100% em dia)`;
        }
      }
    }

    // New transaction for Livro Caixa
    const newTx: Transaction = {
      id: `tx-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: paidDate,
      description: `${debtTitle} - ${memberName} (${settlementDetail})`,
      amount: scanned.amount,
      type: 'entrada',
      category: category as any,
      memberId: matchedMemberId,
      receiptInfo: {
        payerName: scanned.payerName,
        transactionId: scanned.transactionId,
        bank: scanned.bankOrApp,
      },
    };

    return {
      updatedData: {
        mensalidades: updatedMensalidades,
        terceirosTempos: updatedTT,
        eventos: updatedEventos,
        pedidosMateriais: updatedMateriais,
      },
      newTx,
      memberName,
      settlementDetail,
      amount: scanned.amount,
    };
  };

  // 1. Confirm AI Scanned Payment (Single Receipt)
  const handleConfirmScannedPayment = ({
    scanned,
    matchedMemberId,
    matchedDebtId,
  }: {
    scanned: ScannedReceiptResult;
    matchedMemberId: string;
    matchedDebtId?: string;
  }) => {
    const result = processPaymentSettlement(
      { scanned, matchedMemberId, matchedDebtId },
      { mensalidades, terceirosTempos, eventos, pedidosMateriais }
    );

    setMensalidades(result.updatedData.mensalidades);
    setTerceirosTempos(result.updatedData.terceirosTempos);
    setEventos(result.updatedData.eventos);
    setPedidosMateriais(result.updatedData.pedidosMateriais);
    setTransactions((prev) => [result.newTx, ...prev]);

    showToast(
      `Baixa realizada para ${result.memberName}: ${result.settlementDetail} (${formatBRL(result.amount)})!`
    );
  };

  // 1.1 Confirm Batch AI Scanned Payments (Lote de Arquivos)
  const handleBatchConfirmPayments = (
    batchItems: Array<{
      scanned: ScannedReceiptResult;
      matchedMemberId: string;
      matchedDebtId?: string;
    }>
  ) => {
    let currentData = {
      mensalidades: [...mensalidades],
      terceirosTempos: [...terceirosTempos],
      eventos: [...eventos],
      pedidosMateriais: [...pedidosMateriais],
    };

    const newTxs: Transaction[] = [];
    const summaryReports: string[] = [];
    let totalBatchAmount = 0;

    for (const item of batchItems) {
      const result = processPaymentSettlement(item, currentData);
      currentData = result.updatedData;
      newTxs.push(result.newTx);
      totalBatchAmount += result.amount;
      summaryReports.push(`${result.memberName}: ${result.settlementDetail}`);
    }

    setMensalidades(currentData.mensalidades);
    setTerceirosTempos(currentData.terceirosTempos);
    setEventos(currentData.eventos);
    setPedidosMateriais(currentData.pedidosMateriais);
    setTransactions((prev) => [...newTxs, ...prev]);

    showToast(
      `Lote concluído! ${batchItems.length} comprovantes baixados (${formatBRL(totalBatchAmount)}) quitando as mais antigas!`
    );

    return {
      count: batchItems.length,
      totalAmount: totalBatchAmount,
      reports: summaryReports,
    };
  };

  // 2. Manual Payment from Debts View
  const handleManualPayDebt = (debt: PendingDebtItem) => {
    const today = new Date().toISOString().split('T')[0];

    if (debt.category === 'mensalidade') {
      setMensalidades((prev) =>
        prev.map((m) =>
          m.id === debt.referenceId
            ? { ...m, status: 'pago', paidDate: today, paymentMethod: 'PIX' }
            : m
        )
      );
    } else if (debt.category === 'terceiro_tempo') {
      setTerceirosTempos((prev) =>
        prev.map((tt) =>
          tt.id === debt.referenceId
            ? {
                ...tt,
                participants: tt.participants.map((p) =>
                  p.memberId === debt.referenceSubId || p.memberId === debt.memberId
                    ? { ...p, status: 'pago', paidDate: today }
                    : p
                ),
              }
            : tt
        )
      );
    } else if (debt.category === 'evento') {
      setEventos((prev) =>
        prev.map((ev) =>
          ev.id === debt.referenceId
            ? {
                ...ev,
                tickets: ev.tickets.map((t) =>
                  t.id === debt.referenceSubId || t.memberId === debt.memberId
                    ? { ...t, status: 'pago', paidDate: today }
                    : t
                ),
              }
            : ev
        )
      );
    } else if (debt.category === 'material') {
      setPedidosMateriais((prev) =>
        prev.map((ped) =>
          ped.id === debt.referenceId
            ? {
                ...ped,
                items: ped.items.map((i) =>
                  i.id === debt.referenceSubId || i.memberId === debt.memberId
                    ? { ...i, status: 'pago', paidDate: today }
                    : i
                ),
              }
            : ped
        )
      );
    }

    // Log in Caixa
    const newTx: Transaction = {
      id: `tx-man-${Date.now()}`,
      date: today,
      description: `${debt.title} - ${debt.memberNickname}`,
      amount: debt.amount,
      type: 'entrada',
      category: debt.category as any,
      memberId: debt.memberId,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Baixa manual confirmada: ${debt.title} de ${debt.memberNickname}!`);
  };

  // 3. Mensalidades actions
  const handleToggleMensalidade = (recordId: string) => {
    const rec = mensalidades.find((m) => m.id === recordId);
    if (!rec) return;

    const newStatus = rec.status === 'pago' ? 'pendente' : 'pago';
    const today = new Date().toISOString().split('T')[0];

    setMensalidades((prev) =>
      prev.map((m) =>
        m.id === recordId
          ? {
              ...m,
              status: newStatus,
              paidDate: newStatus === 'pago' ? today : undefined,
              paymentMethod: newStatus === 'pago' ? 'PIX' : undefined,
            }
          : m
      )
    );

    // If marked as paid, also add to Caixa
    if (newStatus === 'pago') {
      const member = members.find((m) => m.id === rec.memberId);
      const newTx: Transaction = {
        id: `tx-men-${Date.now()}`,
        date: today,
        description: `Mensalidade ${rec.monthYear} - ${member?.nickname || 'Sócio'}`,
        amount: rec.amount,
        type: 'entrada',
        category: 'mensalidade',
        memberId: rec.memberId,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    showToast(newStatus === 'pago' ? 'Mensalidade baixada como Paga!' : 'Status alterado para Pendente.');
  };

  const handleGenerateNextMonth = (monthYear: string, standardAmount: number) => {
    const calculatedDueDate = getSecondWednesdayOfMonth(monthYear);
    const newRecords: MensalidadeRecord[] = members.map((m) => ({
      id: `men-${m.id}-${monthYear}`,
      memberId: m.id,
      monthYear,
      amount: standardAmount,
      status: 'pendente',
      dueDate: calculatedDueDate,
    }));

    setMensalidades((prev) => [...prev, ...newRecords]);
    showToast(
      `Mensalidades de ${monthYear} geradas! Vencimento: ${formatDateBR(calculatedDueDate)} (2ª quarta-feira do mês).`
    );
  };

  // 4. Terceiro Tempo actions
  const handleSaveTerceiroTempo = (tt: TerceiroTempo) => {
    setTerceirosTempos((prev) => [tt, ...prev]);

    // Record the expense in caixa
    const newTx: Transaction = {
      id: `tx-tt-cost-${Date.now()}`,
      date: tt.date,
      description: `Despesas do ${tt.title}`,
      amount: tt.totalCost,
      type: 'saida',
      category: 'terceiro_tempo',
      referenceId: tt.id,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`3º Tempo cadastrado! Rateio de ${formatBRL(tt.perPersonCost)} gerado por participante.`);
  };

  const handleDeleteTerceiroTempo = (id: string) => {
    setTerceirosTempos((prev) => prev.filter((t) => t.id !== id));
    showToast('3º Tempo removido.');
  };

  const handleToggleTTParticipant = (ttId: string, memberId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let justPaid = false;
    let share = 0;

    setTerceirosTempos((prev) =>
      prev.map((tt) => {
        if (tt.id !== ttId) return tt;
        return {
          ...tt,
          participants: tt.participants.map((p) => {
            if (p.memberId !== memberId) return p;
            const newStatus = p.status === 'pago' ? 'pendente' : 'pago';
            justPaid = newStatus === 'pago';
            share = p.shareAmount || tt.perPersonCost;
            return {
              ...p,
              status: newStatus,
              paidDate: newStatus === 'pago' ? today : undefined,
            };
          }),
        };
      })
    );

    if (justPaid) {
      const member = members.find((m) => m.id === memberId);
      const newTx: Transaction = {
        id: `tx-tt-pay-${Date.now()}`,
        date: today,
        description: `Rateio 3º Tempo - ${member?.nickname || 'Sócio'}`,
        amount: share,
        type: 'entrada',
        category: 'terceiro_tempo',
        memberId,
        referenceId: ttId,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  // 5. Eventos actions
  const handleSaveEvento = (ev: Evento) => {
    setEventos((prev) => [ev, ...prev]);
    showToast(`Evento "${ev.name}" cadastrado com sucesso!`);
  };

  const handleDeleteEvento = (id: string) => {
    setEventos((prev) => prev.filter((e) => e.id !== id));
    showToast('Evento excluído.');
  };

  const handleToggleTicketPayment = (eventoId: string, ticketId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let justPaid = false;
    let ticketAmount = 0;
    let memberName = '';

    setEventos((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventoId) return ev;
        return {
          ...ev,
          tickets: ev.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            const newStatus = t.status === 'pago' ? 'pendente' : 'pago';
            justPaid = newStatus === 'pago';
            ticketAmount = t.totalAmount;
            memberName = t.memberName;
            return {
              ...t,
              status: newStatus,
              paidDate: newStatus === 'pago' ? today : undefined,
            };
          }),
        };
      })
    );

    if (justPaid) {
      const newTx: Transaction = {
        id: `tx-ev-pay-${Date.now()}`,
        date: today,
        description: `Ingresso Festa/Evento - ${memberName}`,
        amount: ticketAmount,
        type: 'entrada',
        category: 'evento',
        referenceId: eventoId,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleAddEventoExpense = (eventoId: string, expense: EventoExpense) => {
    setEventos((prev) =>
      prev.map((ev) =>
        ev.id === eventoId
          ? { ...ev, expenses: [expense, ...ev.expenses] }
          : ev
      )
    );

    // Log expense in Caixa
    const newTx: Transaction = {
      id: `tx-ev-exp-${Date.now()}`,
      date: expense.paidDate,
      description: `Despesa Evento: ${expense.description}`,
      amount: expense.amount,
      type: 'saida',
      category: 'evento',
      referenceId: eventoId,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Despesa de ${formatBRL(expense.amount)} lançada no evento!`);
  };

  // 6. Pedidos de Uniformes, Bolsas e Materiais
  const handleSavePedido = (pedido: PedidoMaterial) => {
    setPedidosMateriais((prev) => [pedido, ...prev]);
    // Se houve subsídio do clube, lançar como despesa do caixa
    if (pedido.clubSubsidy > 0) {
      const subsidyTx: Transaction = {
        id: `tx-mat-sub-${Date.now()}`,
        date: pedido.date,
        description: `Subsídio do Clube: ${pedido.title} (${pedido.supplier || 'Fornecedor'})`,
        amount: pedido.clubSubsidy,
        type: 'saida',
        category: 'material',
        referenceId: pedido.id,
      };
      setTransactions((prev) => [subsidyTx, ...prev]);
    }
    showToast(`Pedido coletivo "${pedido.title}" cadastrado com sucesso!`);
  };

  const handleDeletePedido = (id: string) => {
    setPedidosMateriais((prev) => prev.filter((p) => p.id !== id));
    showToast('Pedido coletivo excluído.');
  };

  const handleToggleItemPayment = (pedidoId: string, itemId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let justPaid = false;
    let itemAmount = 0;
    let memberName = '';
    let pedidoTitle = '';

    setPedidosMateriais((prev) =>
      prev.map((ped) => {
        if (ped.id !== pedidoId) return ped;
        pedidoTitle = ped.title;
        return {
          ...ped,
          items: ped.items.map((item) => {
            if (item.id !== itemId) return item;
            const newStatus = item.status === 'pago' ? 'pendente' : 'pago';
            justPaid = newStatus === 'pago';
            itemAmount = item.amount;
            memberName = item.memberName;
            return {
              ...item,
              status: newStatus,
              paidDate: newStatus === 'pago' ? today : undefined,
            };
          }),
        };
      })
    );

    if (justPaid) {
      const newTx: Transaction = {
        id: `tx-mat-pay-${Date.now()}`,
        date: today,
        description: `Pagto ${pedidoTitle} - ${memberName}`,
        amount: itemAmount,
        type: 'entrada',
        category: 'material',
        referenceId: pedidoId,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleAddAthleteToPedido = (pedidoId: string, item: PedidoMaterialItem) => {
    setPedidosMateriais((prev) =>
      prev.map((ped) =>
        ped.id === pedidoId ? { ...ped, items: [...ped.items, item] } : ped
      )
    );
    showToast(`Atleta "${item.memberName}" adicionado ao pedido!`);
  };

  // 7. Member actions
  const handleAddMember = (m: Member) => {
    setMembers((prev) => [...prev, m]);
    showToast(`Sócio "${m.nickname}" cadastrado!`);
  };

  const handleUpdateMember = (m: Member) => {
    setMembers((prev) => prev.map((item) => (item.id === m.id ? m : item)));
    showToast(`Dados de ${m.nickname} atualizados!`);
  };

  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showToast('Sócio removido.');
  };

  // Reset demo data
  const handleResetDemoData = () => {
    if (confirm('Deseja restaurar todos os dados para o padrão inicial de demonstração?')) {
      setMembers(INITIAL_MEMBERS);
      setMensalidades(INITIAL_MENSALIDADES);
      setTerceirosTempos(INITIAL_TERCEIROS_TEMPOS);
      setEventos(INITIAL_EVENTOS);
      setPedidosMateriais(INITIAL_PEDIDOS_MATERIAIS);
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.clear();
      showToast('Dados restaurados para o padrão inicial da resenha!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg">
                <Beer className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  ResenhaPay
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full font-bold">
                    IA
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Financeiro • 3º Tempo • Festas
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
                { id: 'scanner', label: 'Baixa com IA', icon: Sparkles, highlight: true },
                { id: 'devedores', label: 'Atrasados', icon: AlertTriangle, badge: overdueCount },
                { id: 'mensalidades', label: 'Mensalidades', icon: Calendar },
                { id: 'terceiro_tempo', label: '3º Tempo (Quarta)', icon: Beer },
                { id: 'eventos', label: 'Eventos/Festas', icon: PartyPopper },
                { id: 'materiais', label: 'Uniformes/Bolsas', icon: Shirt },
                { id: 'caixa', label: 'Livro Caixa', icon: BookOpen },
                { id: 'relatorios', label: 'Relatórios & DRE', icon: FileSpreadsheet },
                { id: 'membros', label: 'Sócios', icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : item.highlight
                        ? 'text-emerald-300 hover:bg-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-emerald-400' : ''}`} />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Tools: Reset Demo & Mobile Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDemoData}
                title="Restaurar dados de demonstração da resenha"
                className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Resetar Demo
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
              { id: 'scanner', label: 'Baixa Automática com IA', icon: Sparkles },
              { id: 'devedores', label: 'Cobranças & Atrasados', icon: AlertTriangle, badge: overdueCount },
              { id: 'mensalidades', label: 'Mensalidades dos Sócios', icon: Calendar },
              { id: 'terceiro_tempo', label: '3º Tempo de Quarta', icon: Beer },
              { id: 'eventos', label: 'Eventos & Festas do Ano', icon: PartyPopper },
              { id: 'materiais', label: 'Uniformes, Bolsas & Encomendas', icon: Shirt },
              { id: 'caixa', label: 'Livro Caixa (Entradas e Saídas)', icon: BookOpen },
              { id: 'relatorios', label: 'Relatórios & DRE (Fluxo de Caixa)', icon: FileSpreadsheet },
              { id: 'membros', label: 'Quadro de Sócios', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            members={members}
            mensalidades={mensalidades}
            terceirosTempos={terceirosTempos}
            eventos={eventos}
            transactions={transactions}
            pendingDebts={pendingDebts}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onOpenScanner={() => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'scanner' && (
          <ReceiptScanner
            members={members}
            pendingDebts={pendingDebts}
            onConfirmPayment={handleConfirmScannedPayment}
            onConfirmBatchPayments={handleBatchConfirmPayments}
            onClose={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'devedores' && (
          <DebtsView
            members={members}
            pendingDebts={pendingDebts}
            onManualPay={handleManualPayDebt}
            onOpenScannerWithMember={(_memberId) => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'mensalidades' && (
          <MensalidadesView
            mensalidades={mensalidades}
            members={members}
            onToggleStatus={handleToggleMensalidade}
            onGenerateNextMonth={handleGenerateNextMonth}
            onUpdateRecordAmount={(recId, newAmount) => {
              setMensalidades((prev) =>
                prev.map((m) => (m.id === recId ? { ...m, amount: newAmount } : m))
              );
              showToast(`Valor da mensalidade atualizado para ${formatBRL(newAmount)}!`);
            }}
            onApplyStandardAmountToMonth={(mYear, amount) => {
              setMensalidades((prev) =>
                prev.map((m) =>
                  m.monthYear === mYear && m.status !== 'pago' ? { ...m, amount } : m
                )
              );
              showToast(`Mensalidades em aberto de ${mYear} ajustadas para ${formatBRL(amount)}!`);
            }}
          />
        )}

        {activeTab === 'terceiro_tempo' && (
          <TerceiroTempoView
            terceirosTempos={terceirosTempos}
            members={members}
            onSaveTerceiroTempo={handleSaveTerceiroTempo}
            onDeleteTerceiroTempo={handleDeleteTerceiroTempo}
            onToggleParticipantPayment={handleToggleTTParticipant}
            onAddExpenseToTT={(ttId, newExp) => {
              setTerceirosTempos((prev) =>
                prev.map((tt) => {
                  if (tt.id !== ttId) return tt;
                  const updatedExpenses = [...tt.expenses, newExp];
                  const newTotal = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const count = tt.participants.length || 1;
                  const newPerPerson = Math.ceil((newTotal / count) * 100) / 100;
                  return {
                    ...tt,
                    expenses: updatedExpenses,
                    totalCost: newTotal,
                    perPersonCost: newPerPerson,
                    participants: tt.participants.map((p) => ({
                      ...p,
                      shareAmount: newPerPerson,
                    })),
                  };
                })
              );

              // Add expense entry into Caixa
              const newTx: Transaction = {
                id: `tx-tt-exp-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Despesa 3º Tempo: ${newExp.description}`,
                amount: newExp.amount,
                type: 'saida',
                category: 'terceiro_tempo',
                referenceId: ttId,
              };
              setTransactions((prev) => [newTx, ...prev]);
              showToast(`Despesa "${newExp.description}" de ${formatBRL(newExp.amount)} adicionada ao 3º tempo!`);
            }}
            onDeleteExpenseFromTT={(ttId, expId) => {
              setTerceirosTempos((prev) =>
                prev.map((tt) => {
                  if (tt.id !== ttId) return tt;
                  const updatedExpenses = tt.expenses.filter((e) => e.id !== expId);
                  const newTotal = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const count = tt.participants.length || 1;
                  const newPerPerson = Math.ceil((newTotal / count) * 100) / 100;
                  return {
                    ...tt,
                    expenses: updatedExpenses,
                    totalCost: newTotal,
                    perPersonCost: newPerPerson,
                    participants: tt.participants.map((p) => ({
                      ...p,
                      shareAmount: newPerPerson,
                    })),
                  };
                })
              );
              showToast('Item de despesa removido e rateio recalculado.');
            }}
          />
        )}

        {activeTab === 'eventos' && (
          <EventosView
            eventos={eventos}
            members={members}
            onSaveEvento={handleSaveEvento}
            onDeleteEvento={handleDeleteEvento}
            onToggleTicketPayment={handleToggleTicketPayment}
            onAddEventoExpense={handleAddEventoExpense}
            onUpdateTicketGuests={(eventoId, ticketId, newGuestCount) => {
              setEventos((prev) =>
                prev.map((ev) => {
                  if (ev.id !== eventoId) return ev;
                  return {
                    ...ev,
                    tickets: ev.tickets.map((t) => {
                      if (t.id !== ticketId) return t;
                      const price = ev.ticketPricePerPerson || 0;
                      const totalAmount = newGuestCount * price;
                      return {
                        ...t,
                        guestCount: newGuestCount,
                        totalAmount,
                        status: newGuestCount === 0 ? 'pago' : t.status,
                      };
                    }),
                  };
                })
              );
            }}
          />
        )}

        {activeTab === 'materiais' && (
          <UniformesMateriaisView
            pedidos={pedidosMateriais}
            members={members}
            onSavePedido={handleSavePedido}
            onDeletePedido={handleDeletePedido}
            onToggleItemPayment={handleToggleItemPayment}
            onAddAthleteToPedido={handleAddAthleteToPedido}
          />
        )}

        {activeTab === 'caixa' && (
          <LivroCaixaView
            transactions={transactions}
            onAddTransaction={(tx) => {
              setTransactions((prev) => [tx, ...prev]);
              showToast('Lançamento adicionado no caixa!');
            }}
            onDeleteTransaction={(id) => {
              setTransactions((prev) => prev.filter((t) => t.id !== id));
              showToast('Lançamento excluído.');
            }}
          />
        )}

        {activeTab === 'relatorios' && (
          <RelatoriosDREView
            transactions={transactions}
            eventos={eventos}
            terceirosTempos={terceirosTempos}
            mensalidades={mensalidades}
          />
        )}

        {activeTab === 'membros' && (
          <MembrosView
            members={members}
            pendingDebts={pendingDebts}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ResenhaPay</span>
            <span>•</span>
            <span>Controle Financeiro, Mensalidades, 3º Tempo & Festas com IA</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Chave Pix padrão: carlao.futebol@email.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
