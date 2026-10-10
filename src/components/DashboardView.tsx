import React from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Beer,
  PartyPopper,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Shirt,
} from 'lucide-react';
import {
  Member,
  MensalidadeRecord,
  TerceiroTempo,
  Evento,
  Transaction,
  PendingDebtItem,
} from '../types';
import { formatBRL, formatDateBR, generateWhatsAppReminder } from '../utils/helpers';

interface DashboardViewProps {
  members: Member[];
  mensalidades: MensalidadeRecord[];
  terceirosTempos: TerceiroTempo[];
  eventos: Evento[];
  transactions: Transaction[];
  pendingDebts: PendingDebtItem[];
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  mensalidades,
  terceirosTempos,
  eventos,
  transactions,
  pendingDebts,
  onNavigateTab,
  onOpenScanner,
}) => {
  // Financial calculations
  const totalEntradas = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter((t) => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoCaixa = totalEntradas - totalSaidas;

  const totalEmAtraso = pendingDebts
    .filter((d) => d.daysLate > 0)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPendenteGeral = pendingDebts.reduce((sum, d) => sum + d.amount, 0);

  // Group top debtors
  const debtorMap = new Map<string, { member: Member; amount: number; itemsCount: number }>();
  pendingDebts.forEach((debt) => {
    const existing = debtorMap.get(debt.memberId);
    const member = members.find((m) => m.id === debt.memberId);
    if (!member) return;

    if (existing) {
      existing.amount += debt.amount;
      existing.itemsCount += 1;
    } else {
      debtorMap.set(debt.memberId, {
        member,
        amount: debt.amount,
        itemsCount: 1,
      });
    }
  });

  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Latest 3º Tempo
  const latestTT = terceirosTempos[0];
  const latestTTPaidCount =
    latestTT?.participants.filter((p) => p.status === 'pago').length || 0;

  // Active / Upcoming Event
  const activeEvent = eventos.find((e) => e.status === 'em_andamento') || eventos[0];

  return (
    <div className="space-y-6">
      {/* Hero AI & Quick Action Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              IA Integrada com Visão Computacional
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Gestão Financeira & Controle do 3º Tempo
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Membros mandaram comprovante no zap? Faça o upload do print ou recibo Pix e deixe a inteligência artificial dar baixa automática nos débitos e rateios.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onOpenScanner}
              className="px-5 py-3 rounded-2xl bg-white text-emerald-900 font-black text-xs shadow-lg hover:bg-emerald-50 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Escanear Pix
            </button>
            <button
              onClick={() => onNavigateTab('devedores')}
              className="px-4 py-3 rounded-2xl bg-emerald-600/60 hover:bg-emerald-600/80 border border-emerald-400/40 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              Ver Atrasados
            </button>
            <button
              onClick={() => onNavigateTab('relatorios')}
              className="px-4 py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-emerald-400/30 text-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              Ver DRE & Fluxo
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Atual */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo do Caixa</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900">{formatBRL(saldoCaixa)}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="text-emerald-700 font-semibold">+{formatBRL(totalEntradas)}</span> entradas
              <span>•</span>
              <span className="text-rose-600 font-semibold">-{formatBRL(totalSaidas)}</span> saídas
            </div>
          </div>
        </div>

        {/* Em Atraso */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total em Atraso</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-rose-700">{formatBRL(totalEmAtraso)}</p>
            <p className="text-[11px] text-rose-600/90 mt-1 font-medium">
              {pendingDebts.filter((d) => d.daysLate > 0).length} débitos vencidos precisando de cobrança
            </p>
          </div>
        </div>

        {/* Total a Receber */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Total a Receber</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-amber-800">{formatBRL(totalPendenteGeral)}</p>
            <p className="text-[11px] text-amber-700/90 mt-1">
              Mensalidades + 3º tempo + festas do ano
            </p>
          </div>
        </div>

        {/* Sócios Cadastrados */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Membros Ativos</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900">{members.length} membros</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {members.length - debtorMap.size} estão 100% em dia com o grupo
            </p>
          </div>
        </div>
      </div>

      {/* Two Columns: Left (Overdue & Collection Alerts) / Right (Wednesday 3º Tempo & Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overdue Members Alert */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Controle Rápido de Inadimplência (Quem mais deve)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('devedores')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              Ver todos ({debtorMap.size}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topDebtors.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Nenhum sócio em atraso no momento!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topDebtors.map(({ member, amount, itemsCount }) => {
                const memberDebts = pendingDebts.filter((d) => d.memberId === member.id);
                const waLink = generateWhatsAppReminder(
                  member.nickname,
                  member.phone,
                  memberDebts
                );

                return (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between gap-3 hover:bg-rose-50/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {member.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{member.nickname}</h4>
                          <span className="text-[11px] text-slate-500">({member.name.split(' ')[0]})</span>
                        </div>
                        <span className="text-[11px] text-rose-700 font-medium">
                          {itemsCount} {itemsCount > 1 ? 'pendências em aberto' : 'pendência em aberto'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-rose-700">{formatBRL(amount)}</span>
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Cobrar
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Resenha de Quarta-feira & Eventos */}
        <div className="space-y-4">
          {/* Latest 3º Tempo Card */}
          {latestTT && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Beer className="w-4 h-4 text-amber-600" />
                  Último 3º Tempo
                </span>
                <span className="text-[11px] text-slate-500">{formatDateBR(latestTT.date)}</span>
              </div>

              <h4 className="text-sm font-bold text-slate-900">{latestTT.title}</h4>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Total Gasto</span>
                  <strong className="text-slate-800">{formatBRL(latestTT.totalCost)}</strong>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg">
                  <span className="text-[10px] text-amber-700 block">Rateio / Pessoa</span>
                  <strong className="text-amber-900">{formatBRL(latestTT.perPersonCost)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {latestTTPaidCount} de {latestTT.participants.length} pagaram
                </span>
                <button
                  onClick={() => onNavigateTab('terceiro_tempo')}
                  className="font-bold text-amber-700 hover:underline text-[11px]"
                >
                  Abrir Rateio →
                </button>
              </div>
            </div>
          )}

          {/* Active Event Card */}
          {activeEvent && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <PartyPopper className="w-4 h-4 text-purple-600" />
                  Próxima Grande Festa
                </span>
                <span className="text-[11px] text-slate-500">{formatDateBR(activeEvent.date)}</span>
              </div>

              <h4 className="text-sm font-bold text-slate-900">{activeEvent.name}</h4>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Orçamento Meta</span>
                  <strong className="text-slate-800">{formatBRL(activeEvent.targetBudget)}</strong>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <span className="text-[10px] text-purple-700 block">Preço do Convite</span>
                  <strong className="text-purple-900">{formatBRL(activeEvent.ticketPricePerPerson)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {activeEvent.tickets.filter((t) => t.status === 'pago').length} sócios já garantiram
                </span>
                <button
                  onClick={() => onNavigateTab('eventos')}
                  className="font-bold text-purple-700 hover:underline text-[11px]"
                >
                  Ver Balanço →
                </button>
              </div>
            </div>
          )}

          {/* Uniformes & Encomendas Coletivas Card */}
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                <Shirt className="w-4 h-4 text-blue-600" />
                Uniformes & Encomendas
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">Rateio c/ Atletas</span>
            </div>

            <h4 className="text-sm font-bold text-slate-900">Kits de Jogo, Mochilas & Materiais</h4>
            <p className="text-xs text-slate-500">
              Controle o custo da fábrica, o subsídio pago pelo clube e a cota cobrada de cada atleta.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Acompanhe quem pagou o kit
              </span>
              <button
                onClick={() => onNavigateTab('materiais')}
                className="font-bold text-blue-700 hover:underline text-[11px] cursor-pointer"
              >
                Abrir Encomendas →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cashflow Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Últimas Movimentações no Livro Caixa</h3>
          <button
            onClick={() => onNavigateTab('caixa')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            Ver Extrato Completo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.slice(0, 5).map((tx) => {
            const isEntrada = tx.type === 'entrada';
            return (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isEntrada ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{tx.description}</p>
                    <span className="text-[10px] text-slate-400">{formatDateBR(tx.date)}</span>
                  </div>
                </div>

                <span
                  className={`font-black ${
                    isEntrada ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isEntrada ? '+' : '-'} {formatBRL(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
