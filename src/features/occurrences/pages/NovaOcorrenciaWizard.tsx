import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Briefcase,
  FileSearch,
  Droplets,
  Receipt,
  CalendarX,
  Check,
  Stethoscope,
  FileText,
  User,
  ShieldAlert
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  OccurrenceType,
  OccurrenceSubtype,
  subtypeLabels,
  subtypeDescriptions,
  subtypesByType,
} from "@/features/occurrences/types/occurrence";
import { useAuth } from "@/contexts/AuthContext";

// Type configurations
const typeConfig: Record<OccurrenceType, {
  title: string;
  description: string;
  icon: typeof Heart;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverColor: string;
  disabled?: boolean;
  hidden?: boolean;
}> = {
  seguranca_paciente: {
    title: "Segurança do Paciente",
    description: "Quedas, identificação, contraste, equipamentos e comunicação",
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    hoverColor: "hover:border-red-400",
  },
  revisao_exame: {
    title: "Revisão de Exame",
    description: "Necessidade de revisão de laudo ou imagem",
    icon: FileSearch,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    hoverColor: "hover:border-primary",
  },
  enfermagem: {
    title: "Ocorrência da Enfermagem",
    description: "Eventos relacionados à equipe de enfermagem",
    icon: Stethoscope,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    hoverColor: "hover:border-primary",
  },
  administrativa: {
    title: "Ocorrência Administrativa",
    description: "Problemas operacionais e de gestão",
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    hoverColor: "hover:border-primary",
    hidden: false,
  },
  paciente: {
    title: "Ocorrência de Paciente",
    description: "Registro público de paciente",
    icon: User,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    hoverColor: "hover:border-gray-400",
    hidden: true,
  },
  livre: {
    title: "Ocorrência Livre",
    description: "Registro manual flexível",
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    hoverColor: "hover:border-primary",
    hidden: false,
  }
};

// Only show types in this order (hidden types are excluded in getVisibleTypes)
const typeOrder: OccurrenceType[] = ["seguranca_paciente", "revisao_exame", "enfermagem", "administrativa", "livre"];

// Subtype icons
const subtypeIcons: Record<OccurrenceSubtype, typeof Heart> = {
  revisao_exame: FileSearch,
  faturamento: Receipt,
  agendamento: CalendarX,
  extravasamento_enfermagem: Droplets,
  reacoes_adversas: Heart,
  livre: FileText,
  queda: ShieldAlert,
  erro_identificacao_paciente: ShieldAlert,
  reacao_contraste_grave: ShieldAlert,
  falha_equipamento_clinico: ShieldAlert,
  falha_comunicacao: ShieldAlert,
  evento_sentinela_livre: ShieldAlert,
};

export default function NovaOcorrenciaWizard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<OccurrenceType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<OccurrenceSubtype | null>(null);

  // Filter types based on role
  const getVisibleTypes = (): OccurrenceType[] => {
    if (!role) return [];

    // Admin sees all types in typeOrder
    if (role === 'admin') return typeOrder;

    // RH sees Livre and Administrative
    if (role === 'rh') {
      return typeOrder.filter(t => ['livre', 'administrativa'].includes(t));
    }

    // Nursing sees Livre, Nursing, and Segurança do Paciente
    if (role === 'enfermagem') {
      return typeOrder.filter(t => ['livre', 'enfermagem', 'seguranca_paciente'].includes(t));
    }

    // Standard User sees Revisão de Exame and Segurança do Paciente
    if (role === 'user') {
      return typeOrder.filter(t => ['revisao_exame', 'seguranca_paciente'].includes(t));
    }

    return [];
  };

  const visibleTypes = getVisibleTypes();

  const handleTypeSelect = (type: OccurrenceType) => {
    if (type === "seguranca_paciente") {
      navigate("/ocorrencias/nova/seguranca_paciente");
      return;
    }
    if (type === "revisao_exame") {
      navigate(`/ocorrencias/nova/revisao_exame/revisao_exame`);
      return;
    }
    if (type === "administrativa") {
      navigate(`/ocorrencias/nova/administrativa`);
      return;
    }
    if (type === "livre") {
      navigate(`/ocorrencias/nova-livre`);
      return;
    }
    setSelectedType(type);
    setSelectedSubtype(null);
    setStep(2);
  };

  const handleSubtypeSelect = (subtype: OccurrenceSubtype) => {
    setSelectedSubtype(subtype);
  };

  const handleContinue = () => {
    if (selectedType && selectedSubtype) {
      navigate(`/ocorrencias/nova/${selectedType}/${selectedSubtype}`);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedSubtype(null);
    } else {
      navigate("/");
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl animate-fade-in">
        {/* Back Button - Only show on step 2 */}
        {step > 1 && (
          <Button
            variant="ghost"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para tipos
          </Button>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
            step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div className={cn(
            "flex-1 h-1 rounded",
            step >= 2 ? "bg-primary" : "bg-muted"
          )} />
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            2
          </div>
          <div className="h-1 w-8 bg-muted rounded" />
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium bg-muted text-muted-foreground">
            3
          </div>
        </div>

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Selecione o tipo de ocorrência
              </h1>
              <p className="mt-2 text-muted-foreground">
                Escolha a categoria que melhor descreve o evento
              </p>
            </div>

            <div className="space-y-4">
              {visibleTypes.map((type) => {
                const config = typeConfig[type];
                const Icon = config.icon;
                const isDisabled = config.disabled;
                return (
                  <Card
                    key={type}
                    className={cn(
                      "transition-all duration-200",
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : cn("cursor-pointer", config.hoverColor),
                      config.borderColor,
                      selectedType === type && "ring-2 ring-primary"
                    )}
                    onClick={() => !isDisabled && handleTypeSelect(type)}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        config.bgColor
                      )}>
                        <Icon className={cn("h-6 w-6", config.color)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {config.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                        {isDisabled && (
                          <span className="text-xs text-muted-foreground italic">
                            Em breve
                          </span>
                        )}
                      </div>
                      {!isDisabled && <ArrowRight className="h-5 w-5 text-muted-foreground" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Select Subtype */}
        {step === 2 && selectedType && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  typeConfig[selectedType].bgColor
                )}>
                  {(() => {
                    const Icon = typeConfig[selectedType].icon;
                    return <Icon className={cn("h-5 w-5", typeConfig[selectedType].color)} />;
                  })()}
                </div>
                <span className={cn(
                  "text-sm font-medium px-3 py-1 rounded-full",
                  typeConfig[selectedType].bgColor,
                  typeConfig[selectedType].color
                )}>
                  {typeConfig[selectedType].title}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Selecione o subtipo
              </h1>
              <p className="mt-2 text-muted-foreground">
                Cada subtipo possui um questionário específico
              </p>
            </div>

            <div className="space-y-3">
              {subtypesByType[selectedType].map((subtype) => {
                const Icon = subtypeIcons[subtype];
                const isSelected = selectedSubtype === subtype;
                return (
                  <Card
                    key={subtype}
                    className={cn(
                      "cursor-pointer transition-all duration-200 border-2",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleSubtypeSelect(subtype)}
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {subtypeLabels[subtype]}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {subtypeDescriptions[subtype]}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-4">
              <Button
                size="lg"
                disabled={!selectedSubtype}
                onClick={handleContinue}
                className="min-w-[200px]"
              >
                Continuar para o formulário
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
