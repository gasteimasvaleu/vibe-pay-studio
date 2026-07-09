## Fix: `DialogTitle` fora de `Dialog` no composer

Ao remover o `Sheet`, o header "Selecionar usuários para enviar mensagem em massa" continua usando `<DialogTitle>` do Radix, que exige um `Dialog` pai. Como agora o composer é uma view inline (sem Sheet/Dialog), esse componente lança `DialogTitle must be used within Dialog`.

**Arquivo:** `src/routes/_authenticated/chat-agendamento.tsx`

- Substituir `<DialogTitle …>` (linha ~379) por um `<h2>` simples com as mesmas classes.
- Remover o import `DialogTitle` do bloco `@/components/ui/dialog` no topo (o `DateDialog` não usa `DialogTitle` — usa apenas `Dialog`/`DialogContent`; adicionar um dentro do `DateDialog` para acessibilidade não é necessário para esse fix, mas manteremos como está).

Sem outras mudanças.
