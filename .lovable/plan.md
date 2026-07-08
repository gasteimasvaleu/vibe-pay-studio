## Objetivo

Criar a página de perfil pública/logada baseada no layout enviado (capa + avatar circular sobreposto, nome com selo verificado, @handle, localização, ícones sociais, barra de stats e abas "Postagens" / "Mídias" com cards de conteúdo bloqueado), adaptada à paleta roxo/fúcsia + fundo escuro do Monetisex — não branco/laranja como nas referências.

A mesma rota atende creator e assinante: o layout é idêntico; o que muda é a presença do botão "Assinar" (visível quando o visitante não é o dono do perfil) versus "Editar perfil" (quando é o dono).

## Estrutura de rotas

Criar `src/routes/_authenticated/perfil.$username.tsx` → URL `/perfil/$username`.

- `beforeLoad`: valida sessão (padrão já usado em feed/creator) e carrega o perfil alvo por `username` na tabela `profiles`. Se não existir, `throw notFound()`.
- Guarda também o `viewerUserId` para decidir se é dono do perfil.
- Adiciona `errorComponent` e `notFoundComponent`.

Links: adicionar navegação para `/perfil/{username}` a partir do avatar do usuário no `feed` e do painel do `creator`.

## Layout da página (adaptado)

Container escuro consistente com o resto do app (mesmo bg do feed).

1. **Topbar** — botão voltar (ícone `ArrowLeft`), nome do perfil centralizado, `MoreVertical` à direita.
2. **Cover** — banner grande com gradiente roxo→fúcsia como fallback + imagem opcional. Cantos arredondados.
3. **Avatar** — círculo grande sobreposto ao canto inferior esquerdo do cover, borda do bg da página.
4. **Linha de stats** — à direita da capa (desktop) / abaixo (mobile): ícones + números para Fotos, Vídeos, Conteúdo bloqueado, Curtidas. Ícones `Image`, `Film`, `Lock`, `Heart` do lucide, cor `muted-foreground`.
5. **Bloco de identidade** — Nome + selo verificado (`BadgeCheck` roxo), `@handle` em muted, linha com `MapPin` + localização, três ícones sociais circulares (Instagram, X, TikTok).
6. **CTA contextual** — botão largura total: "Assinar por R$ X/mês" (gradiente primary) se visitante ≠ dono; "Editar perfil" (outline) se dono.
7. **Bio** (opcional, se houver campo).
8. **Tabs** — "Postagens" e "Mídias" usando `@/components/ui/tabs` (shadcn), indicador na cor primary.
9. **Feed de cards** — cards com header (avatar + nome + @handle + `MoreVertical`), área de conteúdo bloqueado (grande retângulo com ícone `Lock` centralizado + mini stats fotos/vídeos/likes), rodapé com `Heart`, `MessageCircle`, ícone `$` (PPV) e `Bookmark` à direita.

## Dados

Nesta primeira versão, dados do perfil vêm de `profiles` (username, account_type). Stats, bio, localização, redes sociais e posts ficam **mock** dentro do componente (constantes tipadas) — mesma abordagem já usada em `feed.tsx`. Assim entregamos o layout completo sem migração de schema; podemos plugar tabelas reais depois em pedido separado.

## Estilo / tokens

- Usar tokens semânticos existentes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `primary`).
- Acento = mesmo gradiente roxo/fúcsia já presente em `index.tsx` / `feed.tsx` (evitar hardcode; reaproveitar as classes utilitárias existentes).
- Selo verificado: círculo `primary` com check branco.
- Cards com `rounded-2xl`, borda sutil, sombra leve.

## Detalhes técnicos

```text
src/routes/_authenticated/
  perfil.$username.tsx     (novo)
```

- `createFileRoute("/_authenticated/perfil/$username")`
- `Route.useParams()` para `username`; `Route.useRouteContext()` para viewer + profile alvo.
- Tabs via `@/components/ui/tabs` (já disponível no shadcn).
- Ícones via `lucide-react` (já usado no projeto).
- Nada de lógica de backend nova nesta iteração.

## Fora de escopo

- Upload de cover/avatar.
- Persistência de posts, likes, bookmarks.
- Fluxo de pagamento do botão "Assinar" (apenas UI).
