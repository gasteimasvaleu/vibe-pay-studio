## Nova página "Em Alta" (/em-alta)

Página autenticada listando rankings de criadores em várias categorias, acessada pelo card "Em Alta" no dashboard do creator.

### Roteamento

- Novo arquivo: `src/routes/_authenticated/em-alta.tsx`
  - `createFileRoute("/_authenticated/em-alta")`
  - `head()` com título "Em Alta · Monetisexy" e `robots: noindex`
  - Layout usa `DashboardShell` (mesmo padrão das outras rotas do painel) com título "Em Alta"
- `src/components/dashboard/CreatorDashboard.tsx`: adicionar `to="/em-alta"` no `ActionCard` "Em Alta"

### Estrutura da página

Fundo claro (bege como nos screenshots — usar token existente `bg-background` do tema light dentro da shell), rolagem vertical, cada seção com título + link "ver mais" (chevron à direita) + carrossel horizontal com `overflow-x-auto snap-x`.

Seções na ordem dos prints:

1. **Top creators** — cards altos (retrato) com número grande em marca d'água (1, 2, 3…), foto de capa, nome + `@handle` + selo verificado sobre a base.
2. **Ofertas de assinatura** — ícone de estrela laranja no título; cards quadrados menores com foto + nome + `@handle`, alguns com badge de desconto.
3. **Perfis gratuitos** — cards largos (paisagem) com capa, avatar circular sobreposto no canto inferior esquerdo, número de ranking (1º, 2º, 3º) no canto superior direito, faixa branca embaixo com nome + `@handle`.
4. **As mais mimadas** — cards verticais compactos com foto, ranking (1º, 2º…) no topo direito, nome + `@handle` sobre gradient na base.
5. **Rumo ao topo** — cards paisagem em grid 2 colunas (desktop) com avatar circular à esquerda, contadores de fotos/vídeos com ícones à direita, nome + `@handle` na faixa branca inferior.
6. **Em alta nos posts** — cards paisagem com foto do post, avatar circular pequeno + nome + `@handle` sobre gradient, ranking no canto superior direito.
7. **Bombando no chat** — cards horizontais brancos com avatar + ranking (1º, 2º…) + nome + "Responde em instantes" + botão outline laranja "Ver perfil".
8. **Chamada Um a Um** — cards verticais grandes com foto, ranking, badge laranja "um a um" no canto, nome + `@handle` centralizados abaixo e botão outline "Ver perfil".
9. **Live nas alturas** — cards verticais com foto arredondada, nome centralizado, ícone de transmissão vermelho + "X lives nos últimos 7 dias", botão outline "Ver perfil".

### Componentes

Criar em `src/components/em-alta/`:

- `EmAltaSection.tsx` — wrapper genérico: título + chevron + slot para carrossel horizontal.
- `TopCreatorCard.tsx`
- `OfertaCard.tsx`
- `PerfilGratuitoCard.tsx`
- `MimadaCard.tsx`
- `RumoAoTopoCard.tsx`
- `PostEmAltaCard.tsx`
- `ChatBombandoCard.tsx`
- `UmAUmCard.tsx`
- `LiveCard.tsx`

Cada card recebe props tipadas (nome, handle, avatarUrl, coverUrl, rank, opcionais). Usa tokens semânticos (`bg-card`, `text-foreground`, `border-border`, `text-primary` para o laranja da marca) — nada de cores hardcoded.

### Dados mock

Arquivo `src/lib/em-alta.mock.ts` exportando arrays tipados para cada seção (6-8 itens por seção). Usar avatares/capas placeholder via `https://i.pravatar.cc/...` e `https://picsum.photos/...` para não incluir binários no repo.

### Escopo

- Apenas UI + rota + mock. Sem Supabase, sem lógica de negócio.
- Sem alterar comportamento de outros cards.
- Sem novas dependências.

### Detalhes técnicos

- Rolagem horizontal: `flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4` para sangrar até a borda no mobile.
- Selo verificado: reutilizar padrão existente (BadgeCheck do lucide, `text-primary`).
- `Link` do `@tanstack/react-router` nos "ver mais" apontando para `/em-alta` (âncora inerte por enquanto — placeholder até definirmos sub-rotas).
- Botões "Ver perfil": `<Link to="/perfil/$username" params={{ username }}>` já que a rota existe.
