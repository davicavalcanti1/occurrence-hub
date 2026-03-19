import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, AreaChart, Area, Cell
} from 'recharts';
import { Calendar, Filter, Droplet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LogData {
    created_at: string;
    quantity: number;
    sku: string;
    action_type: string;
}

interface TonerInfo {
    sku: string;
    cor: string;
    cor_hex?: string;
}

interface TonerAnalyticsDashboardProps {
    logs: LogData[];
    estoque: TonerInfo[];
}

export function TonerAnalyticsDashboard({ logs, estoque }: TonerAnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

    // Utility to get elegant color hex
    const getTonerColorHex = (cor: string) => {
        const c = cor.toLowerCase();
        if (c.includes('cyan') || c.includes('ciano')) return '#06b6d4';
        if (c.includes('magenta')) return '#d946ef';
        if (c.includes('yellow') || c.includes('amarelo')) return '#eab308';
        return '#1e293b';
    };

    // Filter logs based on date
    const filteredLogs = useMemo(() => {
        const now = new Date();
        const daysToSubtract = timeRange === '7d' ? 7 : 30;
        const thresholdDate = new Date(now.setDate(now.getDate() - daysToSubtract));

        return logs.filter(log => {
            // Only consider "uso_" indicating direct consumption on printer
            const isUsage = log.action_type.includes('uso_');
            if (!isUsage) return false;

            const logDate = new Date(log.created_at);
            return logDate >= thresholdDate;
        });
    }, [logs, timeRange]);

    // Aggregate by SKU for Bar Chart
    const colorConsumptionData = useMemo(() => {
        const map: Record<string, { label: string; quantidade: number; fill: string }> = {};

        filteredLogs.forEach(log => {
            const toner = estoque.find(t => t.sku === log.sku);
            if (!toner) return;

            const key = toner.sku;
            if (!map[key]) {
                map[key] = {
                    label: `${toner.cor} (${toner.sku})`,
                    quantidade: 0,
                    fill: getTonerColorHex(toner.cor)
                };
            }
            map[key].quantidade += log.quantity;
        });

        return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
    }, [filteredLogs, estoque]);

    // Aggregate by Date for Trend Line Chart
    const trendData = useMemo(() => {
        const map: Record<string, number> = {};
        const daysToIterate = timeRange === '7d' ? 7 : 30;

        // Initialize all past days with 0 to make the chart look contiguous
        for (let i = daysToIterate - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            map[dateString] = 0;
        }

        filteredLogs.forEach(log => {
            const d = new Date(log.created_at);
            const dateString = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            if (map[dateString] !== undefined) {
                map[dateString] += log.quantity;
            }
        });

        return Object.keys(map).map(date => ({
            data: date,
            trocas: map[date]
        }));
    }, [filteredLogs, timeRange]);

    return (
        <div className="space-y-4 mb-8">

            {/* Header and Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-blue-600" />
                        Análise de Consumo
                    </h2>
                    <p className="text-sm text-slate-500">Métricas de toners substituídos diretamente nas impressoras.</p>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    <button
                        onClick={() => setTimeRange('7d')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${timeRange === '7d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Calendar className="w-3.5 h-3.5" /> 7 Dias
                    </button>
                    <button
                        onClick={() => setTimeRange('30d')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${timeRange === '30d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-3.5 h-3.5" /> 30 Dias
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Chart 1: Cores Mais Consumidas */}
                <Card className="border-slate-200 shadow-sm border-t-4 border-t-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Cores mais trocadas</CardTitle>
                        <CardDescription className="text-xs">Quantidade total no período</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 pt-4">
                        {colorConsumptionData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                Nenhum consumo registrado neste período.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={colorConsumptionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        {colorConsumptionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Chart 2: Tendência de Trocas (Linha de Tempo) */}
                <Card className="border-slate-200 shadow-sm border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Volume de Trocas (Tendência)</CardTitle>
                        <CardDescription className="text-xs">Evolução diária de toners inseridos em máquinas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 pt-4">
                        {colorConsumptionData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                Gráfico sem dados no período.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorTrocas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="data"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        dy={10}
                                        interval={timeRange === '30d' ? 3 : 0}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="trocas"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorTrocas)"
                                        name="Qtd. Trocada"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
