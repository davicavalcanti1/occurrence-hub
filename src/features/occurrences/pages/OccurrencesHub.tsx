import React from "react";
import { useNavigate } from "react-router-dom";
import {
    PlusCircle,
    BarChart3,
    History,
    Columns3,
    BookOpen,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowRight,
    TrendingUp,
    Activity as ActivityIcon,
    Filter,
    ShieldAlert,
    AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
    useOccurrences,
    DbOccurrence
} from "@/features/occurrences/hooks/useOccurrences";
import { OccurrenceStatus, statusConfig } from "@/features/occurrences/types/occurrence";

// Type label map for activity feed
const activityTypeLabelMap: Record<string, string> = {
    enfermagem: "Enfermagem",
    administrativa: "Administrativa",
    revisao_exame: "Revisão de Exame",
    livre: "Livre",
    seguranca_paciente: "Seg. Paciente",
    paciente: "Paciente",
};

export default function OccurrencesHub() {
    const navigate = useNavigate();
    const { role, isAdmin } = useAuth();
    const { canCreate } = usePermissions();

    // Fetch occurrences
    const { data: occurrences = [], isLoading } = useOccurrences();

    // Stats calculation
    const total = occurrences.length;
    const pending = occurrences.filter((o: DbOccurrence) => o.status === 'registrada' || o.status === 'em_triagem').length;
    const inProgress = occurrences.filter((o: DbOccurrence) => o.status === 'em_analise' || o.status === 'acao_em_andamento').length;
    const completed = occurrences.filter((o: DbOccurrence) => o.status === 'concluida').length;

    // Sem Triagem count: no triage AND status is registrada or em_triagem
    const semTriagem = occurrences.filter((o: DbOccurrence) =>
        !o.triagem && (o.status === 'registrada' || o.status === 'em_triagem')
    ).length;

    // Evento Sentinela open occurrences
    const sentinelaAbertos = occurrences.filter((o: DbOccurrence) =>
        o.triagem === 'evento_sentinela' &&
        o.status !== 'concluida' &&
        o.status !== 'improcedente'
    );

    // Aguardando Triagem: last 5 without triage, ordered by criado_em ascending (oldest first)
    const aguardandoTriagem = [...occurrences]
        .filter((o: DbOccurrence) => !o.triagem && (o.status === 'registrada' || o.status === 'em_triagem'))
        .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
        .slice(0, 5);

    // Recent Activities
    const recentActivities = [...occurrences]
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
        .slice(0, 8);

    return (
        <MainLayout>
            <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <ActivityIcon className="h-8 w-8 text-primary" />
                            Central de Ocorrências
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isAdmin ? "Visão completa de toda a unidade" : `Gestão de ocorrências para ${role}`}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {canCreate('ocorrencias') && (
                            <Button
                                onClick={() => navigate("/ocorrencias/nova")}
                                className="bg-primary hover:bg-primary/90 text-white rounded-lg shadow-md transition-all flex gap-2"
                            >
                                <PlusCircle className="h-5 w-5" />
                                Registrar Ocorrência
                            </Button>
                        )}
                    </div>
                </div>

                {/* Evento Sentinela Alert Banner */}
                {!isLoading && sentinelaAbertos.length > 0 && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                            <p className="text-sm font-semibold text-red-700">
                                ⚠️ {sentinelaAbertos.length} ocorrência(s) com Evento Sentinela em aberto — requer atenção imediata
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                            onClick={() => navigate("/kanbans")}
                        >
                            Ver no Kanban
                        </Button>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard
                        title="Total"
                        value={total}
                        icon={<TrendingUp className="h-6 w-6" />}
                        color="primary"
                        loading={isLoading}
                    />
                    <KPICard
                        title="Pendentes"
                        value={pending}
                        icon={<AlertCircle className="h-6 w-6" />}
                        color="warning"
                        loading={isLoading}
                    />
                    <KPICard
                        title="Em Andamento"
                        value={inProgress}
                        icon={<Clock className="h-6 w-6" />}
                        color="info"
                        loading={isLoading}
                    />
                    <KPICard
                        title="Concluídas"
                        value={completed}
                        icon={<CheckCircle2 className="h-6 w-6" />}
                        color="success"
                        loading={isLoading}
                    />
                    <KPICard
                        title="Sem Triagem"
                        value={semTriagem}
                        icon={<ShieldAlert className="h-6 w-6" />}
                        color={semTriagem > 0 ? "warning" : "success"}
                        loading={isLoading}
                    />
                </div>

                {/* Aguardando Triagem Section */}
                {!isLoading && aguardandoTriagem.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Aguardando Triagem
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                                {aguardandoTriagem.length} pendente{aguardandoTriagem.length > 1 ? "s" : ""}
                            </Badge>
                        </h2>
                        <Card className="border border-amber-200 bg-amber-50/40">
                            <CardContent className="p-0">
                                <div className="divide-y divide-amber-100">
                                    {aguardandoTriagem.map((occ) => (
                                        <div
                                            key={occ.id}
                                            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-amber-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                                                    #{occ.protocolo}
                                                </span>
                                                <span className="text-xs text-muted-foreground bg-white border border-border px-2 py-0.5 rounded shrink-0">
                                                    {activityTypeLabelMap[occ.tipo] || occ.tipo || "—"}
                                                </span>
                                                <span className="text-sm font-medium text-foreground truncate">
                                                    {occ.paciente_nome_completo || "Sem nome"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(occ.criado_em), { addSuffix: true, locale: ptBR })}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
                                                    onClick={() => navigate(`/ocorrencias/${occ.id}`)}
                                                >
                                                    Classificar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Navigation Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <Filter className="h-5 w-5 text-primary" />
                            Ferramentas de Gestão
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NavCard
                                title="Quadro Kanban"
                                description="Gestão visual por status e fluxo de trabalho"
                                icon={<Columns3 className="h-8 w-8" />}
                                onClick={() => navigate("/kanbans")}
                                badge={occurrences.filter((o: DbOccurrence) => o.status !== 'concluida').length}
                            />
                            <NavCard
                                title="Histórico Completo"
                                description="Lista detalhada e filtros avançados"
                                icon={<History className="h-8 w-8" />}
                                onClick={() => navigate("/ocorrencias/historico")}
                            />
                            <NavCard
                                title="Painel de Métricas"
                                description="Gráficos, SLAs e indicadores de performance"
                                icon={<BarChart3 className="h-8 w-8" />}
                                onClick={() => navigate("/ocorrencias/dashboard")}
                            />
                            <NavCard
                                title="Livro de Registros"
                                description="Registro formal e contínuo por setor"
                                icon={<BookOpen className="h-8 w-8" />}
                                onClick={() => navigate("/livro")}
                            />
                        </div>

                        {/* Quick Access to Specialized Registrations */}
                        {canCreate('ocorrencias') && (
                        <Card className="border border-primary/10 bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Atalhos de Registro</CardTitle>
                                <CardDescription>Crie ocorrências específicas rapidamente</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2 text-sm">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/ocorrencias/nova/seguranca_paciente")}
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                >
                                    <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                    Segurança do Paciente
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate("/ocorrencias/nova/enfermagem")}>
                                    Enfermagem
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate("/ocorrencias/nova/administrativa")}>
                                    Administrativa
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate("/ocorrencias/nova/revisao_exame/revisao_exame")}>
                                    Revisão de Exame
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate("/ocorrencias/nova-livre")}>
                                    Livre
                                </Button>
                            </CardContent>
                        </Card>
                        )}
                    </div>

                    {/* Activity Feed Sidebar */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <ActivityIcon className="h-5 w-5 text-primary" />
                            Atividade Recente
                        </h2>
                        <Card className="h-[600px] flex flex-col overflow-hidden border border-border shadow-sm bg-white">
                            <CardContent className="p-0 flex-1 overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 text-center text-muted-foreground italic">Carregando atividade...</div>
                                ) : recentActivities.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground italic">Nenhuma atividade recente.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {recentActivities.map((activity) => (
                                            <ActivityItem key={activity.id} activity={activity} onClick={() => navigate(`/ocorrencias/${activity.id}`)} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <div className="p-4 border-t bg-muted/20 text-center">
                                <Button variant="ghost" size="sm" className="w-full text-primary hover:bg-primary/5" onClick={() => navigate("/ocorrencias/historico")}>
                                    Ver todo o histórico
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

