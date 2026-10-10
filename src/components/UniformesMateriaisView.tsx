import React, { useState } from 'react';
import {
  Shirt,
  ShoppingBag,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Users,
  Check,
  X,
  MessageCircle,
  Package,
} from 'lucide-react';
import { Member, PedidoMaterial, PedidoMaterialItem } from '../types';
import { formatBRL, formatDateBR } from '../utils/helpers';

interface UniformesMateriaisViewProps {
  pedidos: PedidoMaterial[];
  members: Member[];
  onSavePedido: (pedido: PedidoMaterial) => void;
  onDeletePedido: (id: string) => void;
  onToggleItemPayment: (pedidoId: string, itemId: string) => void;
  onAddAthleteToPedido: (pedidoId: string, item: PedidoMaterialItem) => void;
}

export const UniformesMateriaisView: React.FC<UniformesMateriaisViewProps> = ({
  pedidos,
  members,
  onSavePedido,
  onDeletePedido,
  onToggleItemPayment,
  onAddAthleteToPedido,
}) => {
  const [selectedPedidoId, setSelectedPedidoId] = useState<string>(
    pedidos[0]?.id || ''
  );
  const [isCreating, setIsCreating] = useState(false);

  // Form states for new order
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PedidoMaterial['category']>('uniforme');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSupplier, setNewSupplier] = useState('');
  const [newManufacturerCost, setNewManufacturerCost] = useState<number>(1800);
  const [newClubSubsidy, setNewClubSubsidy] = useState<number>(600);
  const [newPricePerAthlete, setNewPricePerAthlete] = useState<number>(120);
  const [newNotes, setNewNotes] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.slice(0, 8).map((m) => m.id)
  );

  const activePedido = pedidos.find((p) => p.id === selectedPedidoId) || pedidos[0];

  const toggleMemberSelection = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const initialItems: PedidoMaterialItem[] = selectedMemberIds.map((mId) => {
      const mem = members.find((m) => m.id === mId);
      return {
        id: `item-${mId}-${Date.now()}`,
        memberId: mId,
        memberName: mem ? mem.nickname : 'Atleta',
        itemDetails: newCategory === 'uniforme' ? 'Tamanho G' : 'Padrão',
        amount: Number(newPricePerAthlete),
        status: 'pendente',
      };
    });

    const novoPedido: PedidoMaterial = {
      id: `ped-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      date: newDate,
      supplier: newSupplier,
      totalManufacturerCost: Number(newManufacturerCost),
      clubSubsidy: Number(newClubSubsidy),
      pricePerAthlete: Number(newPricePerAthlete),
      items: initialItems,
      notes: newNotes,
    };

    onSavePedido(novoPedido);
    setSelectedPedidoId(novoPedido.id);
    setIsCreating(false);
    setNewTitle('');
  };

  // Calculations for active order
  const totalArrecadado =
    activePedido?.items
      .filter((i) => i.status === 'pago')
      .reduce((sum, i) => sum + i.amount, 0) || 0;

  const totalPendente =
    activePedido?.items
      .filter((i) => i.status === 'pendente')
      .reduce((sum, i) => sum + i.amount, 0) || 0;

  const totalAtletas = activePedido?.items.length || 0;
  const totalPagos = activePedido?.items.filter((i) => i.status === 'pago').length || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Shirt className="w-6 h-6 text-blue-200" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Uniformes, Bolsas & Encomendas Coletivas
            </h2>
            <p className="text-xs text-blue-200/90 mt-0.5">
              Controle encomendas custeadas em parte pelos atletas e em parte subsidiadas pelo clube.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-md hover:bg-blue-50 transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido Coletivo
        </button>
      </div>

      {/* Modal / Form to create new collective order */}
      {isCreating && (
        <div className="bg-white rounded-2xl p-6 border-2 border-blue-300 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Cadastrar Novo Pedido de Uniformes / Bolsas / Materiais
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Título do Pedido:</label>
                <input
                  type="text"
                  placeholder="Ex: Jogo de Uniformes Oficial 2026 (Camisa, Calção e Meião)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Material:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="uniforme">Uniforme Completo / Camisas</option>
                  <option value="bolsa">Bolsas / Mochilas Personalizadas</option>
                  <option value="agasalho">Agasalhos / Corta-vento</option>
                  <option value="material_esportivo">Outro Material Esportivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fornecedor / Confecção:</label>
                <input
                  type="text"
                  placeholder="Ex: Kanxa Esportes, Gráfica Central"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custo Total da Fábrica (R$):</label>
                <input
                  type="number"
                  value={newManufacturerCost}
                  onChange={(e) => setNewManufacturerCost(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subsídio Pago pelo Clube (R$):</label>
                <input
                  type="number"
                  value={newClubSubsidy}
                  onChange={(e) => setNewClubSubsidy(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400">Parte coberta pelo caixa do grupo</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cota a Pagar por Atleta (R$):</label>
                <input
                  type="number"
                  value={newPricePerAthlete}
                  onChange={(e) => setNewPricePerAthlete(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-right text-blue-700 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400">Valor cobrado de cada sócio</span>
              </div>
            </div>

            {/* Select Members who ordered */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 block">
                Atletas que Encomendaram ({selectedMemberIds.length} selecionados):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {members.map((m) => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMemberSelection(m.id)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                        isChecked
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{m.nickname}</span>
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Criar Pedido e Gerar Cobranças aos Atletas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Order View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Orders List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            Pedidos e Encomendas Cadastradas
          </h3>

          <div className="space-y-2">
            {pedidos.map((ped) => {
              const isSelected = ped.id === activePedido?.id;
              const pendingCount = ped.items.filter((i) => i.status === 'pendente').length;

              return (
                <div
                  key={ped.id}
                  onClick={() => setSelectedPedidoId(ped.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{ped.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateBR(ped.date)}</p>
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      {formatBRL(ped.pricePerAthlete)}/atleta
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                    <span className="text-slate-500">
                      Fábrica: {formatBRL(ped.totalManufacturerCost)} (Clube: {formatBRL(ped.clubSubsidy)})
                    </span>
                    <span
                      className={`font-semibold ${
                        pendingCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {pendingCount > 0 ? `${pendingCount} a pagar` : '100% pago'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Order Details */}
        {activePedido && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  {activePedido.category === 'bolsa' ? <ShoppingBag className="w-3.5 h-3.5" /> : <Shirt className="w-3.5 h-3.5" />}
                  {formatDateBR(activePedido.date)} • {activePedido.supplier || 'Confecção'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{activePedido.title}</h3>
                {activePedido.notes && (
                  <p className="text-xs text-slate-500 mt-0.5">{activePedido.notes}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este pedido?')) {
                    onDeletePedido(activePedido.id);
                  }
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Split Cards (Fábrica vs Clube vs Atletas) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Total com a Fábrica</span>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatBRL(activePedido.totalManufacturerCost)}
                </p>
                <span className="text-[10px] text-slate-500">Custo integral</span>
              </div>

              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                <span className="text-[11px] font-semibold text-blue-800">Pago pelo Clube</span>
                <p className="text-base font-black text-blue-900 mt-1">
                  {formatBRL(activePedido.clubSubsidy)}
                </p>
                <span className="text-[10px] text-blue-700">Subsídio do caixa</span>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800">Arrecadado dos Atletas</span>
                <p className="text-base font-black text-emerald-800 mt-1">{formatBRL(totalArrecadado)}</p>
                <span className="text-[10px] text-emerald-700">
                  {totalPagos} de {totalAtletas} já pagaram
                </span>
              </div>

              <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-700">A Receber dos Atletas</span>
                <p className="text-base font-black text-rose-700 mt-1">{formatBRL(totalPendente)}</p>
                <span className="text-[10px] text-rose-600">
                  {totalAtletas - totalPagos} atletas pendentes
                </span>
              </div>
            </div>

            {/* Athletes Roster & Payments */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Atletas e Controle de Pagamento da Encomenda:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cota de <strong className="text-slate-800">{formatBRL(activePedido.pricePerAthlete)}</strong> por atleta. Clique no status para dar baixa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activePedido.items.map((item) => {
                  const member = members.find((m) => m.id === item.memberId);
                  const isPaid = item.status === 'pago';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        isPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {member ? member.nickname.slice(0, 2).toUpperCase() : '??'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {member ? member.nickname : item.memberName}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {item.itemDetails || 'Item'} • <strong className="text-slate-800">{formatBRL(item.amount)}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleItemPayment(activePedido.id, item.id)}
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
