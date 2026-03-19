import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PatientOccurrenceInput {
    paciente_nome_completo?: string;
    paciente_telefone?: string;
    paciente_data_nascimento?: string;
    descricao_detalhada: string;
    is_anonymous: boolean;
    setor?: string;
    data_ocorrencia?: string;
    anexos?: any[];
    id?: string;
}

export function useCreatePatientOccurrence() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: PatientOccurrenceInput) => {
            // Try to get tenant ID, but don't fail if not found
            const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).single();
            const tenantId = tenantData?.id || null;

            // Generate a simple protocol without tenant dependency
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const protocolo = `PAC-${today}-${random}`;


            // Ensure we have an ID
            const id = data.id || crypto.randomUUID();

            // Insert into patient_occurrences table
            const insertData: any = {
                id: id,
                tenant_id: tenantId,
                protocol: protocolo,
                description: data.descricao_detalhada,
                is_anonymous: data.is_anonymous,
                status: 'pendente',
                sector: data.setor || null,
                occurrence_date: data.data_ocorrencia || null,
                anexos: data.anexos || []
            };

            if (!data.is_anonymous) {
                insertData.patient_name = data.paciente_nome_completo;
                insertData.patient_phone = data.paciente_telefone;
                insertData.patient_birth_date = data.paciente_data_nascimento;
            }

            const { error } = await supabase
                .from('patient_occurrences' as any)
                .insert(insertData);

            if (error) throw error;

            return insertData;
        },
        onSuccess: () => {
            toast({ title: "Ocorrência enviada com sucesso!", description: "Sua ocorrência foi registrada e será analisada." });
        },
        onError: (err) => {
            console.error(err);
            toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
        }
    })
}
