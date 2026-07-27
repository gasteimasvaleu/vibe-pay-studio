## Alinhamento com a spec: `sendLiveMessage` + `FloatingReactions`

Comparei o código atual com a spec enviada. A base já cobre o essencial (middleware de auth, Zod, rate-limit, RLS na inserção). Faltam dois refinamentos: **denormalizar identidade nas mensagens** e **reescrever as reações com Framer Motion + `AnimatePresence`**.

### 1. Denormalização de identidade em `live_comments`

Hoje `live_comments` guarda só `user_id` e `getLiveMessages` faz JOIN com `profiles` a cada leitura. A spec pede snapshot do username/avatar no momento do envio (histórico "fotografado", sem JOIN).

- Migração: adicionar `username text` e `avatar_url text` em `public.live_comments` (nullable, sem default).
- `sendLiveMessage`: buscar `profiles(username, display_name, avatar_url)` do `context.userId` e inserir junto o snapshot; retornar a mensagem já com esses campos (sem 2ª query).
- `getLiveMessages`: usar `username`/`avatar_url` da própria linha e só fazer fallback ao JOIN em `profiles` para linhas antigas onde os campos ficaram null.
- Rate-limit: manter o Map em memória (política do projeto proíbe rate-limit persistido por padrão — sinalizar isso ao usuário caso queira upgrade).

### 2. Reescrever `FloatingReactions.tsx` com Framer Motion

Substituir a implementação atual (CSS keyframes + `<style>` inline) pela versão da spec:

- Handle imperativo `push(emoji)` mantido (já está assim).
- Estado `Reaction[]` com `id`, `emoji`, `offsetX` (±40), `startX` (0–40), `rotate` (±15°), `scale` (0.9–1.3).
- Container: `pointer-events-none absolute bottom-0 right-0 h-full w-32 overflow-hidden z-20 aria-hidden`.
- Cada emoji vira `motion.div` dentro de `<AnimatePresence>`:
  - `initial={{ y:0, x:startX, opacity:0, scale:0.4 }}`
  - `animate={{ y:-360, x:startX+offsetX, opacity:[0,1,1,0], scale, rotate }}`
  - `exit={{ opacity:0 }}`
  - `transition={{ duration:2.2, ease:"easeOut", opacity:{ times:[0,0.15,0.7,1], duration:2.2 } }}`
- Classes: `absolute bottom-2 right-4 text-4xl select-none drop-shadow-sm`.
- Auto-cleanup: `setTimeout(2400)` remove o item; timers guardados em `useRef` e limpos no unmount (já existe, manter).
- `framer-motion` já é dependência do projeto (usado em outros componentes) — sem instalação nova.

Impacto visual: reações passam a subir do canto inferior direito, com pop-in/rotação/drift orgânicos, em vez de subirem retas pelo meio.

### Fora de escopo

- Não mexer em `LiveChat.tsx`, `useLiveChat.ts` nem `WhepPlayer.tsx` — a spec descreve o loop que já está funcionando.
- Não adicionar validação de "usuário pode enviar nessa live" no handler (é responsabilidade do RLS, que já está no lugar).
- Não migrar rate-limit para tabela/Redis (proibido por política sem confirmação explícita).

### Detalhes técnicos

Arquivos afetados:
- `supabase/migrations/*` (nova migração): `ALTER TABLE public.live_comments ADD COLUMN username text, ADD COLUMN avatar_url text;`
- `src/lib/live-chat.functions.ts`: reescrever `sendLiveMessage` (single-insert com snapshot) e `getLiveMessages` (usar coluna + fallback JOIN só para nulls).
- `src/components/live/FloatingReactions.tsx`: reescrever inteiro com `motion` + `AnimatePresence` do `framer-motion`.
