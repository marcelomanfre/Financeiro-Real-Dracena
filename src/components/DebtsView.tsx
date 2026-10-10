import React, { useState } from 'react';
import {
  AlertTriangle,
  MessageCircle,
  CheckCircle,
  Search,
  Filter,
  DollarSign,
  Clock,
  Sparkles,
  Copy,
  Calendar,
  Beer,
  PartyPopper,
  Check,
  Shirt,
} from 'lucide-react';
import { Member, PendingDebtItem } from '../types';
import { formatBRL, formatDateBR, generateWhatsAppReminder } from '../utils/helpers';

interface DebtsViewProps {
  members: Member[];
  pendingDebts: PendingDebtItem[];
  onManualPay: (debt: PendingDebtItem) => void;
  onOpenScannerWithMember?: (memberId: string) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  members,
  pendingDebts,
  onManualPay,
  onOpenScannerWithMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'mensalidade' | 'terceiro_tempo' | 'evento' | 'material'>('todos');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter debts
  const filteredDebts = pendingDebts.filter((d) => {
    const matchesSearch =
      d.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.memberNickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'todos' || d.category === categoryFilter;
    const matchesOverdue = !onlyOverdue || d.daysLate > 0;

    return matchesSearch && matchesCategory && matchesOverdue;
  });

  // Group filtered debts by member
  const memberGroups = members
    .map((member) => {
      const debtsForMember = filteredDebts.filter((d) => d.memberId === member.id);
      const totalOwed = debtsForMember.reduce((sum, d) => sum + d.amount, 0);
      const maxDaysLate = debtsForMember.reduce((max, d) => Math.max(max, d.daysLate), 0);
      return {
        member,
        debts: debtsForMember,
        totalOwed,
        maxDaysLate,
      };
    })
    .filter((g) => g.debts.length > 0)
    .sort((a, b) => b.maxDaysLate - a.maxDaysLate || b.totalOwed - a.totalOwed);

  const totalPendingAmount = pendingDebts.reduce((sum, d) => sum + d.amount, 0);
  const totalOverdueAmount = pendingDebts.filter((d) => d.daysLate > 0).reduce((sum, d) => sum + d.amount, 0);
  const totalDebtorsCount = new Set(pendingDebts.map((d) => d.memberId)).size;

  const handleCopyText = (group: (typeof memberGroups)[0]) => {
    const total = group.totalOwed;
    const itemsText = group.debts
      .map((d) => `▪️ ${d.title}: ${formatBRL(d.amount)}${d.daysLate > 0 ? ` (${d.daysLate}d atrasado)` : ''}`)
      .join('\n');

    const text = `Fala ${group.member.nickname}, tudo bem? ⚽🍻\n\nResumo de pendências no grupo Resenha:\n${itemsText}\n\n💰 Total: ${formatBRL(
      total
    )}\n🔑 Chave Pix: carlao.futebol@email.com\n\nAssim que fizer a transferência, me mande o comprovante! Valeu!`;

    navigator.clipboard.writeText(text);
    setCopiedId(group.member.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total em Atraso</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{formatBRL(totalOverdueAmount)}</p>
          <p className="text-xs text-rose-600/90 mt-1">
            Débitos com data de vencimento já expirada
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Total a Receber</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-800 mt-2">{formatBRL(totalPendingAmount)}</p>
          <p className="text-xs text-amber-700/90 mt-1">
            Soma de todas as pendências (atrasadas + a vencer)
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Sócios Devedores</span>
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalDebtorsCount} <span className="text-sm font-normal text-slate-500">de {members.length} sócios</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {members.length - totalDebtorsCount} membros estão 100% em dia! 👏
          </p>
        </div>
      </div>

      {/* Info Notice about Batch Baixa vs Manual Adjustment */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Baixa Automática com IA:</strong> O sistema quita automaticamente as mensalidades mais antigas em atraso na aba <strong>Baixa com IA</strong> (aceita múltiplos arquivos e Ctrl+V).
          </span>
        </div>
        <span className="text-[11px] text-emerald-700 font-medium">
          A baixa manual (ícone ✓) é reservada para ajustes.
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, apelido ou item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'mensalidade', label: 'Mensalidades' },
                { id: 'terceiro_tempo', label: '3º Tempo' },
                { id: 'evento', label: 'Eventos/Festas' },
                { id: 'material', label: 'Uniformes/Bolsas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  categoryFilter === tab.id
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              onlyOverdue
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Apenas Vencidos ({pendingDebts.filter((d) => d.daysLate > 0).length})
          </button>
        </div>
      </div>

      {/* Member Debts Cards */}
      {memberGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma pendência encontrada!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Todos os pagamentos desse filtro estão em dia ou não há membros com pendências cadastradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberGroups.map((group) => {
            const waLink = generateWhatsAppReminder(
              group.member.nickname,
              group.member.phone,
              group.debts
            );

            return (
              <div
                key={group.member.id}
                className={`bg-white rounded-2xl border transition-shadow shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between ${
                  group.maxDaysLate > 0 ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div
                  className={`p-4 border-b flex items-start justify-between gap-3 ${
                    group.maxDaysLate > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/70 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
                      {group.member.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{group.member.nickname}</h4>
                        <span className="text-[11px] text-slate-500">({group.member.name.split(' ')[0]})</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{group.member.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Total devido</span>
                    <p className="text-base font-black text-rose-700">{formatBRL(group.totalOwed)}</p>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2.5 flex-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.debts.length} {group.debts.length > 1 ? 'pendências' : 'pendência'}:
                  </div>
                  {group.debts.map((debt) => (
                    <div
                      key={debt.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs group hover:bg-slate-100/80 transition"
                    >
                      <div className="flex items-center gap-2">
                        {debt.category === 'mensalidade' && (
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        {debt.category === 'terceiro_tempo' && (
                          <Beer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        {debt.category === 'evento' && (
                          <PartyPopper className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        )}
                        {debt.category === 'material' && (
                          <Shirt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{debt.title}</p>
                          <span className="text-[10px] text-slate-500">
                            Venc: {formatDateBR(debt.dueDate)}
                            {debt.daysLate > 0 ? (
                              <strong className="text-rose-600 ml-1">({debt.daysLate}d atrasado)</strong>
                            ) : (
                              <span className="text-emerald-700 ml-1">(A vencer)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{formatBRL(debt.amount)}</span>
                        <button
                          type="button"
                          onClick={() => onManualPay(debt)}
                          title="Dar baixa manual neste item"
                          className="p-1 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-700 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Cobrar no WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyText(group)}
                      title="Copiar mensagem para colar em outro lugar"
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs transition"
                    >
                      {copiedId === group.member.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {onOpenScannerWithMember && (
                    <button
                      type="button"
                      onClick={() => onOpenScannerWithMember(group.member.id)}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Subir Pix
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
