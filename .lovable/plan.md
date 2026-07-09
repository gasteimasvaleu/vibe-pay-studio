## Redesenhar as tabs "Postagens / Mídias"

Adaptar o `TabsList` em `src/routes/_authenticated/perfil.$username.tsx` (linhas 197–210) para o layout do screenshot, usando as cores do app (primary laranja + card branco) em vez de fúcsia/roxo em fundo escuro.

### Mudanças

1. **Container (`TabsList`)**
   - De: `w-full h-12 rounded-2xl bg-white/5 border border-white/10 p-1`
   - Para: `w-full h-12 rounded-full bg-card border border-border p-0 overflow-hidden` (pílula clara com divisor central)

2. **Cada `TabsTrigger`**
   - Base: `flex-1 h-full rounded-none gap-2 text-sm font-semibold text-muted-foreground bg-transparent transition-colors`
   - Ativo: `data-[state=active]:text-primary data-[state=active]:bg-transparent` + borda inferior laranja via `data-[state=active]:border-b-2 data-[state=active]:border-primary`
   - Inativo mantém `text-muted-foreground` (legível sobre card branco)
   - Adicionar ícone ao lado do texto:
     - Postagens: `Smartphone` (lucide) — combina com o mock do print
     - Mídias: manter `Film` ou usar `Clapperboard`
   - Divisor visual entre as duas: `border-l border-border` no segundo trigger

3. **Garantir legibilidade**
   - Nenhum texto branco sobre branco: ativo = `text-primary`, inativo = `text-muted-foreground`.
   - Ícones herdam `currentColor`.

### Fora de escopo
Feed, cards de posts, grid de mídias, header, botão Editar perfil, onboarding, Veriff.
