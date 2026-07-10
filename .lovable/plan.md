## Objetivo
Criar a página **Meus assinantes** (rota `/follow`) acessada ao clicar no card "Meus assinantes" do dashboard do creator. Layout conforme screenshot: header padrão (voltar + título), campo de busca e estado vazio "Sem resultados para sua pesquisa.".

## Rota
- **novo** `src/routes/_authenticated/follow.tsx` → URL `/follow`
  - `head()`: `title: "Meus assinantes · Monetisex"`, `robots: noindex`
  - Header estilo `DashboardShell` (fundo `--gradient-radial`, header `border-b border-border backdrop-blur-md bg-card/80`, container `max-w-3xl mx-auto`).
  - Botão voltar (`ArrowLeft` → `router.history.back()`), título "Meus assinantes", espaçador.

## Conteúdo da página
1. **Campo de busca**
   - Input com ícone `Search` (lucide) à esquerda, placeholder "Busca".
   - Estilo pill (`h-12 rounded-full pl-10`), state local `query`.
2. **Estado vazio (mock)**
   - Quando não houver assinantes cadastrados (por ora sempre), exibir texto centralizado em negrito: **"Sem resultados para sua pesquisa."**
   - Sem lista real — apenas UI estática.

## Wiring no dashboard
- **editar** `src/components/dashboard/CreatorDashboard.tsx` — no `ActionCard` "Meus assinantes" (linhas 79-83) adicionar `to="/follow"`.

## Detalhes técnicos
- Usar componentes shadcn existentes: `Input`.
- Ícones lucide: `ArrowLeft`, `Search`.
- Tudo estático (sem chamadas Supabase).
- Reaproveita padrões visuais do `/banco` (header, fundo gradient).

## Arquivos alterados/criados
- **novo** `src/routes/_authenticated/follow.tsx`
- **editar** `src/components/dashboard/CreatorDashboard.tsx` (adicionar `to="/follow"` no card "Meus assinantes")
