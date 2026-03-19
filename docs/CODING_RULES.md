# Regras de Codificação e Manutenção

## Comentários Especiais

### `//nunca mudar sem me consultar especificamente`
**CRÍTICO:** Sempre que encontrar este comentário em qualquer linha de código, você **NÃO DEVE** alterar essa linha sob nenhuma circunstância sem antes pedir permissão explícita ao usuário.
Mesmo que a alteração pareça necessária para corrigir um bug, melhorar a performance ou seguir padrões de projeto, a regra de imutabilidade prevalece.

**Ação Obrigatória:**
1. Identifique a linha com o comentário.
2. Se uma mudança for necessária nessa linha, PARE.
3. Pergunte ao usuário: "A linha X possui a trava de segurança 'nunca mudar sem me consultar especificamente'. Posso prosseguir com a alteração X?"
4. Somente prossiga após a confirmação positiva do usuário.
