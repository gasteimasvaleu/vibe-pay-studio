## Ajustar comportamento do botão "+" em /chat-agendamento

**Arquivo:** `src/routes/_authenticated/chat-agendamento.tsx`

### Mudança de comportamento
Hoje, clicar no "+" (tanto no header quanto no estado vazio da coluna da direita) abre apenas o composer (Sheet). O usuário quer que esse clique:

1. Abra o composer (página do screenshot 2) — como já faz hoje.
2. **Simultaneamente** abra por cima o dialog "DATA DE AGENDAMENTO" (screenshot 1) para escolher horário.

### Implementação
- Criar handler `openComposerWithSchedule` que faz `setComposerOpen(true)` e `setDateDialogOpen(true)` no mesmo clique.
- Ligar esse handler aos dois botões "+" (header + empty state, linha 110 e o botão da coluna direita).
- O botão de calendário dentro da toolbar do composer continua abrindo só o dialog (comportamento atual).
- Ao Cancelar/Confirmar no dialog, o composer permanece aberto atrás (já é o comportamento do Dialog do shadcn — só fechar o dialog).

### Ajustes visuais no Dialog para casar com o screenshot 1
- Título "DATA DE AGENDAMENTO" em maiúsculas, `text-sm font-bold tracking-wide`.
- Abas superiores: data formatada (ex.: "jul. 10, sex.") à esquerda e horário "HH:mm" à direita, aba ativa com sublinhado e cor `text-primary` (laranja do tema).
- Time picker central: números grandes (`text-5xl font-light`) com `ChevronUp`/`ChevronDown` acima/abaixo em `text-muted-foreground`, separador ":" centralizado.
- Botões "Confirmar" (outline com borda e texto `primary`) e "Cancelar" (outline neutro) lado a lado.
- Usar apenas tokens semânticos (`bg-background`, `text-foreground`, `text-primary`, `border-border`) — nada hardcoded.

### Fora de escopo
Persistência, envio, seleção real de contatos.
