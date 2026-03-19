// Occurrence Types and Subtypes
export type OccurrenceType = "administrativa" | "revisao_exame" | "enfermagem" | "paciente" | "livre" | "seguranca_paciente";

type AdministrativaSubtype =
  | "faturamento"
  | "agendamento";

type EnfermagemSubtype =
  | "extravasamento_enfermagem"
  | "reacoes_adversas";

type SegurancaPacienteSubtype =
  | "queda"
  | "erro_identificacao_paciente"
  | "reacao_contraste_grave"
  | "falha_equipamento_clinico"
  | "falha_comunicacao"
  | "evento_sentinela_livre";

export type OccurrenceSubtype =
  | AdministrativaSubtype
  | EnfermagemSubtype
  | SegurancaPacienteSubtype
  | "revisao_exame"
  | "livre";

// Triage Classification (severity order: ascending)
export type TriageClassification =
  | "circunstancia_risco"
  | "near_miss"
  | "incidente_sem_dano"
  | "evento_adverso"
  | "evento_sentinela";

// Occurrence Status - Complete Flow
export type OccurrenceStatus =
  | "registrada"
  | "em_triagem"
  | "em_analise"
  | "acao_em_andamento"
  | "concluida"
  | "improcedente";

// Outcome Types (Desfechos)
export type OutcomeType =
  | "imediato_correcao"
  | "orientacao"
  | "treinamento"
  | "alteracao_processo"
  | "manutencao_corretiva"
  | "notificacao_externa"
  | "improcedente";

// External Notification Data
export interface ExternalNotification {
  orgaoNotificado: string;
  data: string;
  responsavel: string;
  anexoComprovante?: string;
  documentoGerado?: string;
}

// CAPA - Corrective and Preventive Action
export interface CAPA {
  id: string;
  causaRaiz: string;
  acao: string;
  responsavel: string;
  prazo: string;
  evidencia?: string;
  verificacaoEficacia?: string;
  verificadoPor?: string;
  verificadoEm?: string;
  status: "pendente" | "em_andamento" | "concluida" | "verificada";
}

// Outcome Record
export interface OccurrenceOutcome {
  tipos: OutcomeType[];
  justificativa: string;
  desfechoPrincipal?: OutcomeType;
  notificacaoExterna?: ExternalNotification;
  capas?: CAPA[];
  definidoPor: string;
  definidoEm: string;
}

// Patient Data Block
interface PatientData {
  nomeCompleto: string;
  cpf?: string;
  telefone?: string;
  idPaciente?: string;
  dataNascimento?: string;
  tipoExame?: string;
  unidadeLocal?: string;
  dataHoraEvento?: string;
  sexo?: "Masculino" | "Feminino";
}

// Registrador Data Block
interface RegistradorData {
  setor: string;
  cargo: string;
  medicoAvaliou?: string;
  auxiliarEnfermagem?: string;
  tecnicoRadiologia?: string;
  coordenadorResponsavel?: string;
}

// Pessoa Comunicada
interface PessoaComunicada {
  nome: string;
  cargo: string;
  dataHora: string;
}

// ============ DADOS ESPECÍFICOS POR SUBTIPO ============

// Extravasamento Enfermagem
interface ExtravasamentoEnfermagemData {
  volumeInjetadoMl?: string;
  fezRx?: boolean;
  compressa?: boolean;
  calibreAcesso?: string;
  conduta?: string;
  medicoAvaliou?: string;
  auxiliarEnfermagem?: string;
  tecnicoRadiologia?: string;
  coordenadorResponsavel?: string;
  anexos?: string[];
}

// Reacoes Adversas
interface ReacoesAdversasData {
  contrasteUtilizado?: string;
  validadeLote?: string;
  quantidadeInjetada?: string;
  conduta?: string;
  medicoAvaliou?: string;
  anexos?: string[];
}

// Revisão de Exame
export interface RevisaoExameData {
  exameModalidade: string;
  exameRegiao: string;
  exameData: string;
  motivoRevisao:
  | "pedido_medico"
  | "auditoria"
  | "duvida"
  | "segunda_leitura"
  | "reclamacao"
  | "outro";
  motivoOutro?: string;
  laudoEntregue: boolean;
  tipoDiscrepancia: string[];
  discrepanciaOutro?: string;
  potencialImpacto?: "nenhum" | "baixo" | "medio" | "alto";
  impactoDescricao?: string;
  acaoTomada: string[];
  acaoOutra?: string;
  pessoasComunicadas: {
    tipo: "radiologista" | "coordenacao" | "solicitante";
    nome: string;
  }[];
}

