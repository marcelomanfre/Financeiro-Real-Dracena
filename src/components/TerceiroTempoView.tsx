import React, { useState } from 'react';
import {
  Beer,
  Plus,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Share2,
  Check,
  X,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { Member, TerceiroTempo, TerceiroTempoExpense } from '../types';
import { formatBRL, formatDateBR } from '../utils/helpers';

interface TerceiroTempoViewProps {
  terceirosTempos: TerceiroTempo[];
  members: Member[];
  onSaveTerceiroTempo: (tt: TerceiroTempo) => void;
  onDeleteTerceiroTempo: (id: string) => void;
  onToggleParticipantPayment: (ttId: string, memberId: string) => void;
  onAddExpenseToTT?: (ttId: string, expense: TerceiroTempoExpense) => void;
  onDeleteExpenseFromTT?: (ttId: string, expenseId: string) => void;
}

export const TerceiroTempoView: React.FC<TerceiroTempoViewProps> = ({
  terceirosTempos,
  members,
  onSaveTerceiroTempo,
  onDeleteTerceiroTempo,
  onToggleParticipantPayment,
  onAddExpenseToTT,
  onDeleteExpenseFromTT,
}) => {
  const [selectedTTId, setSelectedTTId] = useState<string>(
    terceirosTempos[0]?.id || ''
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingExpenseActive, setIsAddingExpenseActive] = useState(false);

  // New inline expense for existing 3º Tempo
  const [activeExpDesc, setActiveExpDesc] = useState('');
  const [activeExpAmount, setActiveExpAmount] = useState<number>(0);
  const [activeExpCategory, setActiveExpCategory] = useState<TerceiroTempoExpense['category']>('carne');

  // Form states for new Terceiro Tempo
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    // Default to today or next Wednesday
    return d.toISOString().split('T')[0];
  });
  const [newTitle, setNewTitle] = useState('3º Tempo - Quarta-feira');
  const [newLocation, setNewLocation] = useState('Quiosque da Quadra');
  const [newExpenses, setNewExpenses] = useState<TerceiroTempoExpense[]>([
    { id: '1', description: 'Carnes e Linguiça', amount: 180, category: 'carne' },
    { id: '2', description: 'Cervejas e Refrigerantes', amount: 120, category: 'bebida' },
    { id: '3', description: 'Carvão e Gelo', amount: 40, category: 'gelo_carvao' },
  ]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.slice(0, 8).map((m) => m.id)
  );

  const activeTT = terceirosTempos.find((t) => t.id === selectedTTId) || terceirosTempos[0];

  // Helper for new expense items
  const handleAddExpenseRow = () => {
    setNewExpenses([
      ...newExpenses,
      {
        id: Date.now().toString(),
        description: '',
        amount: 0,
        category: 'carne',
      },
    ]);
  };

  const handleRemoveExpenseRow = (id: string) => {
    setNewExpenses(newExpenses.filter((e) => e.id !== id));
  };

  const handleExpenseChange = (id: string, field: keyof TerceiroTempoExpense, value: any) => {
    setNewExpenses(
      newExpenses.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const toggleSelectMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const totalNewCost = newExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const countParticipants = selectedMemberIds.length || 1;
  const calculatedPerPerson = totalNewCost > 0 ? Math.ceil((totalNewCost / countParticipants) * 100) / 100 : 0;

  const handleSaveNewTT = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberIds.length === 0) {
      alert('Selecione pelo menos 1 participante para o rateio do 3º tempo.');
      return;
    }

    const newTT: TerceiroTempo = {
      id: `tt-${Date.now()}`,
      date: newDate,
      title: newTitle || `3º Tempo - ${formatDateBR(newDate)}`,
      location: newLocation,
      totalCost: totalNewCost,
      perPersonCost: calculatedPerPerson,
      expenses: newExpenses.filter((e) => e.amount > 0),
      participants: selectedMemberIds.map((mId) => ({
        memberId: mId,
        status: 'pendente',
        shareAmount: calculatedPerPerson,
      })),
      notes: `${countParticipants} participantes no rateio (${formatBRL(calculatedPerPerson)} por pessoa).`,
    };

    onSaveTerceiroTempo(newTT);
    setSelectedTTId(newTT.id);
    setIsCreating(false);
  };

  // WhatsApp bulk reminder for this specific 3º Tempo
  const handleShareTTWhatsApp = (tt: TerceiroTempo) => {
    const pendingParticipants = tt.participants.filter((p) => p.status === 'pendente');
    const pendingNames = pendingParticipants
      .map((p) => {
        const m = members.find((x) => x.id === p.memberId);
        return m ? m.nickname : 'Participante';
      })
      .join(', ');

    const text = `Fala galera da Resenha! ⚽🍻

Fechamento do *${tt.title}* (${formatDateBR(tt.date)}):
💰 Gasto total: *${formatBRL(tt.totalCost)}*
👥 Presentes: *${tt.participants.length} participantes*
💵 Rateio individual: *${formatBRL(tt.perPersonCost)} por pessoa*

🔑 Chave Pix do caixa: \`carlao.futebol@email.com\`

⏳ Pendentes de pagamento:
${pendingNames || 'Todos já pagaram! 🎉'}

Manda o comprovante no privado assim que transferir! Valeu!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Beer className="w-6 h-6 text-yellow-100" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Rateio do "3º Tempo" de Quarta-feira
            </h2>
            <p className="text-xs text-amber-100/90 mt-0.5">
              Lance os gastos do churrasco e cerveja da resenha. O sistema divide automaticamente entre quem jogou e bebeu.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-amber-900 font-bold text-xs shadow-md hover:bg-amber-50 transition flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo 3º Tempo
        </button>
      </div>

      {/* Modal / Inline Form to Create New 3º Tempo */}
      {isCreating && (
        <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-xl space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Beer className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base">Cadastrar Novo 3º Tempo (Quarta-feira)</h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveNewTT} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data da Quarta:</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título / Descrição:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: 3º Tempo - Quarta 14/10"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Local:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Churrasqueira do Clube"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Expenses Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Despesas da Resenha (Carnes, Cervejas, etc.)
                </span>
                <button
                  type="button"
                  onClick={handleAddExpenseRow}
                  className="text-xs text-amber-700 hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Item
                </button>
              </div>

              <div className="space-y-2">
                {newExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Picanha, Carvão, Cerveja)"
                      value={exp.description}
                      onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
                    />

                    <select
                      value={exp.category}
                      onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
                    >
                      <option value="carne">Carnes/Comida</option>
                      <option value="bebida">Bebidas/Cerveja</option>
                      <option value="gelo_carvao">Carvão e Gelo</option>
                      <option value="campo_juiz">Juiz/Quadra</option>
                      <option value="limpeza">Limpeza</option>
                      <option value="outro">Outro</option>
                    </select>

                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0,00"
                        value={exp.amount || ''}
                        onChange={(e) => handleExpenseChange(exp.id, 'amount', Number(e.target.value))}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-right focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Participants Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Quem Participou? ({selectedMemberIds.length} selecionados)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds(members.map((m) => m.id))}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {members.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleSelectMember(member.id)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                        isChecked
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{member.nickname}</span>
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculation Summary Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Cálculo do Rateio:</span>
                <p className="text-sm font-medium text-slate-200 mt-0.5">
                  Total de {formatBRL(totalNewCost)} ÷ {countParticipants} pessoas
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-amber-400 font-semibold">Valor por pessoa</span>
                <p className="text-2xl font-black text-amber-400">{formatBRL(calculatedPerPerson)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
              >
                Criar 3º Tempo e Gerar Cobranças
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content: Select Wed and View Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List of Wednesdays */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            Histórico das Quartas-feiras
          </h3>

          <div className="space-y-2">
            {terceirosTempos.map((tt) => {
              const paidCount = tt.participants.filter((p) => p.status === 'pago').length;
              const isSelected = tt.id === activeTT?.id;

              return (
                <div
                  key={tt.id}
                  onClick={() => setSelectedTTId(tt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{tt.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateBR(tt.date)}</p>
                    </div>
                    <span className="text-xs font-black text-slate-800">{formatBRL(tt.totalCost)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                    <span className="text-slate-500">
                      {formatBRL(tt.perPersonCost)} / pessoa ({tt.participants.length} presentes)
                    </span>
                    <span
                      className={`font-bold ${
                        paidCount === tt.participants.length ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {paidCount}/{tt.participants.length} pagos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Wednesday Details */}
        {activeTT && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Beer className="w-3.5 h-3.5" />
                  {formatDateBR(activeTT.date)}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeTT.title}</h3>
                {activeTT.location && (
                  <p className="text-xs text-slate-500">Local: {activeTT.location}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareTTWhatsApp(activeTT)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Divulgar no Grupo (Zap)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este 3º tempo?')) {
                      onDeleteTerceiroTempo(activeTT.id);
                    }
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial Stats of this Wednesday */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Custo Total</span>
                <p className="text-lg font-black text-slate-900 mt-1">{formatBRL(activeTT.totalCost)}</p>
                <span className="text-[10px] text-slate-500">
                  {activeTT.expenses.length} itens de despesa
                </span>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-800">Cota / Cabeça</span>
                <p className="text-lg font-black text-amber-900 mt-1">{formatBRL(activeTT.perPersonCost)}</p>
                <span className="text-[10px] text-amber-700">
                  {activeTT.participants.length} participantes
                </span>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800">Arrecadado</span>
                <p className="text-lg font-black text-emerald-800 mt-1">
                  {formatBRL(
                    activeTT.participants
                      .filter((p) => p.status === 'pago')
                      .reduce((sum, p) => sum + (p.shareAmount || activeTT.perPersonCost), 0)
                  )}
                </p>
                <span className="text-[10px] text-emerald-700">
                  {activeTT.participants.filter((p) => p.status === 'pago').length} de{' '}
                  {activeTT.participants.length} pagos
                </span>
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Beer className="w-3.5 h-3.5 text-amber-600" />
                  Detalhamento dos Gastos desta Quarta:
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingExpenseActive(!isAddingExpenseActive)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Despesa
                </button>
              </div>

              {/* Form to add new expense to active 3º Tempo */}
              {isAddingExpenseActive && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Adicionar Nova Despesa neste 3º Tempo:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingExpenseActive(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Gelo extra, Carvão, Juiz)"
                      value={activeExpDesc}
                      onChange={(e) => setActiveExpDesc(e.target.value)}
                      className="sm:col-span-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />

                    <select
                      value={activeExpCategory}
                      onChange={(e) => setActiveExpCategory(e.target.value as any)}
                      className="bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="carne">Carnes/Comida</option>
                      <option value="bebida">Bebidas/Cerveja</option>
                      <option value="gelo_carvao">Carvão e Gelo</option>
                      <option value="campo_juiz">Juiz/Quadra</option>
                      <option value="limpeza">Limpeza</option>
                      <option value="outro">Outro</option>
                    </select>

                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0,00"
                        value={activeExpAmount || ''}
                        onChange={(e) => setActiveExpAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-right focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeExpDesc || activeExpAmount <= 0) {
                          alert('Informe a descrição e o valor da despesa.');
                          return;
                        }
                        if (onAddExpenseToTT) {
                          onAddExpenseToTT(activeTT.id, {
                            id: `exp-${Date.now()}`,
                            description: activeExpDesc,
                            amount: activeExpAmount,
                            category: activeExpCategory,
                          });
                        }
                        setActiveExpDesc('');
                        setActiveExpAmount(0);
                        setIsAddingExpenseActive(false);
                      }}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Salvar Despesa & Recalcular Rateio
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTT.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs group hover:bg-slate-100/70 transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{exp.description}</p>
                      <span className="text-[10px] text-slate-500 capitalize">{exp.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{formatBRL(exp.amount)}</span>
                      {onDeleteExpenseFromTT && activeTT.expenses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteExpenseFromTT(activeTT.id, exp.id)}
                          title="Excluir este item de gasto"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Participants Status List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Controle de Pagamentos dos Participantes:
                </h4>
                <span className="text-xs text-slate-500">
                  Clique no status para alternar entre Pago e Pendente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeTT.participants.map((p) => {
                  const member = members.find((m) => m.id === p.memberId);
                  const isPaid = p.status === 'pago';

                  return (
                    <div
                      key={p.memberId}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        isPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {member ? member.nickname.slice(0, 2).toUpperCase() : '??'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {member ? member.nickname : 'Membro'}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            Cota: {formatBRL(p.shareAmount || activeTT.perPersonCost)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleParticipantPayment(activeTT.id, p.memberId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isPaid
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                            : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" /> Pendente
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
