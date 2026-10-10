import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Key,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Member, PendingDebtItem } from '../types';
import { formatDateBR } from '../utils/helpers';

interface MembrosViewProps {
  members: Member[];
  pendingDebts: PendingDebtItem[];
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
}

export const MembrosView: React.FC<MembrosViewProps> = ({
  members,
  pendingDebts,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [role, setRole] = useState<Member['role']>('socio');
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setEditingMember(null);
    setName('');
    setNickname('');
    setPhone('');
    setPixKey('');
    setRole('socio');
    setJoinedDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setNickname(m.nickname);
    setPhone(m.phone);
    setPixKey(m.pixKey || '');
    setRole(m.role);
    setJoinedDate(m.joinedDate || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nickname) return;

    if (editingMember) {
      onUpdateMember({
        ...editingMember,
        name,
        nickname,
        phone,
        pixKey,
        role,
        joinedDate: joinedDate || editingMember.joinedDate || new Date().toISOString().split('T')[0],
      });
    } else {
      const newMember: Member = {
        id: `m-${Date.now()}`,
        name,
        nickname,
        phone,
        pixKey,
        role,
        active: true,
        joinedDate: joinedDate || new Date().toISOString().split('T')[0],
      };
      onAddMember(newMember);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Quadro de Sócios & Participantes ({members.length})
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie a lista de participantes, apelidos da resenha, números de WhatsApp e chaves Pix.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Sócio
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar sócio por apelido, nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none shadow-sm"
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">
              {editingMember ? 'Editar Dados do Sócio' : 'Cadastrar Novo Sócio'}
            </h3>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Apelido na Resenha:</label>
                <input
                  type="text"
                  placeholder="Ex: Betão, Paulinho, Marcão"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  placeholder="Ex: Roberto Mendes Santana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Telefone:</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chave Pix do Sócio (para conferência):</label>
                <input
                  type="text"
                  placeholder="Ex: CPF, celular ou e-mail"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Função no Grupo:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="socio">Sócio Efetivo (Mensalista)</option>
                  <option value="organizador">Organizador / Tesoureiro</option>
                  <option value="convidado">Convidado / Frequente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Data de Entrada do Atleta:
                </label>
                <input
                  type="date"
                  value={joinedDate}
                  onChange={(e) => setJoinedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Data em que o atleta começou a frequentar ou se associou ao time
                </span>
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
                Salvar Sócio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMembers.map((member) => {
          const debts = pendingDebts.filter((d) => d.memberId === member.id);
          const isEmDia = debts.length === 0;

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm">
                      {member.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {member.nickname}
                        {member.role === 'organizador' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                            Organizador
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[170px]">{member.name}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isEmDia ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isEmDia ? '✓ Em Dia' : `⚠ ${debts.length} pendente(s)`}
                  </span>
                </div>

                <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.phone || 'Sem telefone'}</span>
                  </div>

                  {member.pixKey && (
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">Pix: {member.pixKey}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Entrada no time: <strong className="text-slate-800">{formatDateBR(member.joinedDate)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Deseja remover ${member.nickname} do cadastro?`)) {
                      onDeleteMember(member.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
