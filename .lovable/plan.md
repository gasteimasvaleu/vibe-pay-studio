## Objetivo

Aplicar a mesma tipografia dos cards do dashboard (Faturamento/Liberado/Total) como padrão em todo o site, exceto na home (`src/routes/index.tsx`). Hoje há títulos em `text-4xl`, `5xl`, `6xl` e `7xl` com `font-black tracking-tighter` — o usuário considera essa escala agressiva demais.

## Padrão de referência (extraído do card do screenshot)

Fonte: Inter (já é a padrão do projeto — não muda).

| Uso | Classes |
|---|---|
| Título de página/seção principal (h1/h2 grande) | `text-2xl md:text-3xl font-black tracking-tight` |
| Título de card/subseção (h3) | `text-lg font-black tracking-tight` |
| Legenda/subtítulo dentro do card | `text-sm text-muted-foreground` |
| Valor/número em destaque | `text-3xl font-black tracking-tight` |
| Eyebrow/label uppercase | manter atual (`text-xs uppercase tracking-wider font-semibold`) |

Regra geral: nunca passar de `text-3xl` em telas md+; nunca usar `tracking-tighter`; manter `font-black tracking-tight` como peso padrão para títulos.

## Arquivos a alterar

Ajustar tamanhos/peso/tracking dos títulos e valores nestes arquivos, seguindo a tabela acima. Não mexer em cores, layout, ícones ou copy.

- `src/routes/sobre.tsx` — heros e h2 de seções (várias ocorrências `text-4xl/5xl/6xl/7xl`, `tracking-tighter`), estatística `text-5xl md:text-6xl`.
- `src/routes/como-funciona.tsx` — hero `text-5xl md:text-7xl`, h2 `text-4xl md:text-5xl`, numeração `text-7xl`, valores `text-3xl md:text-4xl`.
- `src/routes/entrar.tsx` — h1 `text-2xl md:text-3xl` (já OK, apenas confirmar).
- `src/routes/cadastro.tsx` — h1 `text-2xl md:text-3xl` (já OK, apenas confirmar).
- `src/routes/_authenticated/feed.tsx` — h1 do feed `text-2xl md:text-3xl` (já OK); h2 `text-xl md:text-2xl` mantém.
- `src/routes/_authenticated/publisher.tsx` — título grande `text-3xl` e input `text-4xl` → padronizar para `text-3xl` no título; input mantém tamanho para editor.
- `src/routes/_authenticated/perfil.$username.tsx` — h2 `text-2xl font-black` (já OK).
- `src/routes/_authenticated/creator.onboarding.*` — títulos `text-2xl md:text-3xl` (já OK); `creator.onboarding.documentos.aprovado.tsx` reduzir de `text-3xl md:text-4xl` → `text-2xl md:text-3xl`.
- `src/routes/__root.tsx` — 404 `text-7xl` → `text-5xl` (exceção visual permitida por ser código de erro, mas reduzir).
- `src/components/dashboard/*`, `src/components/site/Navbar.tsx`, `Footer.tsx`, `AppTopBar.tsx` — já estão dentro do padrão; apenas conferir.

## Fora de escopo

- `src/routes/index.tsx` (home) — não tocar.
- Cores, gradientes, layout, espaçamento, componentes shadcn.
- Corpo de texto (`text-base`, `text-sm`) e labels — mantidos.
- Fonte em si (continua Inter).

## Validação

Após as edições, rodar o build e checar visualmente as páginas `/sobre`, `/como-funciona`, `/dashboard`, onboarding do criador e feed para confirmar que os títulos ficaram no mesmo peso/tamanho dos cards de referência.
