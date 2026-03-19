import { useState, useMemo, useEffect } from "react";
import { Loader2, Send, User, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lista de médicos
import { MEDICOS } from "@/constants/doctors";
import { generateSecureToken } from "@/lib/utils/token";

interface SendToDoctorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrenceId: string;
  protocolo: string;
  pacienteNome: string | null;
  pacienteTipoExame: string | null;
  pacienteUnidade: string | null;
  pacienteDataHoraEvento: string | null;
  initialMedicoNome?: string | null;
  initialMensagem?: string | null;
  onSuccess: (publicToken: string, medicoNome: string) => void;
}

function cleanStoragePath(path: string): string {
  if (!path) return "";
  let clean = path;
  if (clean.startsWith("/")) clean = clean.substring(1);
  if (clean.startsWith("occurrence-attachments/")) clean = clean.substring("occurrence-attachments/".length);
  return clean;
}

export function SendToDoctorModal({
  open,
  onOpenChange,
  occurrenceId,
  protocolo,
  pacienteNome,
  pacienteTipoExame,
  pacienteUnidade,
  pacienteDataHoraEvento,
  initialMedicoNome,
  initialMensagem,
  onSuccess,
}: SendToDoctorModalProps) {
  const { toast } = useToast();
  const [medicoId, setMedicoId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [medicoPopoverOpen, setMedicoPopoverOpen] = useState(false);

  // Set initial values when modal opens
  useEffect(() => {
    if (open) {
      if (initialMensagem) setMensagem(initialMensagem);
      if (initialMedicoNome) {
        const medico = MEDICOS.find(m => m.nome === initialMedicoNome);
        if (medico) setMedicoId(medico.id);
      }
    } else {
      // Reset if needed when closing, or leave as is. 
      // User might want to keep what they typed if they accidentally close?
      // Usually, resetting is safer for a "fresh" modal experience.
      if (!initialMedicoNome) setMedicoId("");
      if (!initialMensagem) setMensagem("");
    }
  }, [open, initialMedicoNome, initialMensagem]);

  const medicoSelecionado = MEDICOS.find((m) => m.id === medicoId);

  const handleSend = async () => {
    if (!medicoId || !mensagem.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um médico e escreva uma mensagem.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Import supabase here to avoid circular dependencies
      const { supabase } = await import("@/integrations/supabase/client");

      // Generate public token in the browser
      const publicToken = generateSecureToken();
      const publicLink = `https://gestao.imagoradiologia.cloud/public/revisao-laudo/${publicToken}`;

      // Get user for history
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Fetch current history
      const { data: currentData } = await supabase
        .from("occurrences_laudo" as any)
        .select("historico_status, status")
        .eq("id", occurrenceId)
        .single();

      const currentHistory = (currentData as any)?.historico_status || [];
      const newHistoryItem = {
        status_de: (currentData as any)?.status || "em_triagem",
        status_para: "em_analise",
        alterado_por: userId,
        motivo: `Encaminhada ao médico: ${medicoSelecionado?.nome}`,
        alterado_em: new Date().toISOString()
      };

      // Update occurrence with token and doctor info
      const { error: updateError } = await supabase
        .from("occurrences_laudo" as any)
        .update({
          public_token: publicToken,
          medico_destino: medicoSelecionado?.nome,
          mensagem_admin_medico: mensagem,
          encaminhada_em: new Date().toISOString(),
          status: "em_analise",
          historico_status: [...currentHistory, newHistoryItem]
        })
        .eq("id", occurrenceId);

      if (updateError) throw updateError;

      // Fetch attachments with signed URLs to send in webhook (from default bucket, assuming names stored in attachments table or similar)
      // Wait, attachments are now in JSONB 'anexos' in occurrences_laudo? 
      // Or in 'occurrence_attachments' table? 
      // The instruction said: "Consolidating data from satellite tables ... occurrence_attachments ... into JSONB"
      // BUT existing logic fetches from 'occurrence_attachments' table (line 131).
      // My migration moves them to JSONB. But does it DROP the table?
      // "3. Eliminating redundant satellite tables ... occurrence_attachments".
      // Yes, I should use the JSONB column 'anexos'.

      // Re-fetch updated occurrence to get attachments (anexos)
      const { data: updatedOcc } = await supabase
        .from("occurrences_laudo" as any)
        .select("anexos")
        .eq("id", occurrenceId)
        .single();

      const attachmentsData = (updatedOcc as any)?.anexos || [];

      let attachmentsForWebhook: any[] = [];
      if (attachmentsData && attachmentsData.length > 0) {
        attachmentsForWebhook = await Promise.all(
          attachmentsData.map(async (att: any) => {
            const fileUrl = typeof att === 'string' ? att : att.file_url;
            const fileName = typeof att === 'string' ? att.split('/').pop() : att.file_name;
            const fileType = typeof att === 'string' ? null : att.file_type;

            const cleanPath = cleanStoragePath(fileUrl);
            // Sign URL
            const { data: urlData } = await supabase.storage
              .from("occurrence-attachments")
              .createSignedUrl(cleanPath, 60 * 60 * 24 * 365); // 1 year
            return {
              file_name: fileName,
              mime_type: fileType,
              file_url: urlData?.signedUrl || null,
              is_image: typeof att === 'object' ? att.is_image : false, // Default to false for legacy strings if unknown
            };
          })
        );
      }

      // Send webhook to notify doctor //nunca mudar sem me consultar especificamente 
      const webhookUrl = "https://n8n.imagoradiologia.cloud/webhook/medico"; //nunca mudar sem me consultar especificamente 

      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evento: "encaminhamento_medico",
            occurrence_id: occurrenceId,
            protocolo,
            mensagem_admin: mensagem,
            medico: medicoSelecionado?.nome,
            medico_id: medicoId,
            public_link: publicLink,
            paciente_nome: pacienteNome,
            paciente_exame: pacienteTipoExame,
            paciente_unidade: pacienteUnidade,
            paciente_data_hora_evento: pacienteDataHoraEvento,
            encaminhada_em: new Date().toISOString(),
            anexos: attachmentsForWebhook,
          }),
        });
        console.log("[webhook] Encaminhamento ao médico enviado");
      } catch (webhookError) {
        console.error("[webhook] Erro ao enviar webhook:", webhookError);
        // Continue even if webhook fails
      }

      toast({
        title: "Encaminhado com sucesso",
        description: `Ocorrência enviada para ${medicoSelecionado?.nome}`,
      });

      onSuccess(publicToken, medicoSelecionado?.nome || "");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao encaminhar:", error);
      toast({
        title: "Erro ao encaminhar",
        description: error.message || "Não foi possível encaminhar ao médico.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Encaminhar para Médico
          </DialogTitle>
          <DialogDescription>
            Selecione o médico e escreva a mensagem para encaminhar esta revisão
            de laudo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Médico *</Label>
            <Popover open={medicoPopoverOpen} onOpenChange={setMedicoPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={medicoPopoverOpen}
                  className="w-full justify-between"
                >
                  {medicoSelecionado ? medicoSelecionado.nome : "Pesquisar médico..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar médico..." />
                  <CommandList>
                    <CommandEmpty>Nenhum médico encontrado.</CommandEmpty>
                    <CommandGroup>
                      {MEDICOS.map((medico) => (
                        <CommandItem
                          key={medico.id}
                          value={medico.nome}
                          onSelect={() => {
                            setMedicoId(medico.id);
                            setMedicoPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              medicoId === medico.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {medico.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem para o médico *</Label>
            <Textarea
              id="mensagem"
              placeholder="Descreva o que precisa ser revisado e qualquer informação relevante..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium text-muted-foreground mb-1">
              Dados da ocorrência:
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <strong>Protocolo:</strong> {protocolo}
              </li>
              <li>
                <strong>Paciente:</strong> {pacienteNome || "Não informado"}
              </li>
              <li>
                <strong>Exame:</strong> {pacienteTipoExame || "Não informado"}
              </li>
              <li>
                <strong>Unidade:</strong> {pacienteUnidade || "Não informada"}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