// Union de todos os dados específicos
export type DadosEspecificos =
  | RevisaoExameData
  | ExtravasamentoEnfermagemData
  | ReacoesAdversasData
  | Record<string, unknown>;

// ============ FORM DATA ============

// Base Form Data - Campos comuns a todos
interface BaseOccurrenceFormData {
  // Identificação do registrador
  registrador: RegistradorData;
  // Data e hora do evento
  dataHoraEvento: string;
  // Local
  unidadeLocal: string;
  // Dados do paciente
  paciente: PatientData;
  // Descrição objetiva
  descricaoDetalhada: string;
  // Ações imediatas
  acaoImediata: string;
  acoesImediatasChecklist: string[];
  // Dano/Lesão
  houveDano: boolean;
  descricaoDano?: string;
  // Comunicação
  pessoasComunicadas: PessoaComunicada[];
  // Anexos e observações
  anexos?: any[]; // Allow rich attachment objects
  observacoes?: string;
  contemDadoSensivel: boolean;
  pessoasEnvolvidas?: string;
  impactoPercebido?: string;
  medicoDestino?: string;
}

// Occurrence Form Data
export interface OccurrenceFormData extends BaseOccurrenceFormData {
  tipo: OccurrenceType;
  subtipo: OccurrenceSubtype;
  // Dados específicos do subtipo
  dadosEspecificos?: DadosEspecificos;
}

// Full Occurrence Record
export interface Occurrence extends OccurrenceFormData {
  id: string;
  protocolo: string;
  tenantId: string;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  status: OccurrenceStatus;
  triagem?: TriageClassification;
  triagemPor?: string;
  triagemEm?: string;
  desfecho?: OccurrenceOutcome;
  historicoStatus: StatusChange[];
  // Campos legados
  impactoPercebido?: string;
  pessoasEnvolvidas?: string;
  // Campos para acesso público
  publicToken?: string;
}

// Status Change History
interface StatusChange {
  de: OccurrenceStatus;
  para: OccurrenceStatus;
  por: string;
  em: string;
  motivo?: string;
}

// Subtype Labels
export const subtypeLabels: Record<OccurrenceSubtype, string> = {
  revisao_exame: "Revisão de exame",
  faturamento: "Faturamento",
  agendamento: "Agendamento",
  extravasamento_enfermagem: "Extravasamento de contraste",
  reacoes_adversas: "Reações adversas",
  livre: "Ocorrência Livre",
  queda: "Queda de Paciente",
  erro_identificacao_paciente: "Erro de Identificação",
  reacao_contraste_grave: "Reação a Contraste",
  falha_equipamento_clinico: "Falha de Equipamento",
  falha_comunicacao: "Falha de Comunicação",
  evento_sentinela_livre: "Evento Sentinela",
};

// Subtype Descriptions
export const subtypeDescriptions: Record<OccurrenceSubtype, string> = {
  revisao_exame: "Necessidade de revisão de laudo ou imagem após entrega",
  faturamento: "Problemas relacionados a cobranças, convênios ou pagamentos",
  agendamento: "Erros ou problemas no agendamento de exames",
  extravasamento_enfermagem: "Extravasamento de contraste ocorrido durante procedimento (Enfermagem)",
  reacoes_adversas: "Reação adversa ao meio de contraste ou medicação",
  livre: "Ocorrência registrada livremente",
  queda: "Queda nas dependências da clínica",
  erro_identificacao_paciente: "Paciente, exame ou resultado trocado",
  reacao_contraste_grave: "Reação adversa grave durante procedimento",
  falha_equipamento_clinico: "Equipamento falhou durante atendimento",
  falha_comunicacao: "Informação omitida ou incorreta entre equipes",
  evento_sentinela_livre: "Evento grave não coberto pelos tipos acima",
};

// Subtypes by Type (for wizard navigation)
export const subtypesByType: Record<OccurrenceType, OccurrenceSubtype[]> = {
  administrativa: [
    "faturamento",
    "agendamento",
  ],
  revisao_exame: ["revisao_exame"],
  enfermagem: ["extravasamento_enfermagem", "reacoes_adversas"],
  paciente: [],
  livre: [],
  seguranca_paciente: [
    "queda",
    "erro_identificacao_paciente",
    "reacao_contraste_grave",
    "falha_equipamento_clinico",
    "falha_comunicacao",
    "evento_sentinela_livre",
  ],
};

