Plano de implementação para alterar o botão `+` da tela de chat.

Objetivo: o botão `+` do header de `/chat` deve abrir a tela de agendamento/mensagem em massa (`/chat-agendamento`), e essa tela deve exibir o aviso de limite de disparos em massa conforme o screenshot.

Escopo: mudanças apenas no frontend, sem lógica de negócio/persistência.

````text
Arquivos alterados
├── src/routes/_authenticated/chat.tsx
└── src/routes/_authenticated/chat-agendamento.tsx

Mudanças
1. chat.tsx
   - Substituir o botão `+` (que hoje abre o modal "Nova conversa") por um Link
     que navega para `/chat-agendamento`.
   - Manter inalterados os demais botões do header (Agenda, Configurações,
     Filtros, Presença).

2. chat-agendamento.tsx
   - Adicionar, no painel esquerdo da view "composer" (abaixo dos filtros e
     acima do botão "Aplicar filtro"), um card de aviso com:
     • Ícone de informação
     • Título: "Novo limite de disparos em massa"
     • Texto: "Você tem até 5 disparos hoje. Planeje suas mensagens com
       antecedência."
     • Estilo visual alinhado ao design atual do app (card arredondado,
       borda, cor de fundo suave).
````