import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, Palette, Webhook, Clock, Save } from "lucide-react";

interface Settings {
  id?: string;
  tenant_id: string;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  webhook_nova_ocorrencia: string | null;
  webhook_ocorrencia_concluida: string | null;
  webhook_encaminhar_medico: string | null;
  webhook_confirmacao_medico: string | null;
  webhook_paciente_portal: string | null;
  webhook_banheiro: string | null;
  webhook_dispenser: string | null;
  webhook_cilindro: string | null;
  webhook_dea: string | null;
  webhook_copa: string | null;
  sla_triagem_horas: number | null;
  sla_analise_horas: number | null;
  sla_acao_horas: number | null;
  sla_sentinela_triagem_horas: number | null;
  sla_sentinela_acao_horas: number | null;
}

const OCCURRENCE_WEBHOOKS = [
  { key: "webhook_nova_ocorrencia",      label: "Nova Ocorrência" },
  { key: "webhook_ocorrencia_concluida", label: "Ocorrência Concluída" },
  { key: "webhook_encaminhar_medico",    label: "Encaminhar ao Médico" },
  { key: "webhook_confirmacao_medico",   label: "Confirmação do Médico" },
  { key: "webhook_paciente_portal",      label: "Paciente Portal" },
];

const INSPECTION_WEBHOOKS = [
  { key: "webhook_banheiro",  label: "Banheiro" },
  { key: "webhook_dispenser", label: "Dispenser" },
  { key: "webhook_cilindro",  label: "Cilindros" },
  { key: "webhook_dea",       label: "DEA" },
  { key: "webhook_copa",      label: "Copa" },
];

const SLA_FIELDS = [
  { key: "sla_triagem_horas",           label: "SLA Triagem (horas)",               defaultVal: 24 },
  { key: "sla_analise_horas",           label: "SLA Análise (horas)",               defaultVal: 72 },
  { key: "sla_acao_horas",              label: "SLA Ação (horas)",                  defaultVal: 168 },
  { key: "sla_sentinela_triagem_horas", label: "SLA Sentinela — Triagem (horas)",   defaultVal: 2 },
  { key: "sla_sentinela_acao_horas",    label: "SLA Sentinela — Ação (horas)",      defaultVal: 72 },
];

const DEFAULTS: Omit<Settings, "tenant_id"> = {
  company_name: null,
  logo_url: null,
  primary_color: "#2563eb",
  webhook_nova_ocorrencia: null,
  webhook_ocorrencia_concluida: null,
  webhook_encaminhar_medico: null,
  webhook_confirmacao_medico: null,
  webhook_paciente_portal: null,
  webhook_banheiro: null,
  webhook_dispenser: null,
  webhook_cilindro: null,
  webhook_dea: null,
  webhook_copa: null,
  sla_triagem_horas: 24,
  sla_analise_horas: 72,
  sla_acao_horas: 168,
  sla_sentinela_triagem_horas: 2,
  sla_sentinela_acao_horas: 72,
};

export function TenantSettings() {
  const { profile, role } = useAuth();
  const isDeveloper = role === 'developer';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Settings>({ ...DEFAULTS, tenant_id: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-settings", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_settings" as any)
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
    enabled: !!profile?.tenant_id,
  });

  useEffect(() => {
    if (data) {
      setForm({ ...DEFAULTS, ...data });
    } else if (profile?.tenant_id) {
      setForm({ ...DEFAULTS, tenant_id: profile.tenant_id });
    }
  }, [data, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { id: _id, ...rest } = form as any;
      const payload = { ...rest, tenant_id: profile!.tenant_id };
      const { error } = await (supabase as any)
        .from("tenant_settings")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Configurações salvas com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const set = (key: string, value: string | number | null) =>
    setForm(f => ({ ...f, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Identity */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          <Building2 className="h-4 w-4" />
          Identidade da Empresa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome da Empresa</label>
            <Input
              value={form.company_name || ""}
              onChange={e => set("company_name", e.target.value || null)}
              placeholder="Nome exibido no sistema"
              readOnly={!isDeveloper}
              className={!isDeveloper ? "bg-muted cursor-not-allowed" : ""}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Logo URL</label>
            <Input
              value={form.logo_url || ""}
              onChange={e => set("logo_url", e.target.value || null)}
              placeholder="https://..."
              readOnly={!isDeveloper}
              className={!isDeveloper ? "bg-muted cursor-not-allowed" : ""}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Palette className="h-4 w-4" /> Cor Principal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color || "#2563eb"}
                onChange={e => set("primary_color", e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border"
                disabled={!isDeveloper}
              />
              <Input
                value={form.primary_color || ""}
                onChange={e => set("primary_color", e.target.value || null)}
                className={"font-mono w-32" + (!isDeveloper ? " bg-muted cursor-not-allowed" : "")}
                readOnly={!isDeveloper}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SLA */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          <Clock className="h-4 w-4" />
          SLA de Ocorrências
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SLA_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium mb-1 block">{f.label}</label>
              <Input
                type="number"
                min={1}
                value={(form as any)[f.key] ?? f.defaultVal}
                onChange={e => set(f.key, parseInt(e.target.value) || f.defaultVal)}
                readOnly={!isDeveloper}
                className={!isDeveloper ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Occurrence webhooks */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          <Webhook className="h-4 w-4" />
          Webhooks — Ocorrências
        </h3>
        <div className="space-y-3">
          {OCCURRENCE_WEBHOOKS.map(w => (
            <div key={w.key}>
              <label className="text-sm font-medium mb-1 block">{w.label}</label>
              <Input
                value={(form as any)[w.key] || ""}
                onChange={e => set(w.key, e.target.value || null)}
                placeholder="https://n8n.example.com/webhook/..."
                className={"font-mono text-sm" + (!isDeveloper ? " bg-muted cursor-not-allowed" : "")}
                readOnly={!isDeveloper}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Inspection webhooks */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          <Webhook className="h-4 w-4" />
          Webhooks — Inspeções
        </h3>
        <div className="space-y-3">
          {INSPECTION_WEBHOOKS.map(w => (
            <div key={w.key}>
              <label className="text-sm font-medium mb-1 block">{w.label}</label>
              <Input
                value={(form as any)[w.key] || ""}
                onChange={e => set(w.key, e.target.value || null)}
                placeholder="https://n8n.example.com/webhook/..."
                className={"font-mono text-sm" + (!isDeveloper ? " bg-muted cursor-not-allowed" : "")}
                readOnly={!isDeveloper}
              />
            </div>
          ))}
        </div>
      </div>

      {!isDeveloper && (
        <p className="text-sm text-muted-foreground">Apenas o Developer pode editar estas configurações.</p>
      )}
      {isDeveloper && (
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      )}
    </div>
  );
}
