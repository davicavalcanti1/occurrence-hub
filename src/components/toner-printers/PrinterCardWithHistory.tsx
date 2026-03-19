import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Printer, ImageIcon, Edit, Trash2, Plus, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extracted types to avoid deep imports while maintaining typing
interface PrinterInfo {
    id: number;
    modelo: string;
    localizacao: string;
    skus_compativeis: string[];
    imagem_url?: string | null;
    ativo?: boolean;
}

interface TonerInfo {
    sku: string;
    cor: string;
    modelo_toner: string;
}

interface TrocaToner {
    id: string;
    printer_id: number;
    sku: string;
    created_at: string;
}

interface PrinterCardWithHistoryProps {
    printer: PrinterInfo;
    estoque: TonerInfo[];
    onEdit: (printer: PrinterInfo) => void;
    onDeactivate: (printer: PrinterInfo) => void;
    onActivate: (printer: PrinterInfo) => void;
    onImagePreview: (printer: PrinterInfo) => void;
}

export function PrinterCardWithHistory({
    printer,
    estoque,
    onEdit,
    onDeactivate,
    onActivate,
    onImagePreview
}: PrinterCardWithHistoryProps) {
    const [history, setHistory] = useState<TrocaToner[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchHistory() {
            if (!printer.ativo) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('trocas_toner')
                    .select('*')
                    .eq('printer_id', printer.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setHistory(data || []);
            } catch (err) {
                console.error("Erro ao buscar historico de trocas:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHistory();

        // Subscribe to realtime historical inserts for this printer
        const channel = supabase.channel(`printer_history_${printer.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'trocas_toner',
                filter: `printer_id=eq.${printer.id}`
            }, (payload) => {
                setHistory(prev => [payload.new as TrocaToner, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [printer.id, printer.ativo]);

    // Utility to get the dot color
    const getTonerColorHex = (cor: string) => {
        const c = cor.toLowerCase();
        if (c.includes('cyan') || c.includes('ciano')) return '#06b6d4'; // cyan-500
        if (c.includes('magenta')) return '#d946ef'; // fuchsia-500
        if (c.includes('yellow') || c.includes('amarelo')) return '#eab308'; // yellow-500
        return '#1e293b'; // slate-800 default black
    };

    // Calculates stats per SKU for this printer
    const getStatsForSku = (skuToFind: string) => {
        const skuHistory = history.filter(h => h.sku === skuToFind).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (skuHistory.length === 0) return null;

        const lastDate = new Date(skuHistory[0].created_at);

        let averageDays = null;
        if (skuHistory.length > 1) {
            let totalDays = 0;
            for (let i = 0; i < skuHistory.length - 1; i++) {
                const diffTime = Math.abs(new Date(skuHistory[i].created_at).getTime() - new Date(skuHistory[i + 1].created_at).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
            }
            averageDays = Math.round(totalDays / (skuHistory.length - 1));
        }

        return {
            lastDate,
            averageDays,
            totalSwaps: skuHistory.length
        };
    };

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-shadow overflow-hidden flex flex-col ${!printer.ativo ? 'opacity-70 grayscale' : 'hover:shadow-md'}`}>

            {/* Header / Image Area */}
            <div className="h-40 bg-slate-100 relative group flex items-center justify-center border-b border-slate-100 shrink-0">
                {!printer.ativo && (
                    <div className="absolute top-2 right-2 z-10 bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">
                        Desativada
                    </div>
                )}
                {printer.imagem_url ? (
                    <img
                        src={printer.imagem_url}
                        alt={printer.modelo}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/f8fafc/94a3b8?text=Erro+na+Imagem'; }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                        <Printer className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium uppercase tracking-wider">Sem Imagem</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <button
                        onClick={() => onImagePreview(printer)}
                        className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-2 text-sm"
                    >
                        <ImageIcon className="w-4 h-4" /> Atualizar Foto
                    </button>
                </div>
            </div>

            {/* Printer Info Body */}
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-slate-800 line-clamp-1">{printer.localizacao}</h3>
                <p className="text-sm text-slate-500 mb-4">{printer.modelo}</p>

                {/* SKUs and History Area */}
                <div className="mt-auto space-y-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        SKUs & Histórico de Trocas
                    </p>

                    <div className="flex flex-col gap-2">
                        {(!printer.skus_compativeis || printer.skus_compativeis.length === 0) ? (
                            <span className="text-xs text-slate-400 italic">Nenhum toner mapeado.</span>
                        ) : (
                            printer.skus_compativeis.map(sku => {
                                const tonerRef = estoque.find(t => t.sku === sku);
                                const stats = getStatsForSku(sku);

                                return (
                                    <div key={sku} className="flex flex-col bg-slate-50 border border-slate-100 rounded-md p-2">
                                        {/* Top Row: Color & SKU */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: getTonerColorHex(tonerRef?.cor || '') }}></div>
                                            <span className="font-semibold text-xs text-slate-700 capitalize w-16 truncate" title={tonerRef?.cor || '?'}>
                                                {tonerRef?.cor || 'Desconhecida'}
                                            </span>
                                            <span className="font-mono text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded ml-auto">
                                                {sku}
                                            </span>
                                        </div>

                                        {/* Bottom Row: History Stats */}
                                        {isLoading ? (
                                            <div className="w-full h-4 bg-slate-200 animate-pulse rounded"></div>
                                        ) : stats ? (
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                                <span title="Última Troca Registrada">
                                                    Última: <strong className="text-slate-700">{stats.lastDate.toLocaleDateString('pt-BR')}</strong>
                                                </span>
                                                {stats.averageDays !== null ? (
                                                    <span title="Duração média calculada com base no histórico">
                                                        Média: <strong className="text-blue-600">{stats.averageDays} d</strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Média: N/A</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-400 italic px-1">Sem trocas registradas.</div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 pt-0 mt-2 flex gap-2 border-t border-slate-50 shrink-0">
                <button
                    onClick={() => onEdit(printer)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                >
                    <Edit className="w-3 h-3" /> Editar
                </button>
                {printer.ativo ? (
                    <button
                        onClick={() => onDeactivate(printer)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        title="Desativar impressora"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                ) : (
                    <button
                        onClick={() => onActivate(printer)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                        title="Reativar impressora"
                    >
                        <Plus className="w-3 h-3" /> Reativar
                    </button>
                )}
            </div>
        </div>
    );
}
