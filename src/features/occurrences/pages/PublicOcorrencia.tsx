import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FileText, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OccurrencePublic {
  id: string;
  protocolo: string;
  tipo: string;
  subtipo: string | null;
  status: string;
  triagem: string | null;
  descricao_detalhada: string;
  acao_imediata: string | null;
  paciente_nome_completo: string | null;
  paciente_tipo_exame: string | null;
  paciente_unidade_local: string | null;
  paciente_data_hora_evento: string | null;
  criado_em: string;
}

const TYPE_LABELS: Record<string, string> = {
  revisao_exame: "Revisão de Exame",
  enfermagem: "Ocorrência de Enfermagem",
  administrativa: "Ocorrência Administrativa",
  seguranca_paciente: "Segurança do Paciente",
  livre: "Ocorrência Livre",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  registrada: { label: "Registrada", color: "bg-slate-100 text-slate-700" },
  em_triagem: { label: "Em Triagem", color: "bg-amber-100 text-amber-700" },
  em_analise: { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
  acao_em_andamento: { label: "Ação em Andamento", color: "bg-orange-100 text-orange-700" },
  concluida: { label: "Concluída", color: "bg-emerald-100 text-emerald-700" },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

const TRIAGE_LABELS: Record<string, { label: string; color: string }> = {
  leve: { label: "Leve", color: "bg-sky-100 text-sky-700" },
  moderada: { label: "Moderada", color: "bg-yellow-100 text-yellow-700" },
  grave: { label: "Grave", color: "bg-orange-100 text-orange-700" },
  critica: { label: "Crítica", color: "bg-red-100 text-red-700" },
  evento_sentinela: { label: "Evento Sentinela", color: "bg-red-900 text-white" },
};

export default function PublicOcorrencia() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [occurrence, setOccurrence] = useState<OccurrencePublic | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }

    supabase
      .from("occurrences_laudo" as any)
      .select("id, protocolo, tipo, subtipo, status, triagem, descricao_detalhada, acao_imediata, paciente_nome_completo, paciente_tipo_exame, paciente_unidade_local, paciente_data_hora_evento, criado_em")
      .eq("public_token", token)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (error || !data) setInvalid(true);
        else setOccurrence(data as OccurrencePublic);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (invalid || !occurrence) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Esta ocorrência não foi encontrada ou o link não é mais válido.
        </p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[occurrence.status] || { label: occurrence.status, color: "bg-gray-100 text-gray-700" };
  const triagemInfo = occurrence.triagem ? TRIAGE_LABELS[occurrence.triagem] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-primary">Central de Ocorrências</span>
          <div className="text-right">
            <p className="text-xs text-gray-400">Ocorrência</p>
            <p className="font-mono font-bold text-gray-800">{occurrence.protocolo}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {occurrence.status === "concluida"
              ? <CheckCircle2 className="h-4 w-4" />
              : <Clock className="h-4 w-4" />
            }
            {statusInfo.label}
          </span>
          {triagemInfo && (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${triagemInfo.color}`}>
              Triagem: {triagemInfo.label}
            </span>
          )}
          <span className="text-sm text-gray-500 ml-auto">
            {format(new Date(occurrence.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-100" />
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">
                  {TYPE_LABELS[occurrence.tipo] || occurrence.tipo}
                  {occurrence.subtipo && ` — ${occurrence.subtipo.replace(/_/g, " ")}`}
                </p>
                <h2 className="text-white font-bold text-lg">Protocolo {occurrence.protocolo}</h2>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Patient info */}
            {(occurrence.paciente_nome_completo || occurrence.paciente_tipo_exame) && (
              <div className="rounded-xl bg-gray-50 border p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informações do Paciente</p>
                {occurrence.paciente_nome_completo && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Nome: </span>
                    <span className="text-gray-600">{occurrence.paciente_nome_completo}</span>
                  </p>
                )}
                {occurrence.paciente_tipo_exame && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Exame: </span>
                    <span className="text-gray-600">{occurrence.paciente_tipo_exame}</span>
                  </p>
                )}
                {occurrence.paciente_unidade_local && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Local: </span>
                    <span className="text-gray-600">{occurrence.paciente_unidade_local}</span>
                  </p>
                )}
                {occurrence.paciente_data_hora_evento && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Data do Evento: </span>
                    <span className="text-gray-600">
                      {format(new Date(occurrence.paciente_data_hora_evento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descrição</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl border p-4">
                {occurrence.descricao_detalhada}
              </p>
            </div>

            {/* Immediate action */}
            {occurrence.acao_imediata && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ação Imediata</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-4">
                  {occurrence.acao_imediata}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Este é um link público somente leitura gerado automaticamente pelo sistema.
        </p>
      </div>
    </div>
  );
}
