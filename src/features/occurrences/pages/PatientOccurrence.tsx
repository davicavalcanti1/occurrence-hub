import { useState } from "react";
import { useCreatePatientOccurrence } from "@/features/occurrences/hooks/usePatientOccurrence";
import { uploadFilesToStorage } from "@/features/occurrences/hooks/useAttachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AttachmentUpload, PendingFile } from "@/features/occurrences/components/attachments/AttachmentUpload";

export default function PublicPatientOccurrence() {
    const navigate = useNavigate();
    const { mutateAsync: submit, isPending } = useCreatePatientOccurrence();

    const [isAnonymous, setIsAnonymous] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nome: "",
        telefone: "",
        dataNascimento: "",
        setor: "",
        dataOcorrencia: "",
        descricao: ""
    });


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const occurrenceId = crypto.randomUUID();
            let uploadedAttachments: any[] = [];

            // Upload attachments first if any
            if (pendingFiles.length > 0) {
                try {
                    uploadedAttachments = await uploadFilesToStorage(
                        pendingFiles.map(pf => pf.file),
                        occurrenceId,
                        'anonymous'
                    );
                } catch (uploadError) {
                    console.error("Error uploading attachments:", uploadError);
                    // Continue without attachments if upload fails? Or show error?
                    // For now, let's log and continue, as the main form submission is more important.
                }
            }

            // Create the occurrence
            const occurrence = await submit({
                id: occurrenceId,
                descricao_detalhada: formData.descricao,
                is_anonymous: isAnonymous,
                paciente_nome_completo: isAnonymous ? undefined : formData.nome,
                paciente_telefone: isAnonymous ? undefined : formData.telefone,
                paciente_data_nascimento: isAnonymous ? undefined : formData.dataNascimento,
                setor: formData.setor,
                data_ocorrencia: formData.dataOcorrencia,
                anexos: uploadedAttachments
            });

            // Send webhook to n8n
            try {
                await fetch("https://n8n.imagoradiologia.cloud/webhook/paciente", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        occurrence_id: occurrence.id,
                        protocol: occurrence.protocol,
                        patient_name: isAnonymous ? "Anônimo" : formData.nome,
                        patient_phone: formData.telefone,
                        sector: formData.setor,
                        description: formData.descricao,
                        is_anonymous: isAnonymous,
                        attachments_count: uploadedAttachments.length
                    })
                });
            } catch (webhookErr) {
                console.error("Webhook failed:", webhookErr);
            }


            // Clear form on success
            setFormData({ nome: "", telefone: "", dataNascimento: "", setor: "", dataOcorrencia: "", descricao: "" });
            setPendingFiles([]);
        } catch (error) {
            console.error("Error submitting occurrence:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="space-y-1">

                    <CardTitle className="text-2xl font-bold text-center text-primary">Nova Ocorrência</CardTitle>
                    <CardDescription className="text-center">
                        Relate aqui sua ocorrência. Você pode optar por não se identificar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="flex items-center space-x-2 border p-3 rounded-md bg-white">
                            <Checkbox
                                id="anonymous"
                                checked={isAnonymous}
                                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                            />
                            <Label htmlFor="anonymous" className="cursor-pointer">
                                <b>Prefiro não me identificar</b> (Ocorrência Anônima)
                            </Label>
                        </div>

                        {!isAnonymous && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome Completo</Label>
                                    <Input
                                        id="nome"
                                        required={!isAnonymous}
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telefone">Telefone</Label>
                                        <Input
                                            id="telefone"
                                            type="tel"
                                            required={!isAnonymous}
                                            value={formData.telefone}
                                            onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dob">Data de Nascimento</Label>
                                        <Input
                                            id="dob"
                                            type="date"
                                            required={!isAnonymous}
                                            value={formData.dataNascimento}
                                            onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="setor">Setor da Reclamação</Label>
                                <Input
                                    id="setor"
                                    required
                                    value={formData.setor}
                                    onChange={e => setFormData({ ...formData, setor: e.target.value })}
                                    placeholder="Ex: Recepção, Exames, etc."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataOcorrencia">Data da Ocorrência</Label>
                                <Input
                                    id="dataOcorrencia"
                                    type="date"
                                    required
                                    value={formData.dataOcorrencia}
                                    onChange={e => setFormData({ ...formData, dataOcorrencia: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao">Descrição da Ocorrência</Label>
                            <Textarea
                                id="descricao"
                                required
                                className="min-h-[150px]"
                                value={formData.descricao}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Descreva detalhadamente o que aconteceu..."
                            />
                        </div>

                        {/* Attachments Section */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <Label>Anexos (Opcional)</Label>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Adicione fotos ou documentos que ajudem a ilustrar a ocorrência.
                            </p>
                            <AttachmentUpload
                                files={pendingFiles}
                                onChange={setPendingFiles}
                                maxFiles={5}
                                disabled={isPending || isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full text-lg py-6"
                            disabled={isPending || isSubmitting}
                        >
                            {isSubmitting
                                ? "Enviando..."
                                : isPending
                                    ? "Processando..."
                                    : "Enviar Ocorrência"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// Syncing changes
