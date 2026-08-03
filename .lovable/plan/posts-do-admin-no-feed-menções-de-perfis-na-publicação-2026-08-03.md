# Posts do admin no feed + menções de perfis na publicação

## 1. Postagens do admin visíveis para todos

Hoje o feed só mostra publicações do próprio usuário e de quem ele segue. Vamos incluir sempre as publicações do administrador (caioroobb@gmail.com / Monetisexy), mesmo sem seguir.

- No feed, além dos autores seguidos, incluir automaticamente os user_ids que têm papel `admin`.
- Regras de bloqueio/ocultar publicação continuam valendo (posts ocultados pelo usuário seguem ocultos).
- Publicações pagas do admin continuam com o cadeado normal.

## 2. Referenciar perfis na publicação (só admin)

No fluxo de criação de post (`/publisher`), aparece uma nova seção **apenas para admins**: "Referenciar perfis".

- Campo de busca por @usuário (usa a mesma busca da página /busca, perfis pagos e gratuitos).
- Admin seleciona um ou mais perfis; cada um vira um "chip" removível antes de publicar.
- Perfis com "não aparecer em menções" ativado não são sugeridos.

## 3. Como a referência aparece no feed

Abaixo da legenda da publicação, é renderizado um card por perfil referenciado, com o mesmo visual da página de busca:

```text
+------------------------------------------+
|  [banner de capa]                    (⋮) |
| (avatar)  nomedeexibicao  ✔               |
|           @usuario                        |
+------------------------------------------+
```

- Banner = capa do perfil, avatar circular sobreposto, nome + selo de verificado + @usuário.
- Clicar no card abre o perfil.
- Botão de três pontos verticais (⋮) abre o popover padrão do app com:
  - @usuario (abre o perfil)
  - Chat (abre conversa com o perfil)
  - Compartilhar (copia/compartilha o link do perfil)
  - Denunciar perfil (fluxo de denúncia já existente)

## Detalhes técnicos

- Migração: nova tabela `publication_profile_mentions` (publication_id, creator_profile_id, position) com GRANTs e RLS — leitura para quem pode ler a publicação, escrita apenas por admin (`has_role(auth.uid(),'admin')`).
- `getFeed` em `src/lib/publications.functions.ts`: adicionar user_ids de admin à lista `allowedAuthors` e carregar as menções (join com `creator_profiles_search` para banner/avatar/verificado), retornando `mentions[]` em `FeedItem`.
- `createPublication`: aceitar `mentionProfileIds`, validando papel admin no servidor antes de inserir.
- Novo componente `src/components/feed/MentionedProfileCard.tsx` reutilizando o layout do `CreatorCard` de `search.tsx`, com `ActionPopover` já existente para o menu ⋮.
- `PublicationCard.tsx`: renderizar a lista de menções logo abaixo da legenda.
- `publisher.tsx`: seletor de perfis exibido só quando `getMyRoles` indicar admin.
