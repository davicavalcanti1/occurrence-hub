import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save, Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Subtype titles map
const subtypeTitles: Record<string, string> = {
    queda: "Queda de Paciente",
    erro_identificacao_paciente: "Erro de Identificação",
    reacao_contraste_grave: "Reação a Contraste Grave",
    falha_equipamento_clinico: "Falha de Equipamento Clínico",
    falha_comunicacao: "Falha de Comunicação",
    evento_sentinela_livre: "Evento Sentinela",
};

// Base schema
const baseSchema = z.object({
    pacienteNome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    dataHoraEvento: z.string().min(1, "Informe a data e hora do evento"),
    localSetor: z.string().min(1, "Informe o local/setor"),
    descricao: z.string().min(15, "Descrição deve ter pelo menos 15 caracteres"),
    houveDano: z.boolean().default(false),
    descricaoDano: z.string().optional(),
    // queda fields
    localQueda: z.string().optional(),
    pacienteAcompanhado: z.boolean().optional(),
    lesaoAparente: z.boolean().optional(),
    // erro_identificacao_paciente fields
    oQueFoiTrocado: z.string().optional(),
    comoIdentificado: z.string().optional(),
    // reacao_contraste_grave fields
    tipoContraste: z.string().optional(),
    gravidadeReacao: z.string().optional(),
    medicoAvaliou: z.boolean().optional(),
    // falha_equipamento_clinico fields
    equipamento: z.string().optional(),
    tipoFalha: z.string().optional(),
    pacientePrejudicado: z.boolean().optional(),
    // falha_comunicacao fields
    equipesEnvolvidas: z.string().optional(),
    tipoFalhaCom: z.string().optional(),
    // evento_sentinela_livre fields
    requerNotificacaoAnvisa: z.boolean().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

// Default datetime value = now formatted
function getNowFormatted() {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
}

export default function SegurancaPacienteForm() {
    const { subtipo } = useParams<{ subtipo: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { profile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const subtypeTitle = subtipo ? subtypeTitles[subtipo] || subtipo : "Segurança do Paciente";

    // For evento_sentinela_livre, require longer description
    const schema = subtipo === "evento_sentinela_livre"
        ? baseSchema.extend({
            descricao: z.string().min(50, "Para Evento Sentinela, descreva com pelo menos 50 caracteres"),
        })
        : baseSchema;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            pacienteNome: "",
            dataHoraEvento: getNowFormatted(),
            localSetor: "",
            descricao: "",
            houveDano: false,
            descricaoDano: "",
            localQueda: "",
            pacienteAcompanhado: false,
            lesaoAparente: false,
            oQueFoiTrocado: "",
            comoIdentificado: "",
            tipoContraste: "",
            gravidadeReacao: "",
            medicoAvaliou: false,
            equipamento: "",
            tipoFalha: "",
            pacientePrejudicado: false,
            equipesEnvolvidas: "",
            tipoFalhaCom: "",
            requerNotificacaoAnvisa: false,
        },
    });

    const houveDano = form.watch("houveDano");

    const onSubmit = async (data: FormValues) => {
        if (!profile?.tenant_id) {
            toast({ title: "Erro", description: "Sessão inválida.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: protocolo, error: protoError } = await supabase
                .rpc("generate_protocol" as any);

            if (protoError) throw protoError;

            // Build conditional fields object
            const conditionalFields: Record<string, any> = {};
            if (subtipo === "queda") {
                conditionalFields.localQueda = data.localQueda;
                conditionalFields.pacienteAcompanhado = data.pacienteAcompanhado;
                conditionalFields.lesaoAparente = data.lesaoAparente;
            } else if (subtipo === "erro_identificacao_paciente") {
                conditionalFields.oQueFoiTrocado = data.oQueFoiTrocado;
                conditionalFields.comoIdentificado = data.comoIdentificado;
            } else if (subtipo === "reacao_contraste_grave") {
                conditionalFields.tipoContraste = data.tipoContraste;
                conditionalFields.gravidadeReacao = data.gravidadeReacao;
                conditionalFields.medicoAvaliou = data.medicoAvaliou;
            } else if (subtipo === "falha_equipamento_clinico") {
                conditionalFields.equipamento = data.equipamento;
                conditionalFields.tipoFalha = data.tipoFalha;
                conditionalFields.pacientePrejudicado = data.pacientePrejudicado;
            } else if (subtipo === "falha_comunicacao") {
                conditionalFields.equipesEnvolvidas = data.equipesEnvolvidas;
                conditionalFields.tipoFalhaCom = data.tipoFalhaCom;
            } else if (subtipo === "evento_sentinela_livre") {
                conditionalFields.requerNotificacaoAnvisa = data.requerNotificacaoAnvisa;
            }

            const { error } = await supabase.from("occurrences_laudo" as any).insert({
                tenant_id: profile.tenant_id,
                protocolo,
                tipo: "seguranca_paciente",
                subtipo: subtipo,
                status: "registrada",
                paciente_nome_completo: data.pacienteNome,
                paciente_data_hora_evento: data.dataHoraEvento,
                paciente_unidade_local: data.localSetor,
                descricao_detalhada: data.descricao,
                acao_imediata: "",
                dados_especificos: {
                    ...conditionalFields,
                    houveDano: data.houveDano,
                    descricaoDano: data.descricaoDano,
                },
                criado_por: profile.id,
                historico_status: [
                    {
                        de: "registrada",
                        para: "registrada",
                        por: profile.id,
                        em: new Date().toISOString(),
                    },
                ],
                anexos: [],
            });

            if (error) throw error;

            toast({
                title: "Ocorrência registrada!",
                description: `Protocolo: ${protocolo}`,
            });
            navigate("/ocorrencias");
        } catch (error: any) {
            console.error("Error submitting seguranca_paciente occurrence:", error);
            toast({
                title: "Erro ao registrar",
                description: error.message || "Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div className="mx-auto max-w-2xl animate-fade-in p-4">
                <Button
                    variant="ghost"
                    className="mb-4 -ml-2 text-muted-foreground"
                    onClick={() => navigate("/ocorrencias/nova/seguranca_paciente")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>

                <Card>
                    <CardHeader className="bg-red-50 border-b border-red-200 rounded-t-lg">
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <span className="p-2 bg-red-100 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-red-700" />
                            </span>
                            {subtypeTitle}
                        </CardTitle>
                        <CardDescription className="text-red-600">
                            Registre a ocorrência de segurança do paciente com detalhes completos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* Common fields */}
                                <FormField
                                    control={form.control}
                                    name="pacienteNome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Paciente *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome completo do paciente" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dataHoraEvento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data e Hora do Evento *</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="localSetor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Local / Setor *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Corredor B, Sala de Exame 3..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="descricao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição do Ocorrido *</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Descreva o ocorrido e a ação imediata tomada"
                                                    className="min-h-[120px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Houve Dano toggle */}
                                <FormField
                                    control={form.control}
                                    name="houveDano"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Houve dano ao paciente?</FormLabel>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={field.value ? "default" : "outline"}
                                                        onClick={() => field.onChange(true)}
                                                        className="w-24"
                                                    >
                                                        Sim
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={!field.value ? "default" : "outline"}
                                                        onClick={() => field.onChange(false)}
                                                        className="w-24"
                                                    >
                                                        Não
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {houveDano && (
                                    <FormField
                                        control={form.control}
                                        name="descricaoDano"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descrição do Dano</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Descreva o dano causado ao paciente"
                                                        className="min-h-[80px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Conditional fields: queda */}
                                {subtipo === "queda" && (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                        <h3 className="font-semibold text-sm text-foreground">Informações da Queda</h3>
                                        <FormField
                                            control={form.control}
                                            name="localQueda"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Local da Queda</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione o local" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Corredor">Corredor</SelectItem>
                                                            <SelectItem value="Sala de exame">Sala de exame</SelectItem>
                                                            <SelectItem value="Banheiro">Banheiro</SelectItem>
                                                            <SelectItem value="Recepção">Recepção</SelectItem>
                                                            <SelectItem value="Outro">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="pacienteAcompanhado"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Paciente estava acompanhado?</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(true)} className="w-24">Sim</Button>
                                                            <Button type="button" variant={!field.value ? "default" : "outline"} onClick={() => field.onChange(false)} className="w-24">Não</Button>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="lesaoAparente"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Lesão aparente observada?</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(true)} className="w-24">Sim</Button>
                                                            <Button type="button" variant={!field.value ? "default" : "outline"} onClick={() => field.onChange(false)} className="w-24">Não</Button>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Conditional fields: erro_identificacao_paciente */}
                                {subtipo === "erro_identificacao_paciente" && (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                        <h3 className="font-semibold text-sm text-foreground">Informações do Erro de Identificação</h3>
                                        <FormField
                                            control={form.control}
                                            name="oQueFoiTrocado"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>O que foi trocado?</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Exame">Exame</SelectItem>
                                                            <SelectItem value="Resultado">Resultado</SelectItem>
                                                            <SelectItem value="Paciente atendido">Paciente atendido</SelectItem>
                                                            <SelectItem value="Outro">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="comoIdentificado"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Como foi identificado o erro?</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Descreva como o erro foi identificado" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Conditional fields: reacao_contraste_grave */}
                                {subtipo === "reacao_contraste_grave" && (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                        <h3 className="font-semibold text-sm text-foreground">Informações da Reação ao Contraste</h3>
                                        <FormField
                                            control={form.control}
                                            name="tipoContraste"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tipo de Contraste Utilizado</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: Gadolínio, Iodado..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="gravidadeReacao"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Gravidade da Reação</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Leve">Leve</SelectItem>
                                                            <SelectItem value="Moderada">Moderada</SelectItem>
                                                            <SelectItem value="Grave">Grave</SelectItem>
                                                            <SelectItem value="Anafilaxia">Anafilaxia</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="medicoAvaliou"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Médico avaliou o paciente?</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(true)} className="w-24">Sim</Button>
                                                            <Button type="button" variant={!field.value ? "default" : "outline"} onClick={() => field.onChange(false)} className="w-24">Não</Button>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Conditional fields: falha_equipamento_clinico */}
                                {subtipo === "falha_equipamento_clinico" && (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                        <h3 className="font-semibold text-sm text-foreground">Informações da Falha de Equipamento</h3>
                                        <FormField
                                            control={form.control}
                                            name="equipamento"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Equipamento Envolvido</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Nome/modelo do equipamento" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tipoFalha"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tipo de Falha</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Parou de funcionar">Parou de funcionar</SelectItem>
                                                            <SelectItem value="Resultado incorreto">Resultado incorreto</SelectItem>
                                                            <SelectItem value="Falha de segurança">Falha de segurança</SelectItem>
                                                            <SelectItem value="Outro">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="pacientePrejudicado"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Paciente foi prejudicado?</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(true)} className="w-24">Sim</Button>
                                                            <Button type="button" variant={!field.value ? "default" : "outline"} onClick={() => field.onChange(false)} className="w-24">Não</Button>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Conditional fields: falha_comunicacao */}
                                {subtipo === "falha_comunicacao" && (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                        <h3 className="font-semibold text-sm text-foreground">Informações da Falha de Comunicação</h3>
                                        <FormField
                                            control={form.control}
                                            name="equipesEnvolvidas"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Equipes Envolvidas</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: Enfermagem e Radiologia" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tipoFalhaCom"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tipo de Falha de Comunicação</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Informação omitida">Informação omitida</SelectItem>
                                                            <SelectItem value="Informação errada">Informação errada</SelectItem>
                                                            <SelectItem value="Não registrado">Não registrado</SelectItem>
                                                            <SelectItem value="Outro">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Conditional fields: evento_sentinela_livre */}
                                {subtipo === "evento_sentinela_livre" && (
                                    <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                        <h3 className="font-semibold text-sm text-red-700">Informações do Evento Sentinela</h3>
                                        <FormField
                                            control={form.control}
                                            name="requerNotificacaoAnvisa"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-red-700">Requer notificação à ANVISA?</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant={field.value ? "destructive" : "outline"} onClick={() => field.onChange(true)} className="w-24">Sim</Button>
                                                            <Button type="button" variant={!field.value ? "default" : "outline"} onClick={() => field.onChange(false)} className="w-24">Não</Button>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                <Button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-white">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Registrar Ocorrência de Segurança
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
