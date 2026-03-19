import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Settings2,
  CheckCircle2,
  XCircle,
  Users,
  Mail,
  Loader2,
  Globe,
  Palette,
} from "lucide-react";

const ALL_MODULES = [
  { id: "ocorrencias",    label: "Ocorrências" },
  { id: "checkin",        label: "Check-in / Fila" },
  { id: "controlemidia",  label: "Controle de Mídia" },
  { id: "inspecoes",      label: "Inspeções" },
  { id: "toners",         label: "Toners" },
  { id: "analise",        label: "Anamnese" },
  { id: "livro",          label: "Livro" },
  { id: "farol_usg",      label: "Farol USG" },
];

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  modules: string[] | null;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: "admin",      label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "rh",         label: "RH" },
  { value: "enfermagem", label: "Enfermagem" },
  { value: "recepcao",   label: "Recepção" },
  { value: "estoque",    label: "Estoque" },
  { value: "user",       label: "Usuário Padrão" },
];

export default function Developer() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", primary_color: "#2563eb", logo_url: "", modules: [] as string[] });
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", role: "admin" });
  const [inviting, setInviting] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({ name: "", slug: "" });

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["developer-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, is_active, logo_url, primary_color, modules, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Tenant[];
    },
    enabled: !!profile,
  });

  const updateTenant = useMutation({
    mutationFn: async (t: { id: string; name: string; primary_color: string; logo_url: string; modules: string[] }) => {
      const { error } = await supabase
        .from("tenants")
        .update({ name: t.name, primary_color: t.primary_color, logo_url: t.logo_url || null, modules: t.modules })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developer-tenants"] });
      toast({ title: "Empresa atualizada com sucesso" });
      setEditingTenant(null);
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tenants").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developer-tenants"] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createTenant = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert({ name, slug, is_active: true, modules: ALL_MODULES.map(m => m.id) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developer-tenants"] });
      toast({ title: "Empresa criada com sucesso" });
      setCreatingTenant(false);
      setNewTenantForm({ name: "", slug: "" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar empresa", description: e.message, variant: "destructive" }),
  });

  const openEdit = (t: Tenant) => {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      primary_color: t.primary_color || "#2563eb",
      logo_url: t.logo_url || "",
      modules: t.modules || ALL_MODULES.map(m => m.id),
    });
    setInviteForm({ full_name: "", email: "", role: "admin" });
  };

  const toggleModule = (moduleId: string) => {
    setEditForm(f => ({
      ...f,
      modules: f.modules.includes(moduleId)
        ? f.modules.filter(m => m !== moduleId)
        : [...f.modules, moduleId],
    }));
  };

  const handleInvite = async () => {
    if (!editingTenant || !inviteForm.email || !inviteForm.full_name) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { ...inviteForm, tenant_id: editingTenant.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.success === false) {
        toast({ title: "Erro ao convidar", description: error?.message || data?.message, variant: "destructive" });
      } else {
        toast({ title: "Convite enviado!", description: `${inviteForm.email} receberá as instruções por email.` });
        setInviteForm({ full_name: "", email: "", role: "admin" });
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Globe className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel Developer</h1>
              <p className="text-sm text-muted-foreground">Gerencie todas as empresas do sistema</p>
            </div>
          </div>
          <Button onClick={() => setCreatingTenant(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de Empresas</p>
            <p className="text-3xl font-bold">{tenants.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Ativas</p>
            <p className="text-3xl font-bold text-green-600">{tenants.filter(t => t.is_active).length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Inativas</p>
            <p className="text-3xl font-bold text-red-500">{tenants.filter(t => !t.is_active).length}</p>
          </div>
        </div>

        {/* Tenants table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Empresa</TableHead>
                <TableHead className="font-semibold">Slug</TableHead>
                <TableHead className="font-semibold">Módulos</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: t.primary_color || "#2563eb" }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{t.slug}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.modules || []).slice(0, 3).map(m => {
                          const mod = ALL_MODULES.find(x => x.id === m);
                          return (
                            <Badge key={m} variant="secondary" className="text-[10px]">
                              {mod?.label || m}
                            </Badge>
                          );
                        })}
                        {(t.modules || []).length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{(t.modules || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={t.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                        }
                      >
                        {t.is_active ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Inativa</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                          className="h-8"
                        >
                          {t.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(t)}
                          className="h-8 gap-1"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Configurar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={(o) => !o && setEditingTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingTenant?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Basic info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Informações da Empresa
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome da Empresa</label>
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Logo URL</label>
                  <Input
                    value={editForm.logo_url}
                    onChange={e => setEditForm(f => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor Principal
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editForm.primary_color}
                      onChange={e => setEditForm(f => ({ ...f, primary_color: e.target.value }))}
                      className="h-10 w-16 cursor-pointer rounded border"
                    />
                    <Input
                      value={editForm.primary_color}
                      onChange={e => setEditForm(f => ({ ...f, primary_color: e.target.value }))}
                      className="font-mono w-32"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Módulos Habilitados
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map(mod => {
                  const enabled = editForm.modules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left ${
                        enabled
                          ? "border-green-300 bg-green-50 text-green-800"
                          : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {enabled
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        : <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      }
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => editingTenant && updateTenant.mutate({ id: editingTenant.id, ...editForm })}
              disabled={updateTenant.isPending}
              className="w-full"
            >
              {updateTenant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>

            {/* Invite admin */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Convidar Usuário para esta Empresa
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder="Nome completo"
                  value={inviteForm.full_name}
                  onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                />
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.email || !inviteForm.full_name}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Enviar Convite
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={creatingTenant} onOpenChange={setCreatingTenant}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome da Empresa</label>
              <Input
                placeholder="Ex: Clínica Saúde Total"
                value={newTenantForm.name}
                onChange={e => setNewTenantForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug (identificador único)</label>
              <Input
                placeholder="Ex: clinica-saude-total"
                value={newTenantForm.slug}
                onChange={e => setNewTenantForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Apenas letras minúsculas, números e hífens</p>
            </div>
            <Button
              onClick={() => createTenant.mutate(newTenantForm)}
              disabled={createTenant.isPending || !newTenantForm.name || !newTenantForm.slug}
              className="w-full"
            >
              {createTenant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Empresa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
