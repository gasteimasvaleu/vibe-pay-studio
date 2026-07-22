## Correção

Exibir avatar real do parceiro na lista de conversas, com fallback nas iniciais (como no header da conversa aberta).

1. **`src/lib/chat.functions.ts`** — em `listThreads`:
   - Incluir `avatar_url` no `select` de `profiles`.
   - Passar `partnerAvatar: profile?.avatar_url ?? null` no resultado.

2. **`src/routes/_authenticated/chat.tsx`** — em `ThreadRow` (linha 287-294):
   - Se `thread.partnerAvatar` existir, renderizar `<img src={thread.partnerAvatar} className="h-11 w-11 rounded-full object-cover" />`.
   - Caso contrário, manter o círculo com iniciais como fallback.
   - Preservar o dot verde de online por cima.
