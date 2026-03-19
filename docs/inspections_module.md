# Módulo de Inspeções - Documentação

Este módulo gerencia inspeções de Dispensers de Álcool, Banheiros e Manutenções de Ar-Condicionado.

## URLs Públicas (para QR Codes)

### Dispensers
*   **Abrir Chamado:** `/formularios/dispenser/abrir?localizacao=NOME_DO_LOCAL`
*   **Finalizar Chamado:** `/formularios/dispenser/finalizar?protocolo=CODIGO`

### Banheiros
*   **Abrir Chamado:** `/formularios/banheiro/abrir?localizacao=NOME_DO_LOCAL`
*   **Finalizar Chamado:** `/formularios/banheiro/finalizar?protocolo=CODIGO`

### Ar Condicionado
*   **Imago:** `/formularios/ar-condicionado/imago?sala=SALA&modelo=MODELO&numero_serie=SERIE`
*   **Terceirizado:** `/formularios/ar-condicionado/terceirizado?sala=SALA`
*   **Limpeza de Dreno:** `/formularios/ar-condicionado/dreno?sala=SALA`

## Painel Administrativo

Acesse via **Inspeções** no menu principal (disponível para Admin, RH e Enfermagem).

### Funcionalidades
1.  **Dashboard Unificado:** Visão geral de todos os tipos de inspeção.
2.  **Filtros:** Por tipo, status e período.
3.  **Detalhes:** Clique em qualquer linha para ver o histórico completo, incluindo quem finalizou e observações.

## Arquitetura Técnica

*   **Banco de Dados:** Tabelas separadas (`inspections_dispenser`, `inspections_banheiro`, `inspections_ac`) unidas pela View `inspections_overview`.
*   **Segurança:** RLS configurado para permitir inserção pública (QR Code) e visualização apenas autenticada (exceto via RPC de fechamento).
*   **Integrações:**
    *   **N8N Webhooks:** Disparados na abertura e fechamento de chamados (Dispenser/Banheiro).
    *   **Supabase RPC:** Funções seguras (`close_dispenser_ticket`, `close_banheiro_ticket`) para garantir integridade no fechamento público.
