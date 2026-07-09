## Nova página: Agendamento de mensagens do chat

Página dedicada acessada pelo ícone de calendário (Agenda) na sidebar do chat — abre como página inteira, fora do layout do chat, com o mesmo padrão da tela de configurações.

### Rota
- Arquivo: `src/routes/_authenticated/chat-agendamento.tsx` → URL `/chat-agendamento`.
- Atualizar o `IconBtn` "Agenda" em `src/routes/_authenticated/chat.tsx` para virar um `<Link to="/chat-agendamento">`.

### Estrutura da página (estado inicial — screenshot 1)
Layout de duas colunas dentro de `AppTopBar` + container centralizado:

- **Header**
  - Botão voltar (`ArrowLeft`) à esquerda → `/chat`.
  - Título centralizado "Mensagens Agendadas".
  - Botão `+` à direita → abre o composer (ver abaixo).
  - Borda inferior `border-border`.

- **Coluna esquerda — calendário mensal**
  - Cabeçalho com setas `ChevronLeft`/`ChevronRight` e nome do mês/ano (ex.: "julho 2026") + ícone de calendário à direita (troca rápida de mês, sem função nesta etapa).
  - Grid 7 colunas com labels `Dom Seg Ter Qua Qui Sex Sab`.
  - Células do mês (incluindo dias do mês anterior/próximo em cinza claro, `text-muted-foreground`).
  - Dia atual destacado com `bg-accent/50`.
  - Dia selecionado destacado com `bg-card` + `border border-border`, texto `font-bold`.
  - Fim de semana/dias de outro mês esmaecidos.
  - Clique em uma célula seleciona o dia e atualiza a coluna direita.
  - Implementação: gerar semanas via `date-fns` (`startOfMonth`, `endOfMonth`, `startOfWeek`, `addDays`, `format` com locale `ptBR`). `date-fns` já está no projeto (dependência do calendar shadcn).

- **Coluna direita — dia selecionado**
  - Header do painel: `ChevronLeft` · data selecionada formatada ("10 July 2026") · `ChevronRight` (avançar/voltar 1 dia).
  - Corpo vazio (estado inicial):
    - Botão grande `+` no topo (ghost), abre o composer.
    - Ilustração/ícone `CalendarDays` grande em `text-muted-foreground/40` no centro.
    - Texto "Não há mensagens agendadas para esse dia" abaixo.

### Composer de mensagem em massa (aberto pelo `+` — screenshot 3)
Renderizado como `Sheet` (padrão do app, `side="bottom"` no mobile / centralizado no desktop via `sm:max-w-*`), seguindo o mesmo padrão já usado no `FiltersSheet`:

- **Header do sheet**: botão voltar + título "Mensagem em massa" à esquerda; à direita, título secundário "Selecionar usuários para enviar mensagem em massa".
- **Coluna esquerda (dentro do sheet)**
  - "Selecione seus contatos" (h3).
  - `Input` de busca com ícone `Search` — placeholder "Pesquisar".
  - Chips de filtro (usando o mesmo `FilterChip` que já existe no chat.tsx, extraído para reuso): Todos, Seguidores, Seguindo, Expirados, Top 100 Compradores, Expiram em 7 Dias, Interações, Top 1000 Compradores. Estado local.
  - Botão "Aplicar filtro" ao final, largura total, estilo do app (`rounded-full bg-gradient-primary` desabilitado até selecionar algo — nesta etapa fica sempre desabilitado, apenas visual).
- **Coluna direita (dentro do sheet)**
  - Estado vazio: título "Escreva sua mensagem" + subtítulo "Digite e envie a mensagem em massa para os usuários selecionados." centralizados.
  - Barra "Programado para … amanhã, 00:00" com botão `X` para limpar o agendamento (aparece só quando há data agendada; usa `bg-accent/40 border border-border rounded-xl`).
  - `Textarea` "Digite uma mensagem".
  - Toolbar de ícones (com `Tooltip`, reaproveitando o padrão `ComposerIcon` da tela de configurações, extraído para `src/components/chat/ComposerIcon.tsx` para reuso):
    - `Image` — Adicionar mídia
    - `Mic` — Gravar um áudio
    - `Archive` — Adicionar mídia do acervo
    - `CalendarCheck` — Agendar mensagem (abre o **dialog de data — screenshot 2**)
    - `Image` (GIF) — Adicionar GIF (usar texto "GIF" com badge)
    - `Images` — Adicionar mídia (múltipla)
    - `Smile` — Adicionar emoji
    - `Tag` — Adicionar tag
  - Botão "CONTINUAR" no canto direito, `rounded-full bg-gradient-primary`, desabilitado até ter mensagem + contatos.

### Dialog de agendamento (screenshot 2)
Aberto pelo ícone `CalendarCheck` da toolbar:

- Componente `Dialog` padrão do app (`DialogContent` centralizado).
- Título em caps: "DATA DE AGENDAMENTO".
- Duas abas no topo: data formatada ("jul. 10, sex.") e hora ("00:00") — a hora ativa recebe underline em `text-primary`.
- Corpo: seletor de hora com chevrons up/down para horas e minutos (dois botões `ChevronUp` acima, dígitos grandes, `ChevronDown` abaixo). Incrementos: hora 0-23, minutos 0-59.
- Rodapé: dois botões pill — "Confirmar" (outline `border-primary text-primary`) e "Cancelar" (outline `border-border text-foreground`).
- Ao confirmar: atualiza a barra "Programado para" no composer com "amanhã/data, HH:MM" e fecha o dialog.

### Estado (local, sem persistência)
- `currentMonth: Date`, `selectedDate: Date`
- `composerOpen: boolean`, `dateDialogOpen: boolean`
- `scheduledAt: Date | null`
- `message: string`, `contactsFilter: Set<string>`, `contactSearch: string`

### Reuso
- Extrair `FilterChip` (hoje inline em `chat.tsx`) para `src/components/chat/FilterChip.tsx` e importar dos dois lados.
- Extrair `ComposerIcon` (hoje inline em `chat-configuracoes.tsx`) para `src/components/chat/ComposerIcon.tsx`.

### Fora de escopo
- Persistência de agendamentos (Supabase, tabelas, RPC).
- Busca real de contatos, aplicação real de filtros, envio da mensagem em massa.
- Upload de mídia, gravação de áudio, seletor de GIF/emoji/tag, acervo.
- Envio no clique de "CONTINUAR" — apenas UI.
