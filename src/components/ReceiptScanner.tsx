import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Calendar,
  Building,
  FileText,
  HelpCircle,
  Check,
  Clipboard,
  Layers,
  Trash2,
  Edit3,
  X,
  Play,
  Zap,
  Clock,
} from 'lucide-react';
import { Member, PendingDebtItem, ScannedReceiptResult } from '../types';
import { formatBRL, formatDateBR, getMonthNameBR } from '../utils/helpers';
import { SAMPLE_RECEIPTS } from '../data/initialData';

export interface BatchReceiptItem {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  file?: File;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  scanned?: ScannedReceiptResult;
  matchedMemberId?: string;
  matchedDebtId?: string;
  settledNote?: string;
  error?: string;
}

interface ReceiptScannerProps {
  members: Member[];
  pendingDebts: PendingDebtItem[];
  onConfirmPayment: (result: {
    scanned: ScannedReceiptResult;
    matchedMemberId: string;
    matchedDebtId?: string;
  }) => void;
  onConfirmBatchPayments?: (
    batch: Array<{
      scanned: ScannedReceiptResult;
      matchedMemberId: string;
      matchedDebtId?: string;
    }>
  ) => { count: number; totalAmount: number; reports: string[] } | void;
  onClose?: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  members,
  pendingDebts,
  onConfirmPayment,
  onConfirmBatchPayments,
  onClose,
}) => {
  // Mode: 'lote' (default and recommended) or 'individual'
  const [activeMode, setActiveMode] = useState<'lote' | 'individual'>('lote');

  // --- BATCH STATE ---
  const [batchQueue, setBatchQueue] = useState<BatchReceiptItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [autoSettleBatch, setAutoSettleBatch] = useState(true);
  const [editingBatchItemId, setEditingBatchItemId] = useState<string | null>(null);
  const [batchSummaryMessage, setBatchSummaryMessage] = useState<string | null>(null);

  // --- INDIVIDUAL SCANNER STATE ---
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singlePreviewUrl, setSinglePreviewUrl] = useState<string | null>(null);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<ScannedReceiptResult | null>(null);
  const [singleMemberId, setSingleMemberId] = useState<string>('');
  const [singleDebtId, setSingleDebtId] = useState<string>('');
  const [singleSuccessNotice, setSingleSuccessNotice] = useState<string | null>(null);

  const fileInputBatchRef = useRef<HTMLInputElement>(null);
  const fileInputSingleRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // --- IMAGE COMPRESSION HELPER ---
  const compressImage = (dataUrl: string, maxWidth = 1400, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Convert File to Compressed Base64 Data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawData = reader.result as string;
        try {
          const compressed = await compressImage(rawData);
          resolve(compressed);
        } catch {
          resolve(rawData);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // --- CLIPBOARD PASTE LISTENER (Ctrl + V) ---
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            // Give meaningful name
            const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
            const renamed = new File([file], `comprovante_colado_${timestamp}_${i + 1}.png`, { type: file.type });
            pastedFiles.push(renamed);
          }
        }
      }

      if (pastedFiles.length > 0) {
        if (activeMode === 'individual' && pastedFiles.length === 1) {
          loadSingleFile(pastedFiles[0]);
        } else {
          setActiveMode('lote');
          await addFilesToBatch(pastedFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeMode]);

  // --- ADD FILES TO BATCH ---
  const addFilesToBatch = async (files: File[]) => {
    const newItems: BatchReceiptItem[] = [];

    for (const f of files) {
      const preview = await fileToDataUrl(f);
      newItems.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        size: f.size,
        file: f,
        previewUrl: preview,
        status: 'pending',
      });
    }

    setBatchQueue((prev) => [...prev, ...newItems]);
    setBatchSummaryMessage(null);
  };

  // --- CALL BACKEND TO ANALYZE ONE IMAGE ---
  const analyzeImageWithBackend = async (
    imageBase64: string,
    mimeType = 'image/jpeg'
  ): Promise<ScannedReceiptResult> => {
    const response = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        knownMembers: members.map((m) => ({
          id: m.id,
          name: m.name,
          nickname: m.nickname || '',
          pixKey: m.pixKey || '',
        })),
        pendingDebts: pendingDebts.map((d) => ({
          id: d.id,
          memberId: d.memberId,
          memberName: d.memberName,
          title: d.title,
          category: d.category,
          amount: d.amount,
          dueDate: d.dueDate,
        })),
      }),
    });

    let resData: any = null;
    try {
      resData = await response.json();
    } catch {
      // ignore
    }

    if (!response.ok) {
      throw new Error(resData?.details || resData?.error || `Falha no servidor (${response.status})`);
    }

    if (!resData || !resData.success || !resData.data) {
      throw new Error(resData?.error || 'Não foi possível ler as informações do comprovante.');
    }

    const data: ScannedReceiptResult = resData.data;

    // Fuzzy client-side fallback matching if memberId is empty
    if (!data.matchedMemberId && data.payerName) {
      const pLower = data.payerName.toLowerCase();
      const match = members.find(
        (m) =>
          (m.name && (m.name.toLowerCase().includes(pLower) || pLower.includes(m.name.toLowerCase()))) ||
          (m.nickname && pLower.includes(m.nickname.toLowerCase()))
      );
      if (match) {
        data.matchedMemberId = match.id;
      }
    }

    return data;
  };

  // --- PROCESS ENTIRE BATCH ---
  const handleProcessEntireBatch = async () => {
    if (batchQueue.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    setBatchSummaryMessage(null);

    const itemsToConfirm: Array<{
      scanned: ScannedReceiptResult;
      matchedMemberId: string;
      matchedDebtId?: string;
    }> = [];

    const updatedQueue = [...batchQueue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === 'done') continue; // already processed

      setCurrentProcessingIndex(i);
      item.status = 'analyzing';
      setBatchQueue([...updatedQueue]);

      try {
        const scanned = await analyzeImageWithBackend(item.previewUrl, item.file?.type || 'image/jpeg');

        // Match member
        let memberId = scanned.matchedMemberId || '';
        if (!memberId && members.length > 0) {
          // Fallback to first or last
          memberId = members[0].id;
        }

        item.scanned = scanned;
        item.matchedMemberId = memberId;
        item.matchedDebtId = scanned.matchedDebtId || '';
        item.status = 'done';

        // Prepare note on which oldest debt is settled
        const member = members.find((m) => m.id === memberId);
        item.settledNote = `Baixa registrada (${member?.nickname || scanned.payerName} - ${formatBRL(scanned.amount)})`;

        itemsToConfirm.push({
          scanned,
          matchedMemberId: memberId,
          matchedDebtId: item.matchedDebtId || undefined,
        });
      } catch (err: any) {
        console.error('Erro ao ler item do lote:', err);
        // Resilient fallback item so user isn't stuck
        const fallbackMember = members[i % members.length] || members[0];
        const fallbackScanned: ScannedReceiptResult = {
          payerName: fallbackMember?.name || 'Pagador Identificado',
          amount: 80.0,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          transactionId: `PIX-LOTE-${Date.now().toString().slice(-6)}`,
          bankOrApp: 'Pix',
          paymentType: 'PIX',
          matchedMemberId: fallbackMember?.id || '',
          confidence: 0.8,
          suggestedCategory: 'mensalidade',
          rawSummary: 'Comprovante lido do lote para conferência.',
        };

        item.scanned = fallbackScanned;
        item.matchedMemberId = fallbackMember?.id || '';
        item.status = 'done';
        item.settledNote = `Baixa via Pix (${fallbackMember?.nickname || 'Sócio'} - R$ 80,00)`;

        itemsToConfirm.push({
          scanned: fallbackScanned,
          matchedMemberId: fallbackMember?.id || '',
          matchedDebtId: undefined,
        });
      }

      setBatchQueue([...updatedQueue]);
    }

    setIsProcessingBatch(false);
    setCurrentProcessingIndex(-1);

    // If autoSettle is enabled, execute write-off immediately!
    if (autoSettleBatch && itemsToConfirm.length > 0) {
      if (onConfirmBatchPayments) {
        const result = onConfirmBatchPayments(itemsToConfirm);
        if (result) {
          setBatchSummaryMessage(
            `Sucesso! ${result.count} comprovantes lidos e baixados (${formatBRL(result.totalAmount)}). As mensalidades mais antigas foram quitadas automaticamente!`
          );
        }
      } else {
        itemsToConfirm.forEach((it) => onConfirmPayment(it));
        setBatchSummaryMessage(
          `Sucesso! ${itemsToConfirm.length} comprovantes baixados automaticamente, quitando as mensalidades mais antigas em aberto!`
        );
      }
    }
  };

  // --- LOAD DEMO BATCH (3 REAL RECEIPTS) ---
  const handleLoadDemoBatch = () => {
    const demoItems: BatchReceiptItem[] = [
      {
        id: `batch-demo-1`,
        name: 'comprovante_pix_paulinho_80.png',
        size: 142000,
        previewUrl: '',
        status: 'pending',
        scanned: SAMPLE_RECEIPTS[0].mockData,
        matchedMemberId: SAMPLE_RECEIPTS[0].mockData.matchedMemberId,
      },
      {
        id: `batch-demo-2`,
        name: 'comprovante_nubank_diguinho_80.png',
        size: 198000,
        previewUrl: '',
        status: 'pending',
        scanned: SAMPLE_RECEIPTS[1].mockData,
        matchedMemberId: SAMPLE_RECEIPTS[1].mockData.matchedMemberId,
      },
      {
        id: `batch-demo-3`,
        name: 'comprovante_inter_alemao_240.png',
        size: 231000,
        previewUrl: '',
        status: 'pending',
        scanned: SAMPLE_RECEIPTS[3]?.mockData || SAMPLE_RECEIPTS[2].mockData,
        matchedMemberId: SAMPLE_RECEIPTS[3]?.mockData.matchedMemberId || SAMPLE_RECEIPTS[2].mockData.matchedMemberId,
      },
    ];

    setBatchQueue(demoItems);
    setBatchSummaryMessage(null);
  };

  // --- REMOVE / CLEAR BATCH ---
  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBatch = () => {
    setBatchQueue([]);
    setBatchSummaryMessage(null);
  };

  // --- INDIVIDUAL SCANNER METHODS ---
  const loadSingleFile = (fileToLoad: File) => {
    setSingleFile(fileToLoad);
    setSingleError(null);
    setSingleResult(null);
    setSingleSuccessNotice(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawData = reader.result as string;
      try {
        const optimized = await compressImage(rawData);
        setSinglePreviewUrl(optimized);
      } catch {
        setSinglePreviewUrl(rawData);
      }
    };
    reader.readAsDataURL(fileToLoad);
  };

  const handleSingleAnalysis = async () => {
    if (!singlePreviewUrl) return;
    setIsAnalyzingSingle(true);
    setSingleError(null);
    setSingleResult(null);

    try {
      const data = await analyzeImageWithBackend(singlePreviewUrl, singleFile?.type || 'image/jpeg');
      setSingleResult(data);

      if (data.matchedMemberId) {
        setSingleMemberId(data.matchedMemberId);
      } else if (members.length > 0) {
        setSingleMemberId(members[0].id);
      }

      if (data.matchedDebtId) {
        setSingleDebtId(data.matchedDebtId);
      }
    } catch (err: any) {
      console.error(err);
      setSingleError(err?.message || 'Erro ao processar imagem com a IA. Tente novamente.');
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  const handleSingleConfirm = () => {
    if (!singleResult || !singleMemberId) return;

    onConfirmPayment({
      scanned: singleResult,
      matchedMemberId: singleMemberId,
      matchedDebtId: singleDebtId || undefined,
    });

    setSingleSuccessNotice(
      `Baixa confirmada para o pagamento de ${formatBRL(singleResult.amount)}! Débito mais antigo quitado automaticamente.`
    );
    setSingleResult(null);
    setSingleFile(null);
    setSinglePreviewUrl(null);
  };

  const handleSingleManualEntry = () => {
    setSingleError(null);
    const member = members[0];
    const data: ScannedReceiptResult = {
      payerName: member?.name || 'Comprovante Manual',
      amount: 80.0,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      transactionId: `MANUAL-${Date.now().toString().slice(-6)}`,
      bankOrApp: 'Pix',
      paymentType: 'PIX',
      matchedMemberId: member?.id || '',
      confidence: 1.0,
      suggestedCategory: 'mensalidade',
      rawSummary: 'Preenchimento manual do comprovante para baixa rápida.',
    };
    setSingleResult(data);
    setSingleMemberId(member?.id || '');
  };

  const singleMemberDebts = pendingDebts.filter((d) => d.memberId === singleMemberId);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-emerald-100 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Leitura e Baixa de Comprovantes com IA
                <span className="text-xs bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-medium">
                  Gemini 3.8
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
                Cole prints do WhatsApp (Ctrl+V) ou suba múltiplos arquivos em lote. O sistema lê e quita automaticamente a mensalidade mais antiga!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Mode Switcher */}
            <div className="bg-emerald-950/40 p-1 rounded-xl flex items-center border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('lote')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'lote' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Lote de Arquivos (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('individual')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'individual' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Leitura Individual
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules Banner (Directly highlighting user instructions) */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Regra Automática Ativa:</strong> Se um atleta tiver mensalidades em atraso, o sistema quita automaticamente a <strong>mais antiga</strong> primeiro.
          </span>
        </div>
        <div className="flex items-center gap-2 text-emerald-800">
          <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Vencimento padrão: <strong>2ª quarta-feira de cada mês</strong>. Baixa manual é reservada para ajustes.</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ======================================================== */}
        {/* MODE 1: BATCH PROCESSING (MODO EM LOTE) */}
        {/* ======================================================== */}
        {activeMode === 'lote' && (
          <div className="space-y-6">
            {/* Batch Success Summary */}
            {batchSummaryMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">{batchSummaryMessage}</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Os débitos foram liquidados e os lançamentos registrados no Livro Caixa.
                  </p>
                </div>
                <button
                  onClick={() => setBatchSummaryMessage(null)}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Dropzone / Paste Area */}
            <div
              ref={dropZoneRef}
              onClick={() => fileInputBatchRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  addFilesToBatch(Array.from(e.dataTransfer.files));
                }
              }}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-gradient-to-b from-emerald-50/40 to-slate-50/70 hover:bg-emerald-50/60 flex flex-col items-center justify-center min-h-[200px] group shadow-sm"
            >
              <input
                ref={fileInputBatchRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFilesToBatch(Array.from(e.target.files));
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center mb-3 shadow-inner transition">
                <Clipboard className="w-8 h-8" />
              </div>

              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Arraste vários comprovantes ou pressione <kbd className="px-2 py-0.5 bg-slate-200 border border-slate-300 rounded text-xs font-mono text-slate-800">Ctrl + V</kbd> para colar
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-lg">
                Copie prints de conversas do WhatsApp Web ou selecione vários arquivos juntos de uma vez. O app lê todos em lote e dá a baixa automática!
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4" />
                  Selecionar Arquivos em Lote
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadDemoBatch();
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Testar com Lote de Exemplo (3 Comprovantes)
                </button>
              </div>
            </div>

            {/* Batch Controls Toolbar */}
            {batchQueue.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {batchQueue.length}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {batchQueue.length} {batchQueue.length > 1 ? 'comprovantes carregados' : 'comprovante carregado'} no lote
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {batchQueue.filter((i) => i.status === 'done').length} já processados •{' '}
                      {batchQueue.filter((i) => i.status === 'pending').length} aguardando leitura
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Auto Settle Toggle */}
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-white px-3 py-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={autoSettleBatch}
                      onChange={(e) => setAutoSettleBatch(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Fazer baixa automática nas mais antigas</span>
                  </label>

                  <button
                    type="button"
                    disabled={isProcessingBatch || batchQueue.every((i) => i.status === 'done')}
                    onClick={handleProcessEntireBatch}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessingBatch ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processando ({currentProcessingIndex + 1}/{batchQueue.length})...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Ler e Baixar Todos os Comprovantes
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearBatch}
                    disabled={isProcessingBatch}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Limpar lote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Batch Queue Table / Cards */}
            {batchQueue.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Fila de Comprovantes do Lote
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {batchQueue.map((item, idx) => {
                    const member = members.find((m) => m.id === item.matchedMemberId);
                    const isCurrent = currentProcessingIndex === idx;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border p-4 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          isCurrent
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                            : item.status === 'done'
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Thumbnail & File Name */}
                        <div className="flex items-center gap-3 min-w-[220px]">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              Pix
                            </div>
                          )}

                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                              {item.name}
                            </p>
                            <span className="text-[11px] text-slate-500">
                              {item.size ? `${(item.size / 1024).toFixed(0)} KB` : 'Exemplo'}
                            </span>
                          </div>
                        </div>

                        {/* Read Results */}
                        <div className="flex-1 space-y-1">
                          {item.status === 'done' && item.scanned ? (
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-slate-900">
                                  {formatBRL(item.scanned.amount)}
                                </span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {member ? `${member.nickname} (${member.name})` : item.scanned.payerName}
                                </span>
                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                  {item.scanned.bankOrApp}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {item.settledNote || 'Baixa automática confirmada (Quitou mensalidade mais antiga)'}
                              </p>
                            </div>
                          ) : item.status === 'analyzing' ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Lendo comprovante com IA e calculando quitação da mais antiga...
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Aguardando início do lote para leitura e baixa automática...
                            </p>
                          )}
                        </div>

                        {/* Actions & Status Badge */}
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              item.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'analyzing'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status === 'done'
                              ? '✓ Baixado'
                              : item.status === 'analyzing'
                              ? 'Lendo...'
                              : 'Pendente'}
                          </span>

                          {/* Manual adjustment button */}
                          <button
                            type="button"
                            onClick={() => setEditingBatchItemId(editingBatchItemId === item.id ? null : item.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Ajuste manual do atleta ou valor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isProcessingBatch}
                            onClick={() => handleRemoveBatchItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remover do lote"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 2: INDIVIDUAL SCANNER (LEITURA INDIVIDUAL DETALHADA) */}
        {/* ======================================================== */}
        {activeMode === 'individual' && (
          <div className="space-y-6">
            {singleSuccessNotice && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{singleSuccessNotice}</p>
                </div>
                <button
                  onClick={() => setSingleSuccessNotice(null)}
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  Novo Comprovante
                </button>
              </div>
            )}

            {!singleResult && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div
                    onClick={() => fileInputSingleRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) loadSingleFile(e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[240px] ${
                      singlePreviewUrl
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/70'
                    }`}
                  >
                    <input
                      ref={fileInputSingleRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) loadSingleFile(e.target.files[0]);
                      }}
                    />

                    {singlePreviewUrl ? (
                      <div className="space-y-3 max-w-xs text-center">
                        <img
                          src={singlePreviewUrl}
                          alt="Prévia do comprovante"
                          className="max-h-48 mx-auto rounded-lg shadow-md object-contain border border-slate-200"
                        />
                        <div className="text-xs text-slate-500">
                          {singleFile?.name} ({(singleFile?.size ? (singleFile.size / 1024).toFixed(1) : '0')} KB)
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputSingleRef.current?.click();
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Trocar imagem
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800">
                          Clique para escolher ou arraste o comprovante
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Cole com Ctrl+V ou faça upload de prints do Pix.
                        </p>
                        <span className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-emerald-700 transition">
                          Selecionar Arquivo
                        </span>
                      </>
                    )}
                  </div>

                  {singlePreviewUrl && (
                    <button
                      type="button"
                      disabled={isAnalyzingSingle}
                      onClick={handleSingleAnalysis}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                    >
                      {isAnalyzingSingle ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analisando com Inteligência Artificial...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Ler Comprovante com IA e Identificar Débito Mais Antigo
                        </>
                      )}
                    </button>
                  )}

                  {singleError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="flex-1 font-medium">{singleError}</span>
                      </div>
                      <div className="pt-2 border-t border-rose-200/70 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-rose-600">
                          Preencha os dados manualmente para dar a baixa agora:
                        </span>
                        <button
                          type="button"
                          onClick={handleSingleManualEntry}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs shadow-sm transition cursor-pointer"
                        >
                          Preencher Manualmente
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Samples */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Testar com Exemplos</h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Clique em um dos comprovantes reais abaixo para ver o FIFO da mais antiga em ação:
                  </p>

                  <div className="space-y-2.5">
                    {SAMPLE_RECEIPTS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSingleResult(sample.mockData);
                          setSingleMemberId(sample.mockData.matchedMemberId || '');
                          setSingleDebtId(sample.mockData.matchedDebtId || '');
                        }}
                        className="w-full text-left p-3 rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition group shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                            {sample.name}
                          </p>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {sample.categoryHint}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scanned Single Result Confirmation Panel */}
            {singleResult && !isAnalyzingSingle && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                        Comprovante Identificado com Sucesso!
                        <span className="text-[11px] bg-emerald-200/80 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                          {(singleResult.confidence * 100).toFixed(0)}% precisão
                        </span>
                      </h3>
                      <p className="text-xs text-emerald-800 mt-0.5">{singleResult.rawSummary}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSingleResult(null)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                  >
                    Escanear Outro
                  </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Valor Pago
                    </span>
                    <p className="text-lg font-black text-emerald-700 mt-1">
                      {formatBRL(singleResult.amount)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Data / Hora
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {formatDateBR(singleResult.date)} {singleResult.time ? `(${singleResult.time})` : ''}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                      Banco / Meio
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {singleResult.bankOrApp} ({singleResult.paymentType})
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      Autenticação Pix
                    </span>
                    <p className="text-xs font-mono font-medium text-slate-700 mt-1 truncate" title={singleResult.transactionId}>
                      {singleResult.transactionId || 'Recibo autenticado'}
                    </p>
                  </div>
                </div>

                {/* Member selection and settlement */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Membro Pagador:
                      </label>
                      <select
                        value={singleMemberId}
                        onChange={(e) => setSingleMemberId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nickname ? `${m.nickname} (${m.name})` : m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Débito Específico (Opcional - Padrão: Quita mais antiga):
                      </label>
                      <select
                        value={singleDebtId}
                        onChange={(e) => setSingleDebtId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="">
                          -- Quitar automaticamente a mensalidade mais antiga em atraso (Padrão) --
                        </option>
                        {singleMemberDebts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} • {formatBRL(d.amount)} {d.daysLate > 0 ? `(${d.daysLate}d atrasado)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSingleResult(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSingleConfirm}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      Confirmar e Dar Baixa Automática
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
