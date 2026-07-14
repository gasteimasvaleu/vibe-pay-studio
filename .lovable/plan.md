## Mudanças

### 1. `src/lib/publications.functions.ts`
- Adicionar `is_owner: boolean` ao tipo `FeedItem`.
- Preencher `is_owner: isOwner` no retorno de `getFeed` e `getUserPublications` (usa a variável `isOwner` já calculada).

### 2. `src/components/feed/PublicationOptionsMenu.tsx`
Ramificar as opções por `item.is_owner`:

**Dono** (atual): Copiar link · Adicionar/remover favoritos · Editar legenda · Habilitar/desabilitar comentários · Arquivar post · Excluir post (destrutivo).

**Não-dono** (novo): Copiar link · Adicionar/remover favoritos · Silenciar @usuário (Em breve) · Não tenho interesse (Em breve) · Denunciar post (destrutivo, Em breve).

Ações "Em breve" reutilizam o helper `soon()` existente. "Copiar link" e favoritos continuam funcionais nos dois casos.

### Fora de escopo
Nenhuma mudança em pagamentos, schema, feed, perfil ou `PublicationCard` (além de já receber `is_owner` via `item`).
