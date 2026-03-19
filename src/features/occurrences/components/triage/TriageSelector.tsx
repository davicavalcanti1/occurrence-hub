import { useState } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TriageClassification, triageConfig } from "@/features/occurrences/types/occurrence";

interface TriageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTriage?: TriageClassification;
  onTriageSelect: (triage: TriageClassification) => void;
}

const triageOrder: TriageClassification[] = [
  "circunstancia_risco",
  "near_miss",
  "incidente_sem_dano",
  "evento_adverso",
  "evento_sentinela",
];

// Left border colors per severity level
const triageBorderColors: Record<TriageClassification, string> = {
  circunstancia_risco: "border-l-sky-400",
  near_miss: "border-l-yellow-400",
  incidente_sem_dano: "border-l-orange-400",
  evento_adverso: "border-l-red-500",
  evento_sentinela: "border-l-red-900",
};

// Priority circle colors per severity level
const triagePriorityColors: Record<TriageClassification, string> = {
  circunstancia_risco: "bg-sky-100 text-sky-800",
  near_miss: "bg-yellow-100 text-yellow-800",
  incidente_sem_dano: "bg-orange-100 text-orange-800",
  evento_adverso: "bg-red-100 text-red-800",
  evento_sentinela: "bg-red-900 text-white",
};

export function TriageSelector({
  open,
  onOpenChange,
  currentTriage,
  onTriageSelect,
}: TriageSelectorProps) {
  const [selected, setSelected] = useState<TriageClassification | undefined>(
    currentTriage
  );

  const handleConfirm = () => {
    if (selected) {
      onTriageSelect(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Classificação de Triagem
          </DialogTitle>
          <DialogDescription>
            Selecione a classificação adequada baseada na gravidade do evento.
            Esta ação define prioridade, SLA e destaque no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {triageOrder.map((triage) => {
            const config = triageConfig[triage];
            const isSelected = selected === triage;
            const isSentinela = triage === "evento_sentinela";

            return (
              <div key={triage}>
                <button
                  onClick={() => setSelected(triage)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-lg border-2 border-l-4 transition-all text-left",
                    triageBorderColors[triage],
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-secondary/50",
                    isSentinela && !isSelected && "ring-1 ring-red-200",
                    isSentinela && isSelected && "ring-2 ring-red-400 animate-pulse"
                  )}
                >
                  {/* Priority number circle */}
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full shrink-0 mt-0.5 text-xs font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : triagePriorityColors[triage]
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{config.priority}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isSentinela && (
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium text-foreground">
                        {config.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          config.color
                        )}
                      >
                        Nível {config.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.description}
                    </p>
                  </div>
                </button>

                {/* Inline warning when Evento Sentinela is selected */}
                {isSentinela && isSelected && (
                  <div className="mt-1 ml-0 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      ⚠️ Esta classificação requer notificação imediata à gestão. Certifique-se de que está correta.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-info/10 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            A triagem é única por ocorrência e só pode ser realizada pelo
            administrador. Esta classificação afeta o SLA e a priorização no
            sistema.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Confirmar Triagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
