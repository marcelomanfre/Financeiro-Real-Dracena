import { Member, MensalidadeRecord, TerceiroTempo, Evento, PendingDebtItem, PedidoMaterial } from '../types';

export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

export function formatDateBR(dateString?: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function getMonthNameBR(monthYearStr: string): string {
  if (!monthYearStr) return '';
  const [year, month] = monthYearStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const name = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Retorna a data exata da 2ª quarta-feira de qualquer mês (formato YYYY-MM-DD).
 * Regra do grupo: O vencimento de todas as mensalidades é sempre na 2ª quarta-feira do mês.
 */
export function getSecondWednesdayOfMonth(monthYear: string): string {
  if (!monthYear || !monthYear.includes('-')) return '';
  const [yearStr, monthStr] = monthYear.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexado
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Quarta (3), 4 = Qui, 5 = Sex, 6 = Sab
  const offsetToFirstWed = (3 - dayOfWeek + 7) % 7;
  const firstWedDate = 1 + offsetToFirstWed;
  const secondWedDate = firstWedDate + 7;
  const yyyy = String(year);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(secondWedDate).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatSecondWednesdayLabel(monthYear: string): string {
  const dateStr = getSecondWednesdayOfMonth(monthYear);
  return `${formatDateBR(dateStr)} (2ª quarta-feira)`;
}

// Calculate all pending and overdue debts across Mensalidades, 3º Tempo, Eventos, and Materiais/Uniformes
export function calculateAllPendingDebts(
  members: Member[],
  mensalidades: MensalidadeRecord[],
  terceirosTempos: TerceiroTempo[],
  eventos: Evento[],
  pedidosMateriais?: PedidoMaterial[]
): PendingDebtItem[] {
  const debts: PendingDebtItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  // 1. Mensalidades
  mensalidades.forEach(m => {
    if (m.status === 'pendente' || m.status === 'atrasado') {
      const member = memberMap.get(m.memberId);
      if (!member) return;

      const dueDate = new Date(m.dueDate);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      debts.push({
        id: `debt-men-${m.id}`,
        memberId: member.id,
        memberName: member.name,
        memberNickname: member.nickname,
        memberPhone: member.phone,
        title: `Mensalidade ${getMonthNameBR(m.monthYear)}`,
        category: 'mensalidade',
        amount: m.amount,
        dueDate: m.dueDate,
        referenceId: m.id,
        daysLate: diffDays > 0 ? diffDays : 0,
      });
    }
  });

  // 2. Terceiro Tempo
  terceirosTempos.forEach(tt => {
    tt.participants.forEach((p, idx) => {
      if (p.status === 'pendente') {
        const member = memberMap.get(p.memberId);
        if (!member) return;

        const ttDate = new Date(tt.date);
        const diffTime = today.getTime() - ttDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        debts.push({
          id: `debt-tt-${tt.id}-${p.memberId}`,
          memberId: member.id,
          memberName: member.name,
          memberNickname: member.nickname,
          memberPhone: member.phone,
          title: `Rateio ${tt.title}`,
          category: 'terceiro_tempo',
          amount: p.shareAmount || tt.perPersonCost,
          dueDate: tt.date,
          referenceId: tt.id,
          referenceSubId: p.memberId,
          daysLate: diffDays > 0 ? diffDays : 0,
        });
      }
    });
  });

  // 3. Eventos (Cobrança apenas se o atleta levou convidados extras - o atleta é isento)
  eventos.forEach(ev => {
    ev.tickets.forEach(ticket => {
      if (ticket.status === 'pendente' && ticket.guestCount > 0 && ticket.totalAmount > 0) {
        const member = memberMap.get(ticket.memberId);
        const memberName = member ? member.name : ticket.memberName;
        const memberNickname = member ? member.nickname : ticket.memberName;
        const memberPhone = member ? member.phone : '';

        const evDate = new Date(ev.date);
        const diffTime = today.getTime() - evDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        debts.push({
          id: `debt-ev-${ev.id}-${ticket.id}`,
          memberId: ticket.memberId,
          memberName,
          memberNickname,
          memberPhone,
          title: `${ticket.guestCount} ${ticket.guestCount > 1 ? 'Convidados extras' : 'Convidado extra'} (${ev.name})`,
          category: 'evento',
          amount: ticket.totalAmount,
          dueDate: ev.date,
          referenceId: ev.id,
          referenceSubId: ticket.id,
          daysLate: diffDays > 0 ? diffDays : 0,
        });
      }
    });
  });

  // 4. Pedidos de Materiais / Uniformes / Bolsas
  (pedidosMateriais || []).forEach(pedido => {
    pedido.items.forEach(item => {
      if (item.status === 'pendente' && item.amount > 0) {
        const member = memberMap.get(item.memberId);
        const memberName = member ? member.name : item.memberName;
        const memberNickname = member ? member.nickname : item.memberName;
        const memberPhone = member ? member.phone : '';

        const pDate = new Date(pedido.date);
        const diffTime = today.getTime() - pDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        debts.push({
          id: `debt-mat-${pedido.id}-${item.id}`,
          memberId: item.memberId,
          memberName,
          memberNickname,
          memberPhone,
          title: `${pedido.title}${item.itemDetails ? ` (${item.itemDetails})` : ''}`,
          category: 'material',
          amount: item.amount,
          dueDate: pedido.date,
          referenceId: pedido.id,
          referenceSubId: item.id,
          daysLate: diffDays > 0 ? diffDays : 0,
        });
      }
    });
  });

  // Sort by late days descending (most overdue first), then by amount
  return debts.sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount);
}

export function generateWhatsAppReminder(
  memberNickname: string,
  memberPhone: string,
  debts: PendingDebtItem[],
  groupPixKey = 'carlao.futebol@email.com'
): string {
  const total = debts.reduce((sum, d) => sum + d.amount, 0);
  const itemsText = debts
    .map(d => `▪️ *${d.title}*: ${formatBRL(d.amount)}${d.daysLate > 0 ? ` (${d.daysLate}d em atraso)` : ''}`)
    .join('\n');

  const text = `Fala *${memberNickname}*, tudo bem, meu amigo? ⚽🍻

Passando aqui como tesoureiro do nosso grupo pra te mandar o resumo das pendências em aberto:

${itemsText}

💰 *Valor Total: ${formatBRL(total)}*
🔑 *Chave Pix do Grupo:* \`${groupPixKey}\`

Assim que transferir, basta mandar o comprovante aqui no zap que o sistema já faz a baixa automática com IA! Valeu demais! 🤝`;

  const cleanPhone = memberPhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/55${cleanPhone}?text=${encodedText}`;
}
