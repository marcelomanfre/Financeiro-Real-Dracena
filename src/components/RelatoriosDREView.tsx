import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  DollarSign,
  Printer,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  CheckCircle2,
  Beer,
  PartyPopper,
  Info,
} from 'lucide-react';
import { Transaction, Evento, TerceiroTempo, MensalidadeRecord } from '../types';
import { formatBRL, formatDateBR, getMonthNameBR } from '../utils/helpers';

interface RelatoriosDREViewProps {
  transactions: Transaction[];
  eventos: Evento[];
  terceirosTempos: TerceiroTempo[];
  mensalidades: MensalidadeRecord[];
}

export const RelatoriosDREView: React.FC<RelatoriosDREViewProps> = ({
  transactions,
  eventos,
  terceirosTempos,
  mensalidades,
}) => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'ano' | '1sem' | '2sem' | 'q1' | 'q2' | 'q3' | 'q4' | '2026-10' | '2026-09' | '2026-08' | '2026-05'
  >('ano');

  // Month labels in Portuguese
  const MONTHS_ORDER = [
    { key: '01', name: 'Jan' },
    { key: '02', name: 'Fev' },
    { key: '03', name: 'Mar' },
    { key: '04', name: 'Abr' },
    { key: '05', name: 'Mai' },
    { key: '06', name: 'Jun' },
    { key: '07', name: 'Jul' },
    { key: '08', name: 'Ago' },
    { key: '09', name: 'Set' },
    { key: '10', name: 'Out' },
    { key: '11', name: 'Nov' },
    { key: '12', name: 'Dez' },
  ];

  // Filter transactions according to selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const [year, month] = t.date.split('-');
      if (year !== selectedYear) return false;

      const mNum = Number(month);
      if (selectedPeriod === 'ano') return true;
      if (selectedPeriod === '1sem') return mNum >= 1 && mNum <= 6;
      if (selectedPeriod === '2sem') return mNum >= 7 && mNum <= 12;
      if (selectedPeriod === 'q1') return mNum >= 1 && mNum <= 3;
      if (selectedPeriod === 'q2') return mNum >= 4 && mNum <= 6;
      if (selectedPeriod === 'q3') return mNum >= 7 && mNum <= 9;
      if (selectedPeriod === 'q4') return mNum >= 10 && mNum <= 12;

      // specific month (e.g. "2026-10")
      return `${year}-${month}` === selectedPeriod;
    });
  }, [transactions, selectedYear, selectedPeriod]);

  // Aggregate monthly data for cashflow chart
  const monthlyFlowData = useMemo(() => {
    const map = new Map<string, { monthKey: string; name: string; entradas: number; saidas: number; saldo: number }>();

    MONTHS_ORDER.forEach(({ key, name }) => {
      map.set(key, { monthKey: key, name, entradas: 0, saidas: 0, saldo: 0 });
    });

    transactions.forEach((t) => {
      const [year, month] = t.date.split('-');
      if (year === selectedYear && map.has(month)) {
        const item = map.get(month)!;
        if (t.type === 'entrada') {
          item.entradas += t.amount;
        } else {
          item.saidas += t.amount;
        }
        item.saldo = item.entradas - item.saidas;
      }
    });

    return Array.from(map.values());
  }, [transactions, selectedYear]);

  // Max value for scaling bar heights
  const maxMonthlyVal = useMemo(() => {
    let max = 1000;
    monthlyFlowData.forEach((d) => {
      if (d.entradas > max) max = d.entradas;
      if (d.saidas > max) max = d.saidas;
    });
    return max;
  }, [monthlyFlowData]);

  // DRE breakdown
  const dre = useMemo(() => {
    // 1. Receitas
    let recMensalidades = 0;
    let recTerceiroTempo = 0;
    let recEventos = 0;
    let recOutras = 0;

    // 2. Despesas
    let despCarnesComida = 0;
    let despBebidas = 0;
    let despEspacoQuadra = 0;
    let despMateriais = 0;
    let despMusicaBrinquedos = 0;
    let despGerais = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'entrada') {
        if (t.category === 'mensalidade') recMensalidades += t.amount;
        else if (t.category === 'terceiro_tempo') recTerceiroTempo += t.amount;
        else if (t.category === 'evento') recEventos += t.amount;
        else recOutras += t.amount;
      } else {
        const desc = t.description.toLowerCase();
        if (desc.includes('carne') || desc.includes('espeto') || desc.includes('costela') || desc.includes('buffet')) {
          despCarnesComida += t.amount;
        } else if (desc.includes('cerveja') || desc.includes('chopp') || desc.includes('bebida') || desc.includes('refrigerante')) {
          despBebidas += t.amount;
        } else if (desc.includes('sítio') || desc.includes('chácara') || desc.includes('quadra') || desc.includes('local')) {
          despEspacoQuadra += t.amount;
        } else if (t.category === 'material' || desc.includes('bola') || desc.includes('colete') || desc.includes('rede')) {
          despMateriais += t.amount;
        } else if (desc.includes('música') || desc.includes('pagode') || desc.includes('banda') || desc.includes('brinquedo')) {
          despMusicaBrinquedos += t.amount;
        } else {
          despGerais += t.amount;
        }
      }
    });

    const totalReceitas = recMensalidades + recTerceiroTempo + recEventos + recOutras;
    const totalDespesas =
      despCarnesComida + despBebidas + despEspacoQuadra + despMateriais + despMusicaBrinquedos + despGerais;
    const resultadoLiquido = totalReceitas - totalDespesas;
    const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;

    return {
      receitas: {
        mensalidades: recMensalidades,
        terceiroTempo: recTerceiroTempo,
        eventos: recEventos,
        outras: recOutras,
        total: totalReceitas,
      },
      despesas: {
        carnesComida: despCarnesComida,
        bebidas: despBebidas,
        espacoQuadra: despEspacoQuadra,
        materiais: despMateriais,
        musicaBrinquedos: despMusicaBrinquedos,
        gerais: despGerais,
        total: totalDespesas,
      },
      resultadoLiquido,
      margemLiquida,
    };
  }, [filteredTransactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            Relatórios Contábeis & Gerenciais
          </div>
          <h2 className="text-2xl font-black mt-1">
            DRE & Fluxo de Caixa por Período
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Demonstração do Resultado do Exercício e evolução gráfica das receitas, despesas e resultado líquido do clube.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-2 border border-white/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Period Selector Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filtrar Período da Análise:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ano', label: 'Ano Inteiro (2026)' },
            { id: '1sem', label: '1º Semestre' },
            { id: '2sem', label: '2º Semestre' },
            { id: 'q3', label: '3º Trimestre (Jul-Set)' },
            { id: 'q4', label: '4º Trimestre (Out-Dez)' },
            { id: '2026-10', label: 'Outubro/2026' },
            { id: '2026-09', label: 'Setembro/2026' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedPeriod(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedPeriod === item.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cashflow Chart (Gráfico de Barras Mensal do Fluxo de Caixa) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Gráfico do Fluxo de Caixa Mês a Mês (2026)
            </h3>
            <p className="text-[11px] text-slate-500">
              Comparativo visual entre Entradas (Verde), Saídas (Vermelho) e Saldo Líquido do mês.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-emerald-500"></span> Entradas
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-rose-500"></span> Saídas
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-12 gap-2 sm:gap-4 items-end h-56 border-b border-slate-200 px-2">
            {monthlyFlowData.map((d) => {
              const entradasHeight = maxMonthlyVal > 0 ? (d.entradas / maxMonthlyVal) * 100 : 0;
              const saidasHeight = maxMonthlyVal > 0 ? (d.saidas / maxMonthlyVal) * 100 : 0;
              const hasActivity = d.entradas > 0 || d.saidas > 0;

              return (
                <div key={d.monthKey} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none z-20 whitespace-nowrap">
                    <p className="font-bold text-slate-200">{d.name}/2026</p>
                    <p className="text-emerald-300">+{formatBRL(d.entradas)}</p>
                    <p className="text-rose-300">-{formatBRL(d.saidas)}</p>
                    <p className="text-slate-100 font-bold border-t border-slate-700 mt-0.5 pt-0.5">
                      Saldo: {formatBRL(d.saldo)}
                    </p>
                  </div>

                  {/* Bars Container */}
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    {/* Bar Entradas */}
                    <div
                      className="w-2.5 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${Math.max(entradasHeight, hasActivity ? 4 : 0)}%` }}
                    ></div>
                    {/* Bar Saídas */}
                    <div
                      className="w-2.5 sm:w-4 bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${Math.max(saidasHeight, hasActivity ? 4 : 0)}%` }}
                    ></div>
                  </div>

                  {/* Label Month */}
                  <span className={`text-[10px] font-bold mt-2 ${hasActivity ? 'text-slate-800' : 'text-slate-400'}`}>
                    {d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Month Metrics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2">Mês</th>
                <th className="py-2 text-right">Entradas (Receitas)</th>
                <th className="py-2 text-right">Saídas (Despesas)</th>
                <th className="py-2 text-right">Resultado do Mês</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyFlowData
                .filter((d) => d.entradas > 0 || d.saidas > 0)
                .map((d) => (
                  <tr key={d.monthKey} className="hover:bg-slate-50/60">
                    <td className="py-2 font-bold text-slate-800">{d.name}/2026</td>
                    <td className="py-2 text-right font-medium text-emerald-700">+{formatBRL(d.entradas)}</td>
                    <td className="py-2 text-right font-medium text-rose-700">-{formatBRL(d.saidas)}</td>
                    <td
                      className={`py-2 text-right font-black ${
                        d.saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatBRL(d.saldo)}
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          d.saldo >= 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {d.saldo >= 0 ? 'Superávit' : 'Déficit'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRE ESTRUTURADA (Demonstração do Resultado do Exercício) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Demonstração Contábil Oficial
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">
              DRE - Demonstração do Resultado do Exercício
            </h3>
            <p className="text-xs text-slate-500">
              Estruturação das receitas operacionais e deduções por centro de custo.
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
              dre.resultadoLiquido >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="text-xs font-semibold">Resultado Líquido:</span>
            <span className="text-base font-black">{formatBRL(dre.resultadoLiquido)}</span>
          </div>
        </div>

        {/* DRE Body Table */}
        <div className="p-6 space-y-6">
          {/* 1. RECEITAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b-2 border-emerald-500 pb-2">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                1. RECEITA OPERACIONAL BRUTA
              </h4>
              <span className="text-sm font-black text-emerald-700">
                {formatBRL(dre.receitas.total)}
              </span>
            </div>

            <div className="pl-4 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(+) Mensalidades Arrecadadas dos Sócios</span>
                <span className="font-semibold">{formatBRL(dre.receitas.mensalidades)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(+) Rateios do 3º Tempo (Quartas-feiras)</span>
                <span className="font-semibold">{formatBRL(dre.receitas.terceiroTempo)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(+) Ingressos & Adesões de Eventos (Mães, Pais, Fim de Ano)</span>
                <span className="font-semibold">{formatBRL(dre.receitas.eventos)}</span>
              </div>
              {dre.receitas.outras > 0 && (
                <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                  <span>(+) Outras Receitas & Patrocínios Avulsos</span>
                  <span className="font-semibold">{formatBRL(dre.receitas.outras)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. DEDUÇÕES / DESPESAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b-2 border-rose-500 pb-2">
              <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                2. (-) DESPESAS E CUSTOS OPERACIONAIS
              </h4>
              <span className="text-sm font-black text-rose-700">
                -{formatBRL(dre.despesas.total)}
              </span>
            </div>

            <div className="pl-4 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Carnes, Linguiças e Alimentação dos Churrascos</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.carnesComida)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Cervejas, Chopp e Bebidas</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.bebidas)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Aluguel de Sítio, Chácara e Quadra</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.espacoQuadra)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Materiais Esportivos (Bolas, Redes, Coletes)</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.materiais)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Música, Banda de Pagode e Brinquedos Infantis</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.musicaBrinquedos)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 hover:bg-slate-50 rounded px-2">
                <span>(-) Despesas Gerais, Carvão, Gelo e Limpeza</span>
                <span className="font-semibold text-rose-700">-{formatBRL(dre.despesas.gerais)}</span>
              </div>
            </div>
          </div>

          {/* 3. RESULTADO FINAL */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                (=) RESULTADO LÍQUIDO DO EXERCÍCIO (DRE)
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Receitas Brutas ({formatBRL(dre.receitas.total)}) - Despesas ({formatBRL(dre.despesas.total)})
              </p>
            </div>

            <div className="text-right">
              <p
                className={`text-2xl font-black ${
                  dre.resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatBRL(dre.resultadoLiquido)}
              </p>
              <span className="text-xs text-slate-400">
                Margem Líquida: <strong>{dre.margemLiquida.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
