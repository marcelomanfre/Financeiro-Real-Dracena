import React, { useState } from 'react';
import {
  PartyPopper,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  PlusCircle,
  X,
  MessageCircle,
} from 'lucide-react';
import { Evento, EventoExpense, EventoTicket, Member } from '../types';
import { formatBRL, formatDateBR } from '../utils/helpers';

interface EventosViewProps {
  eventos: Evento[];
  members: Member[];
  onSaveEvento: (evento: Evento) => void;
  onDeleteEvento: (id: string) => void;
  onToggleTicketPayment: (eventoId: string, ticketId: string) => void;
  onAddEventoExpense: (eventoId: string, expense: EventoExpense) => void;
  onUpdateTicketGuests?: (eventoId: string, ticketId: string, newGuestCount: number) => void;
}

export const EventosView: React.FC<EventosViewProps> = ({
  eventos,
  members,
  onSaveEvento,
  onDeleteEvento,
  onToggleTicketPayment,
  onAddEventoExpense,
  onUpdateTicketGuests,
}) => {
  const [selectedEventoId, setSelectedEventoId] = useState<string>(
    eventos[0]?.id || ''
  );
  const [isCreatingEvento, setIsCreatingEvento] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // New Event Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Evento['category']>('fim_de_ano');
  const [newDate, setNewDate] = useState('2026-12-20');
  const [newBudget, setNewBudget] = useState(5000);
  const [newTicketPrice, setNewTicketPrice] = useState(120);
  const [newNotes, setNewNotes] = useState('');

  // New Expense Form State
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expCategory, setExpCategory] = useState('Buffet/Comida');
  const [expSupplier, setExpSupplier] = useState('');

  const activeEvento = eventos.find((e) => e.id === selectedEventoId) || eventos[0];

  const handleCreateEventoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    // Automatically create ticket reservations for active members (athlete is 100% free by the club)
    const initialTickets: EventoTicket[] = members.map((m) => ({
      id: `t-${m.id}-${Date.now()}`,
      memberId: m.id,
      memberName: m.name,
      guestCount: 0, // padrão: só o atleta (isento pelo clube)
      totalAmount: 0,
      status: 'pago',
    }));

    const novoEvento: Evento = {
      id: `evt-${Date.now()}`,
      name: newName,
      category: newCategory,
      date: newDate,
      targetBudget: Number(newBudget),
      ticketPricePerPerson: Number(newTicketPrice),
      status: 'em_andamento',
      expenses: [],
      tickets: initialTickets,
      notes: newNotes,
    };

    onSaveEvento(novoEvento);
    setSelectedEventoId(novoEvento.id);
    setIsCreatingEvento(false);
    setNewName('');
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !expDescription || expAmount <= 0) return;

    const newExp: EventoExpense = {
      id: `exp-${Date.now()}`,
      description: expDescription,
      amount: Number(expAmount),
      category: expCategory,
      supplier: expSupplier,
      paidDate: new Date().toISOString().split('T')[0],
    };

    onAddEventoExpense(activeEvento.id, newExp);
    setIsAddingExpense(false);
    setExpDescription('');
    setExpAmount(0);
    setExpSupplier('');
  };

  // Calculations for active event
  const totalExpenses = activeEvento?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalConvidadosExtras =
    activeEvento?.tickets.reduce((sum, t) => sum + (t.guestCount || 0), 0) || 0;
  const totalArrecadadoConvidados =
    activeEvento?.tickets
      .filter((t) => t.status === 'pago' && t.guestCount > 0)
      .reduce((sum, t) => sum + t.totalAmount, 0) || 0;
  const totalPendenteConvidados =
    activeEvento?.tickets
      .filter((t) => t.status === 'pendente' && t.guestCount > 0)
      .reduce((sum, t) => sum + t.totalAmount, 0) || 0;
  const custoLiquidoClube = totalExpenses - totalArrecadadoConvidados;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <PartyPopper className="w-6 h-6 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Eventos Especiais & Festas do Ano
            </h2>
            <p className="text-xs text-purple-200/90 mt-0.5">
              A festa dos atletas é por conta do clube! Cobrança gerada exclusivamente quando o atleta leva convidados extras.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreatingEvento(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs shadow-md hover:bg-purple-50 transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Festa / Evento
        </button>
      </div>

      {/* Create Event Modal */}
      {isCreatingEvento && (
        <div className="bg-white rounded-2xl p-6 border-2 border-purple-300 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PartyPopper className="w-4 h-4 text-purple-600" />
              Criar Novo Evento / Festa do Ano
            </h3>
            <button
              onClick={() => setIsCreatingEvento(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateEventoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Evento:</label>
                <input
                  type="text"
                  placeholder="Ex: Festa de Confraternização de Fim de Ano"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="fim_de_ano">Festa de Fim de Ano</option>
                  <option value="dia_dos_pais">Dia dos Pais</option>
                  <option value="dia_das_maes">Dia das Mães</option>
                  <option value="torneio">Torneio Interno</option>
                  <option value="outro">Outro Evento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data:</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Orçamento Planejado (R$):</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor do Convite/Pessoa (R$):</label>
                <input
                  type="number"
                  value={newTicketPrice}
                  onChange={(e) => setNewTicketPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observações:</label>
              <input
                type="text"
                placeholder="Ex: Chopp artesanal, banda ao vivo e pula-pula liberado."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingEvento(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md"
              >
                Salvar Evento e Gerar Convites
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Events Selector on Left, Event Dashboard on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Events Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            Eventos do Calendário
          </h3>

          <div className="space-y-2">
            {eventos.map((ev) => {
              const isSelected = ev.id === activeEvento?.id;
              const pendingCount = ev.tickets.filter((t) => t.status === 'pendente').length;

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventoId(ev.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
                    isSelected
                      ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{ev.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateBR(ev.date)}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ev.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {ev.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Convite: {formatBRL(ev.ticketPricePerPerson)}</span>
                    <span
                      className={`font-semibold ${
                        pendingCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {pendingCount > 0 ? `${pendingCount} convites a receber` : '100% quitado'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Event Dashboard & Balanço */}
        {activeEvento && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                  <PartyPopper className="w-3.5 h-3.5" />
                  {formatDateBR(activeEvento.date)}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeEvento.name}</h3>
                {activeEvento.notes && (
                  <p className="text-xs text-slate-500 mt-0.5">{activeEvento.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Lançar Despesa do Evento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este evento?')) {
                      onDeleteEvento(activeEvento.id);
                    }
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Convidados Extras</span>
                <p className="text-base font-black text-slate-900 mt-1">{totalConvidadosExtras} convidados</p>
                <span className="text-[10px] text-slate-500">
                  {activeEvento.ticketPricePerPerson ? `${formatBRL(activeEvento.ticketPricePerPerson)} cada` : 'Por convidado'}
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Arrecadação Convidados</span>
                <p className="text-base font-black text-emerald-700 mt-1">{formatBRL(totalArrecadadoConvidados)}</p>
                <span className="text-[10px] text-slate-500">
                  {totalPendenteConvidados > 0 ? `${formatBRL(totalPendenteConvidados)} a receber` : 'Todos em dia'}
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Despesas da Festa (Clube)</span>
                <p className="text-base font-black text-rose-700 mt-1">{formatBRL(totalExpenses)}</p>
                <span className="text-[10px] text-slate-500">
                  Meta: {formatBRL(activeEvento.targetBudget)}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  custoLiquidoClube <= 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-purple-50/70 border-purple-200'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-purple-600" />
                  Custo Líquido p/ Clube
                </span>
                <p className="text-base font-black text-purple-900 mt-1">
                  {formatBRL(custoLiquidoClube)}
                </p>
                <span className="text-[10px] text-slate-500">
                  Gasto total menos convidados
                </span>
              </div>
            </div>

            {/* Modal to add Expense */}
            {isAddingExpense && (
              <form
                onSubmit={handleAddExpenseSubmit}
                className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900">
                    Lançar Nova Despesa para: {activeEvento.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Descrição (ex: Banda de Pagode, Chopp)"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="sm:col-span-2 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    required
                  />

                  <input
                    type="number"
                    step="0.5"
                    placeholder="Valor R$"
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs font-bold text-right focus:outline-none"
                    required
                  />

                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="bg-white border border-purple-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Buffet/Comida">Buffet/Comida</option>
                    <option value="Bebidas/Chopp">Bebidas/Chopp</option>
                    <option value="Local/Chácara">Local/Chácara</option>
                    <option value="Música/DJ">Música/DJ</option>
                    <option value="Brinquedos/Kids">Brinquedos/Kids</option>
                    <option value="Brindes/Decoração">Brindes/Decoração</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                  >
                    Salvar Despesa
                  </button>
                </div>
              </form>
            )}

            {/* Expenses Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Gastos Realizados no Evento:
              </h4>

              {activeEvento.expenses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhuma despesa lançada ainda.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeEvento.expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{exp.description}</p>
                        <span className="text-[10px] text-slate-500">
                          {exp.category} {exp.supplier ? `• ${exp.supplier}` : ''}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800">{formatBRL(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets & Ingressos by Member */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    Atletas e Controle de Convidados Extras
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    O atleta é 100% isento (festa paga pelo clube). Use os botões <strong className="text-slate-700">+</strong> e <strong className="text-slate-700">-</strong> para marcar quantos convidados extras ele levou.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  {formatBRL(activeEvento.ticketPricePerPerson)} / convidado
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeEvento.tickets.map((ticket) => {
                  const member = members.find((m) => m.id === ticket.memberId);
                  const isPaid = ticket.status === 'pago';
                  const hasGuests = ticket.guestCount > 0;

                  return (
                    <div
                      key={ticket.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                        !hasGuests
                          ? 'bg-slate-50/70 border-slate-200'
                          : isPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              !hasGuests
                                ? 'bg-slate-200 text-slate-700'
                                : isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {member ? member.nickname.slice(0, 2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {member ? member.nickname : ticket.memberName}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {!hasGuests
                                ? 'Atleta presente (100% coberto pelo clube)'
                                : `${ticket.guestCount} convidado(s) extra(s) a pagar`}
                            </span>
                          </div>
                        </div>

                        {/* Guest Stepper */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-xs">
                          <span className="text-[10px] text-slate-400 font-bold mr-1">Convidados:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ticket.guestCount > 0 && onUpdateTicketGuests) {
                                onUpdateTicketGuests(activeEvento.id, ticket.id, ticket.guestCount - 1);
                              }
                            }}
                            disabled={ticket.guestCount === 0}
                            title="Remover 1 convidado"
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-black text-slate-900">
                            {ticket.guestCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateTicketGuests) {
                                onUpdateTicketGuests(activeEvento.id, ticket.id, ticket.guestCount + 1);
                              }
                            }}
                            title="Adicionar convidado extra"
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Bottom Status & Amount */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                        <div>
                          {!hasGuests ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              ✓ Isento (Festa por conta do clube)
                            </span>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-slate-700">A pagar: </span>
                              <strong className="text-slate-900 font-black">
                                {formatBRL(ticket.totalAmount)}
                              </strong>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({ticket.guestCount}x {formatBRL(activeEvento.ticketPricePerPerson)})
                              </span>
                            </div>
                          )}
                        </div>

                        {hasGuests && (
                          <button
                            type="button"
                            onClick={() => onToggleTicketPayment(activeEvento.id, ticket.id)}
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
                        )}
                      </div>
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
