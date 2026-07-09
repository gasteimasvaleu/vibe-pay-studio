Plano para ajustar o botão `+` da tela `/chat` para abrir diretamente na tela de composição de mensagem em massa (a do screenshot), pulando a tela de calendário e sem abrir o dialog de agendamento.

Escopo: ajustes de roteamento/estado inicial, sem backend.

````text
Arquivos alterados
├── src/routes/_authenticated/chat.tsx
└── src/routes/_authenticated/chat-agendamento.tsx

Mudanças
1. chat-agendamento.tsx
   - Adicionar leitura de search param `view` (via useSearch do TanStack Router).
   - Inicializar o estado interno `view` como "composer" quando a URL for
     `/chat-agendamento?view=composer`.
   - Manter o comportamento padrão "calendar" quando o param não estiver
     presente (ícone de agenda continua indo para o calendário).

2. chat.tsx
   - Alterar o Link do botão `+` para apontar para `/chat-agendamento` com
     search param `view=composer`.

Resultado esperado
- Clicar no `+` do header de `/chat` abre `/chat-agendamento?view=composer`
  já na tela de composição (igual ao screenshot), com o card de aviso visível.
- O dialog de agendamento de data não abre automaticamente.
- O ícone de calendário ao lado continua abrindo `/chat-agendamento` na tela
  de calendário normalmente.
````