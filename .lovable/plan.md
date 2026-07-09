## Objetivo

Substituir o cabeçalho atual (avatar + nome inline, com classes `text-white`/`bg-black/20` que não batem com o tema claro do app) por um **card de perfil** no estilo do screenshot, usando os tokens semânticos do design system (`--card`, `--foreground`, `--muted-foreground`, `--primary`, `--gradient-primary`, `--shadow-card`), tanto no Creator quanto no Assinante.

## Layout do card (inspirado no screenshot, adaptado)

```
┌───────────────────────────────────────────────────────────┐
│                    ░░░ gradient banner ░░░       ┌──────┐ │
│                                                  │+100° │ │
│                                                  └──────┘ │
│   ┌────┐                                                  │
│   │ 🟣 │                                    Ver perfil →  │
│   └────┘                                                  │
│                                                           │
│   Caio                                                    │
│   @caiorobbb                                              │
│   0  Superfãs / Assinaturas                               │
└───────────────────────────────────────────────────────────┘
```

Estrutura:
- Card `rounded-2xl border bg-card shadow-[var(--shadow-card)] overflow-hidden`
- **Faixa superior** (`h-24`): fundo `bg-gradient-primary` (usa o utility já definido em `styles.css`)
  - No canto sup. direito: badge `+100°` — pill `rounded-full bg-background/80 backdrop-blur px-3 py-1 text-sm font-black text-primary` — o `°` fica menor com `text-xs align-super`. Fica como marco/nível decorativo (semântica ligamos depois).
- **Corpo** (`px-5 pt-0 pb-5 -mt-10 relative`):
  - Avatar circular `h-20 w-20 rounded-full ring-4 ring-card bg-gradient-primary grid place-items-center text-2xl font-black text-primary-foreground` com a primeira letra do username, sobrepondo a faixa.
  - À direita, alinhado ao final da faixa: `<Link to="/perfil/$username">Ver perfil →</Link>` — texto `text-sm font-semibold text-foreground hover:text-primary`.
  - Abaixo do avatar: nome grande `text-2xl font-black text-foreground` (com `BadgeCheck` do lucide em `text-primary` inline, só no creator), `@username` em `text-sm text-muted-foreground`, e a linha de contagem `0` em `text-lg font-black` + label em `text-sm text-muted-foreground` (`Superfãs` para creator, `Assinaturas` para assinante).

Sem toggle de modo escuro (o app é light, sem tema alternativo por enquanto).

## Onde fica

Novo componente `src/components/dashboard/ProfileHeaderCard.tsx` — exportado e usado dentro de `DashboardShell` no lugar da `<motion.section>` atual do cabeçalho. Props:
- `username: string`
- `isCreator: boolean`
- `stat?: { value: number; label: string }` — default: `{ value: 0, label: isCreator ? "Superfãs" : "Assinaturas" }`
- `levelBadge?: string` — default `"+100°"` (fica flexível pra ligarmos a marcos depois)

O `DashboardShell` passa `isCreator` (que já recebe) pra montar as defaults.

## Ajustes de tema no DashboardShell (necessários pra não destoar)

O shell atual foi escrito assumindo dark (`text-white`, `bg-black/20`, gradient grid claro sobre fundo escuro). Como o app é light, corrijo pontualmente **apenas o que envolve o novo header e o wrapper que o rodeia**, deixando os grupos de cards do commit anterior intactos por enquanto (você vai iterar):
- Container: remover `text-white`, deixar herdar `text-foreground`.
- Camadas de fundo: manter só o `bg-background` + o `--gradient-radial` (que já é suave e claro); remover o overlay de grid escuro (`bg-[radial-gradient(...rgba(255,255,255,0.06)...)]`) que só faz sentido em fundo escuro.
- Header (topbar "Meu painel"): trocar `bg-black/20 border-white/10` por `bg-card/80 border-border`, botão voltar `text-muted-foreground hover:bg-accent`, título `text-foreground`, link Feed `text-muted-foreground hover:text-foreground`.

Cards (`ActionCard`) e grupos permanecem como estão neste passo — você pediu ajuste do **card header**; iteramos nos cards em mensagens seguintes.

## Fora de escopo

- Buscar `superfãs` reais do Supabase (fixo em 0 por enquanto).
- Toggle de modo escuro / tema alternativo.
- Repaginar os `ActionCard`s pro tema claro (fica pra próxima instrução sua).
- Rota real do badge de nível.