// Triage Labels and Config
export const triageConfig: Record<
  TriageClassification,
  { label: string; description: string; color: string; priority: number }
> = {
  circunstancia_risco: {
    label: "Circunstância de risco",
    description: "Situação com potencial de causar dano",
    color: "bg-sky-100 text-sky-800 border-sky-200",
    priority: 1,
  },
  near_miss: {
    label: "Near Miss",
    description: "Quase falha - interceptada antes de atingir o paciente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    priority: 2,
  },
  incidente_sem_dano: {
    label: "Incidente sem dano",
    description: "Evento ocorreu mas não causou dano ao paciente",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    priority: 3,
  },
  evento_adverso: {
    label: "Evento adverso",
    description: "Evento causou dano ao paciente",
    color: "bg-red-100 text-red-800 border-red-200",
    priority: 4,
  },
  evento_sentinela: {
    label: "Evento sentinela",
    description: "Evento grave, inesperado, com dano permanente ou óbito",
    color: "bg-red-900 text-white border-red-800",
    priority: 5,
  },
};

// Status Labels and Config
export const statusConfig: Record<
  OccurrenceStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  registrada: {
    label: "Registrada",
    color: "text-slate-600",
    bgColor: "bg-slate-100 border-slate-200",
    description: "Aguardando triagem inicial",
  },
  em_triagem: {
    label: "Em Triagem",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Classificação de gravidade em andamento",
  },
  em_analise: {
    label: "Em Análise",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Investigação e análise detalhada",
  },
  acao_em_andamento: {
    label: "Ação em Andamento",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    description: "Ações corretivas sendo executadas",
  },
  concluida: {
    label: "Concluída",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-100",
    description: "Todas as ações finalizadas",
  },
  improcedente: {
    label: "Improcedente",
    color: "text-slate-400",
    bgColor: "bg-slate-50",
    description: "Ocorrência encerrada como improcedente",
  },
};

// Status Flow - Valid Transitions
export const statusTransitions: Record<OccurrenceStatus, OccurrenceStatus[]> = {
  registrada: ["em_triagem", "improcedente"],
  em_triagem: ["em_analise", "improcedente"],
  em_analise: ["acao_em_andamento", "concluida", "improcedente"],
  acao_em_andamento: ["concluida", "improcedente"],
  concluida: [],
  improcedente: [],
};

// Outcome Labels and Config
export const outcomeConfig: Record<
  OutcomeType,
  { label: string; description: string; icon: string; requiresCapa: boolean }
> = {
  imediato_correcao: {
    label: "Imediato/Correção Pontual",
    description: "Ação imediata para correção do problema",
    icon: "zap",
    requiresCapa: false,
  },
  orientacao: {
    label: "Orientação",
    description: "Orientação aos envolvidos sobre procedimentos corretos",
    icon: "message-circle",
    requiresCapa: false,
  },
  treinamento: {
    label: "Treinamento",
    description: "Necessidade de treinamento para equipe",
    icon: "graduation-cap",
    requiresCapa: true,
  },
  alteracao_processo: {
    label: "Alteração de Processo/Protocolo",
    description: "Mudança em processos ou protocolos existentes",
    icon: "file-cog",
    requiresCapa: true,
  },
  manutencao_corretiva: {
    label: "Manutenção Corretiva",
    description: "Necessidade de manutenção em equipamentos",
    icon: "wrench",
    requiresCapa: true,
  },
  notificacao_externa: {
    label: "Notificação Externa",
    description: "Necessidade de notificar órgãos externos",
    icon: "send",
    requiresCapa: false,
  },
  improcedente: {
    label: "Improcedente",
    description: "Ocorrência não procede após análise",
    icon: "x-circle",
    requiresCapa: false,
  },
};

// Check if outcomes require CAPA
export const requiresCapa = (outcomes: OutcomeType[]): boolean => {
  return outcomes.some((o) => outcomeConfig[o].requiresCapa);
};

// Check if external notification is required
export const requiresExternalNotification = (outcomes: OutcomeType[]): boolean => {
  return outcomes.includes("notificacao_externa");
};
