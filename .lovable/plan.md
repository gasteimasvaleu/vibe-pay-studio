## Objetivo

O botão `CalendarCheck` na sidebar do `/chat` deve abrir uma **terceira tela dedicada** de disparo em massa (baseada na de agendamento), incluindo o card de aviso "Novo limite de disparos em massa" mostrado no screenshot.

## Mudanças

1. **Nova rota** `src/routes/_authenticated/chat-massa.tsx`
   - Layout de duas colunas idêntico ao `chat-agendamento.tsx` (sidebar de seleção de contatos à esquerda + composer à direita).
   - Header: "Mensagem em massa" (esquerda) e "Selecionar usuários para enviar mensagem em massa" (direita).
   - Sidebar reutiliza os mesmos filtros (Todos, Seguidores, Seguindo, Expirados, Top 100 Compradores, Expiram em 7 Dias, Interações, Top 1000 Compradores) e o botão "Aplicar filtro".
   - **Novo card de aviso** logo abaixo dos filtros, com ícone `Info`, fundo verde suave, título "Novo limite de disparos em massa" e texto "Você tem até **5 disparos** hoje. Planeje suas mensagens com antecedência."
   - Composer à direita com placeholder "Escreva sua mensagem" / "Digite e envie a mensagem em massa para os usuários selecionados." e botão `CONTINUAR`.

2. **Atualizar `src/routes/_authenticated/chat.tsx`** (linha ~181)
   - Trocar o destino do botão `CalendarCheck` de `/chat-agendamento` para `/chat-massa`.
   - Manter o botão de agendamento acessível conforme já existe (sem removê-lo — apenas este botão aponta para a nova tela).

## Detalhes técnicos

- Copiar a estrutura de `chat-agendamento.tsx` como ponto de partida para garantir consistência visual (mesmas classes, mesmos componentes de filtro/composer).
- O card de aviso é puramente visual nesta etapa (sem lógica de contagem real de disparos) — o valor "5 disparos" fica hardcoded por enquanto.
- Rota registrada automaticamente pelo plugin do TanStack Router após criar o arquivo.
- Sem mudanças de backend/schema.
