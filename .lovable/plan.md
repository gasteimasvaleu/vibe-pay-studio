## Refatorar Chat para o tema claro do app

Trocar todas as cores hardcoded (`bg-black`, `text-white`, `from-fuchsia-500 to-purple-600`, `border-white/10`) por tokens semânticos definidos em `src/styles.css`.

### Mapeamento

| Antes | Depois |
|---|---|
| `bg-black`, `bg-black/60 backdrop-blur-xl` | `bg-background` / `bg-card/80 backdrop-blur-xl` |
| `text-white`, `text-white/60`, `text-white/40` | `text-foreground`, `text-muted-foreground` |
| `border-white/10`, `border-white/5` | `border-border` |
| `bg-white/5`, `hover:bg-white/10` | `bg-muted`, `hover:bg-accent` |
| `from-fuchsia-500 to-purple-600` (avatares, botão enviar, badge, bolha do usuário) | `bg-gradient-primary` (utilitário já existente) |
| `shadow-fuchsia-500/30` | `shadow-glow` (variável já existente) |
| Sombra suave em bolhas do parceiro | `shadow-card` |
| `ring-black` (dot online) | `ring-background` |
| `focus-visible:ring-fuchsia-500` | `focus-visible:ring-ring` |
| `radial-gradient(...fuchsia...)` no painel vazio | `bg-gradient-soft` ou `var(--gradient-radial)` |

### Arquivos a alterar

- `src/routes/_authenticated/chat.tsx` — sidebar, header, busca, toggle, lista de threads, diálogo "nova conversa".
- `src/routes/_authenticated/chat.$threadId.tsx` — header, bolhas de mensagens (usuário = `bg-gradient-primary text-primary-foreground`; parceiro = `bg-card border border-border text-foreground shadow-card`), composer, botão enviar.
- `src/routes/_authenticated/chat.index.tsx` — estado vazio (ícone com `bg-gradient-primary`, textos com `text-foreground`/`text-muted-foreground`).

### Ajustes de contraste

- Bolha do usuário: `bg-gradient-primary` com `text-primary-foreground` (branco sobre lilás — combinação já garantida no design system).
- Bolha do parceiro: `bg-card` com `text-card-foreground` e `border-border`.
- Timestamps: `text-primary-foreground/80` (na bolha do usuário) e `text-muted-foreground` (na do parceiro).
- Dot de presença online: mantém verde-esmeralda (`bg-emerald-500`), mas com `ring-background`.

### Fora de escopo

- Nenhuma mudança em lógica de dados, realtime, migrations ou APIs.
- BottomNav permanece como está (assunto separado).

### Verificação

- `bunx tsgo --noEmit`.
- Inspeção visual em `/chat` e `/chat/{id}` — nada usando `text-white`/`bg-black`/cores hex hardcoded.