// Sub-components
function KPICard({ title, value, icon, color, loading }: { title: string, value: number, icon: React.ReactNode, color: string, loading?: boolean }) {
    const colorMap: Record<string, string> = {
        primary: "text-primary bg-primary/10",
        warning: "text-amber-600 bg-amber-50",
        success: "text-emerald-600 bg-emerald-50",
        info: "text-blue-600 bg-blue-50"
    };

    return (
        <Card className="hover:shadow-md transition-all duration-300 border border-border bg-white">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800">
                        {loading ? "..." : value}
                    </h3>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function NavCard({ title, description, icon, onClick, badge }: { title: string, description: string, icon: React.ReactNode, onClick: () => void, badge?: number }) {
    return (
        <Card
            className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col bg-white"
            onClick={onClick}
        >
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-lg animate-in zoom-in">
                    {badge}
                </span>
            )}
            <CardHeader>
                <div className="h-14 w-14 rounded-2xl bg-slate-50 group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors duration-300 text-slate-600 group-hover:text-primary border border-slate-100 group-hover:border-primary/20">
                    {icon}
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors text-slate-800">{title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-slate-500">{description}</CardDescription>
            </CardHeader>
            <div className="mt-auto p-6 pt-0 flex justify-end">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-primary/10 transition-colors">
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary transform transition-transform group-hover:translate-x-1" />
                </div>
            </div>
        </Card>
    );
}

function ActivityItem({ activity, onClick }: { activity: DbOccurrence, onClick: () => void }) {
    const status = activity.status as OccurrenceStatus;
    const config = statusConfig[status];

    return (
        <div
            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-4 border-l-2 border-transparent hover:border-primary/30"
            onClick={onClick}
        >
            <div className="relative">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${config?.bgColor || 'bg-slate-100'}`}>
                    <PlusCircle className={`h-5 w-5 ${config?.color || 'text-slate-600'}`} />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold text-primary tracking-tight px-1.5 py-0.5 bg-primary/5 rounded">#{activity.protocolo}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(activity.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                    {activityTypeLabelMap[activity.tipo] || activity.tipo || 'Assistencial'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 h-5 tracking-tight border-none shadow-sm ${config?.bgColor} ${config?.color}`}>
                        {config?.label || activity.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {activity.paciente_nome_completo || 'Sem nome'}
                    </span>
                </div>
            </div>
        </div>
    );
}
