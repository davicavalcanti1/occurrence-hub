import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PlusCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  ShieldAlert,
  ArrowRight,
  Columns3,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOccurrences, DbOccurrence } from "@/features/occurrences/hooks/useOccurrences";
import { statusConfig, OccurrenceStatus } from "@/features/occurrences/types/occurrence";
import { usePermissions } from "@/hooks/usePermissions";

const activityTypeLabel: Record<string, string> = {
  enfermagem: "Enfermagem",
  administrativa: "Administrativa",
  revisao_exame: "Revisão de Exame",
  seguranca_paciente: "Seg. Paciente",
  livre: "Livre",
  paciente: "Paciente",
  assistencial: "Assistencial",
  tecnica: "Técnica",
};

function KPICard({ title, value, icon, color = "default", loading }: {
  title: string; value: number; icon: React.ReactNode;
  color?: "default" | "warning" | "success" | "danger"; loading?: boolean;
}) {
  const colors = {
    default: "bg-blue-50 border-blue-100 text-blue-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
    danger:  "bg-red-50 border-red-100 text-red-700",
  };
  return (
    <Card className={`border ${colors[color]}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/60 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium opacity-70">{title}</p>
            <p className="text-2xl font-bold">{loading ? "—" : value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { canCreate } = usePermissions();
  const { data: occurrences = [], isLoading } = useOccurrences();

  const pending    = occurrences.filter(o => o.status === 'registrada' || o.status === 'em_triagem').length;
  const inProgress = occurrences.filter(o => o.status === 'em_analise' || o.status === 'acao_em_andamento').length;
  const concluded  = occurrences.filter(o => o.status === 'concluida').length;
  const semTriagem = occurrences.filter(o => !o.triagem && (o.status === 'registrada' || o.status === 'em_triagem')).length;

  const recent = [...occurrences]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 6);

  return (
    <MainLayout>
      <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Olá, {profile?.full_name?.split(' ')[0] || 'bem-vindo'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isAdmin ? "Visão geral de todas as ocorrências" : "Suas ocorrências em tempo real"}
            </p>
          </div>
          <div className="flex gap-3">
            {canCreate('ocorrencias') && (
              <Button onClick={() => navigate("/ocorrencias/nova")} className="gap-2 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                Nova Ocorrência
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/kanbans")} className="gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Pendentes" value={pending} icon={<AlertCircle className="h-5 w-5" />} color="warning" loading={isLoading} />
          <KPICard title="Em Andamento" value={inProgress} icon={<Clock className="h-5 w-5" />} color="default" loading={isLoading} />
          <KPICard title="Concluídas" value={concluded} icon={<CheckCircle2 className="h-5 w-5" />} color="success" loading={isLoading} />
          <KPICard title="Sem Triagem" value={semTriagem} icon={<ShieldAlert className="h-5 w-5" />} color={semTriagem > 0 ? "danger" : "success"} loading={isLoading} />
        </div>

        {/* Recent activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Atividade Recente
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/ocorrencias")} className="gap-1 text-muted-foreground">
              Ver tudo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : recent.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhuma ocorrência registrada ainda.</p>
                {canCreate('ocorrencias') && (
                  <Button onClick={() => navigate("/ocorrencias/nova")} variant="outline" size="sm">
                    Registrar primeira ocorrência
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {recent.map((occ) => {
                  const cfg = statusConfig[occ.status as OccurrenceStatus];
                  return (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/ocorrencias/${occ.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                          #{occ.protocolo}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {activityTypeLabel[occ.tipo] || occ.tipo}
                        </Badge>
                        <span className="text-sm text-foreground truncate">
                          {occ.paciente_nome_completo || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg?.bgColor} ${cfg?.textColor}`}>
                          {cfg?.label || occ.status}
                        </span>
                        <span className="text-xs text-muted-foreground hidden md:block">
                          {formatDistanceToNow(new Date(occ.criado_em), { addSuffix: true, locale: ptBR })}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
