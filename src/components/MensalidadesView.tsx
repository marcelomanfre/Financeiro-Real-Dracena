import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Check,
} from 'lucide-react';
import { Member, MensalidadeRecord } from '../types';
import {
  formatBRL,
  formatDateBR,
  getMonthNameBR,
  formatSecondWednesdayLabel,
  getSecondWednesdayOfMonth,
} from '../utils/helpers';

interface MensalidadesViewProps {
  mensalidades: MensalidadeRecord[];
  members: Member[];
  onToggleStatus: (recordId: string) => void;
  onGenerateNextMonth: (monthYear: string, standardAmount: number) => void;
  onUpdateRecordAmount?: (recordId: string, newAmount: number) => void;
  onApplyStandardAmountToMonth?: (monthYear: string, amount: number) => void;
}

export const MensalidadesView: React.FC<MensalidadesViewProps> = ({
  mensalidades,
  members,
  onToggleStatus,
  onGenerateNextMonth,
  onUpdateRecordAmount,
  onApplyStandardAmountToMonth,
}) => {
  // Current selected month: default to "2026-10"
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [standardAmount, setStandardAmount] = useState(80);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<number>(80);

  // Available months
  const availableMonths = Array.from(new Set(mensalidades.map((m) => m.monthYear))).sort().reverse();
  if (!availableMonths.includes(selectedMonth)) {
    availableMonths.unshift(selectedMonth);
  }

  // Filter records for selected month
  const monthRecords = mensalidades.filter((m) => m.monthYear === selectedMonth);

  const filteredRecords = monthRecords.filter((rec) => {
    const member = members.find((m) => m.id === rec.memberId);
    if (!member) return false;

    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.nickname.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'todos' || rec.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Month Statistics
  const totalArrecadado = monthRecords
    .filter((r) => r.status === 'pago')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalEmAberto = monthRecords
    .filter((r) => r.status === 'pendente' || r.status === 'atrasado')
    .reduce((sum, r) => sum + r.amount, 0);

  const countTotal = monthRecords.length || 1;
  const countPagos = monthRecords.filter((r) => r.status === 'pago').length;
  const adimplenciaRate = Math.round((countPagos / countTotal) * 100);

  const handleNextMonthGenerator = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = Number(yearStr);
    let m = Number(monthStr) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const nextMonthStr = `${y}-${String(m).padStart(2, '0')}`;
    onGenerateNextMonth(nextMonthStr, standardAmount);
    setSelectedMonth(nextMonthStr);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigator Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Controle de Mensalidades dos Sócios
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhe quem pagou a mensalidade do clube e quem está pendente.
            </p>
          </div>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {getMonthNameBR(m)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonthGenerator}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Gerar Próximo Mês
          </button>
        </div>
      </div>

      {/* 2nd Wednesday Due Date Rule Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              Regra Oficial do Clube: Vencimento na 2ª Quarta-Feira de Cada Mês
              <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                Automático
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Vencimento oficial de <strong>{getMonthNameBR(selectedMonth)}</strong>: <strong className="text-blue-800">{formatSecondWednesdayLabel(selectedMonth)}</strong>.
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-600 bg-white/90 px-3 py-1.5 rounded-xl border border-blue-200 font-medium">
          💡 A baixa principal é automática pelo leitor de comprovantes. A baixa manual abaixo é reservada para ajustes.
        </div>
      </div>

      {/* Fee Settings Toolbar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            R$
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Definir Valor Padrão da Mensalidade</h4>
            <p className="text-[11px] text-slate-500">
              Ajuste o valor base cobrado dos sócios para o mês atual ou novos meses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-32">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
            <input
              type="number"
              step="5"
              value={standardAmount || ''}
              onChange={(e) => setStandardAmount(Number(e.target.value))}
              className="w-full pl-8 pr-2 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (onApplyStandardAmountToMonth) {
                onApplyStandardAmountToMonth(selectedMonth, standardAmount);
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Atualizar neste Mês
          </button>
        </div>
      </div>

      {/* Month Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Arrecadado ({getMonthNameBR(selectedMonth)})
          </span>
          <p className="text-2xl font-black text-emerald-800 mt-1">{formatBRL(totalArrecadado)}</p>
          <span className="text-xs text-emerald-700 mt-0.5 block">
            {countPagos} de {monthRecords.length} mensalidades pagas
          </span>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
            Em Aberto / Atrasado
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">{formatBRL(totalEmAberto)}</p>
          <span className="text-xs text-rose-600 mt-0.5 block">
            {monthRecords.length - countPagos} sócios ainda devem pagar
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
            Taxa de Adimplência
          </span>
          <p className="text-2xl font-black text-blue-800 mt-1">{adimplenciaRate}%</p>
          <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${adimplenciaRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar sócio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'pago', label: 'Pagos' },
              { id: 'pendente', label: 'A Vencer' },
              { id: 'atrasado', label: 'Atrasados' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 sm:flex-none ${
                filterStatus === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Mensalidades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRecords.map((record) => {
          const member = members.find((m) => m.id === record.memberId);
          if (!member) return null;

          const isPaid = record.status === 'pago';
          const isLate = record.status === 'atrasado';

          return (
            <div
              key={record.id}
              className={`bg-white rounded-2xl p-4 border transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
                isPaid
                  ? 'border-emerald-200'
                  : isLate
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : isLate
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {member.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{member.nickname}</h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{member.name}</p>
                    </div>
                  </div>

                  {editingRecordId === record.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={tempAmount}
                        onChange={(e) => setTempAmount(Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 border border-blue-400 rounded text-xs font-black text-slate-900 bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateRecordAmount) onUpdateRecordAmount(record.id, tempAmount);
                          setEditingRecordId(null);
                        }}
                        className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(record.id);
                        setTempAmount(record.amount);
                      }}
                      title="Clique para alterar o valor individual deste sócio"
                      className="text-sm font-black text-slate-900 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {formatBRL(record.amount)}
                      <span className="text-[10px] text-slate-400 font-normal">✎</span>
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Vencimento:</span>
                    <span className="font-semibold text-slate-700">{formatDateBR(record.dueDate)}</span>
                  </div>

                  {record.paidDate && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Pago em:</span>
                      <span className="font-semibold">{formatDateBR(record.paidDate)} via {record.paymentMethod || 'PIX'}</span>
                    </div>
                  )}

                  {record.notes && (
                    <p className="text-[10px] text-slate-400 italic mt-1">{record.notes}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800'
                      : isLate
                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isPaid ? '✓ Pago' : isLate ? '⚠ Atrasado' : '⏳ A Vencer'}
                </span>

                <button
                  type="button"
                  onClick={() => onToggleStatus(record.id)}
                  title="Ajuste manual da tesouraria (o sistema faz a baixa automática ao ler comprovantes)"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isPaid
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isPaid ? 'Ajuste: Desfazer Baixa' : 'Ajuste: Baixa Manual'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
