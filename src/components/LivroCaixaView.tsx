import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  FileText,
  Tag,
  Trash2,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL, formatDateBR } from '../utils/helpers';

interface LivroCaixaViewProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const LivroCaixaView: React.FC<LivroCaixaViewProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [category, setCategory] = useState<Transaction['category']>('outro');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredTransactions = transactions
    .filter((tx) => {
      const matchesType = filterType === 'todos' || tx.type === filterType;
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalEntradas = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter((t) => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoAtual = totalEntradas - totalSaidas;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date,
      description,
      amount: Number(amount),
      type,
      category,
    };

    onAddTransaction(newTx);
    setIsModalOpen(false);
    setDescription('');
    setAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Atual em Caixa</span>
            <p className={`text-2xl font-black mt-1 ${saldoAtual >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatBRL(saldoAtual)}
            </p>
            <span className="text-xs text-slate-400 mt-0.5 block">Disponível no clube</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${saldoAtual >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total de Entradas</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{formatBRL(totalEntradas)}</p>
            <span className="text-xs text-slate-400 mt-0.5 block">Mensalidades, rateios, festas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total de Saídas</span>
            <p className="text-2xl font-black text-rose-700 mt-1">{formatBRL(totalSaidas)}</p>
            <span className="text-xs text-slate-400 mt-0.5 block">Churrascos, bolas, fornecedores</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar lançamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('entrada')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'entrada' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('saida')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'saida' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Saídas
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Novo Lançamento no Fluxo de Caixa</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição:</label>
                <input
                  type="text"
                  placeholder="Ex: Compra de 2 Bolas Penalty S11"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('entrada')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      type === 'entrada'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('saida')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      type === 'saida'
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Saída
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor (R$):</label>
                <input
                  type="number"
                  step="0.5"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="mensalidade">Mensalidade</option>
                  <option value="terceiro_tempo">3º Tempo / Churrasco</option>
                  <option value="evento">Evento / Festa</option>
                  <option value="patrocinio">Patrocínio</option>
                  <option value="material">Material / Uniforme / Bola</option>
                  <option value="manutencao">Manutenção / Limpeza</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md"
              >
                Salvar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Extrato de Movimentações ({filteredTransactions.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTransactions.map((tx) => {
            const isEntrada = tx.type === 'entrada';

            return (
              <div
                key={tx.id}
                className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isEntrada ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{tx.description}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{formatDateBR(tx.date)}</span>
                      <span>•</span>
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">
                        {tx.category.replace('_', ' ')}
                      </span>
                      {tx.receiptInfo?.bank && (
                        <span>• via {tx.receiptInfo.bank} (Pix)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-black ${
                      isEntrada ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isEntrada ? '+' : '-'} {formatBRL(tx.amount)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
