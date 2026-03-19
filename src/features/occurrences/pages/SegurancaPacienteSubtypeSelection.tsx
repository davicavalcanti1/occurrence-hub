import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    AlertTriangle,
    UserX,
    FlaskConical,
    Wrench,
    MessageSquareX,
    ShieldAlert,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SEGURANCA_PACIENTE_SUBTYPES = [
    {
        id: "queda",
        icon: AlertTriangle,
        label: "Queda de Paciente",
        description: "Queda nas dependências da clínica",
    },
    {
        id: "erro_identificacao_paciente",
        icon: UserX,
        label: "Erro de Identificação",
        description: "Paciente, exame ou resultado trocado",
    },
    {
        id: "reacao_contraste_grave",
        icon: FlaskConical,
        label: "Reação a Contraste",
        description: "Reação adversa grave durante procedimento",
    },
    {
        id: "falha_equipamento_clinico",
        icon: Wrench,
        label: "Falha de Equipamento",
        description: "Equipamento falhou durante atendimento",
    },
    {
        id: "falha_comunicacao",
        icon: MessageSquareX,
        label: "Falha de Comunicação",
        description: "Informação omitida ou incorreta entre equipes",
    },
    {
        id: "evento_sentinela_livre",
        icon: ShieldAlert,
        label: "Evento Sentinela",
        description: "Evento grave não coberto pelos tipos acima",
    },
];

export default function SegurancaPacienteSubtypeSelection() {
    const navigate = useNavigate();

    return (
        <MainLayout>
            <div className="mx-auto max-w-3xl animate-fade-in">
                <Button
                    variant="ghost"
                    className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/ocorrencias/nova")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>

                <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-3 mb-1">
                        <ShieldAlert className="h-6 w-6 text-red-700" />
                        <h1 className="text-2xl font-bold text-red-700">
                            Segurança do Paciente
                        </h1>
                    </div>
                    <p className="mt-1 text-red-600 text-sm">
                        Selecione o tipo de ocorrência de segurança do paciente que deseja registrar.
                    </p>
                </div>

                <div className="grid gap-4">
                    {SEGURANCA_PACIENTE_SUBTYPES.map((subtype) => {
                        const Icon = subtype.icon;
                        return (
                            <Card
                                key={subtype.id}
                                className="cursor-pointer hover:border-red-400 border-red-200 transition-all duration-200 group"
                                onClick={() => navigate(`/ocorrencias/nova/seguranca_paciente/${subtype.id}`)}
                            >
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors border border-red-200">
                                        <Icon className="h-6 w-6 text-red-700" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-foreground text-lg">
                                            {subtype.label}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {subtype.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-600 transition-colors" />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </MainLayout>
    );
}
