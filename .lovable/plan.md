## Popover do botão "⋮" no perfil do creator

Trocar as opções atuais (Compartilhar, Denunciar, Adicionar amigo) pelas do screenshot, nesta ordem:

1. **[Assinatura gratuita | Assinar | Seguir]** (item de topo, com separador embaixo)
2. Chat
3. Compartilhar
4. Deixar de seguir *(só aparece quando o viewer já está seguindo/assinando)*
5. Denunciar perfil
6. Silenciar perfil
7. Adicionar amigo

### Regra do item de topo
Como "assinatura paga = seguir", derivamos tudo de duas informações: preço do creator e assinatura ativa do viewer.

- `priceMonthly === 0` → **"Assinatura gratuita"** (assinar/seguir grátis)
- `priceMonthly > 0` e viewer **não** segue → **"Assinar"** (abre `SubscribeDialog`)
- `priceMonthly > 0` e viewer **já** segue → **"Seguir"** rótulo neutro (item fica desabilitado indicando estado atual — não temos ação "seguir sem assinar")

Se preferir outro rótulo/comportamento para o caso "já assinante paga", me diga.

### Estado "está seguindo"
Consulta em `beforeLoad` (paralela com as demais):
```
supabase.from("subscriptions")
  .select("id")
  .eq("subscriber_id", viewerId)
  .eq("creator_id", profile.user_id)
  .eq("status","active")
  .gt("current_period_end", now)
  .maybeSingle()
```
Expor `isFollowing: boolean` no context.

### Ações
- **Chat** → `navigate({ to: "/chat" })` (mesmo destino já usado no botão Chat do card do perfil).
- **Compartilhar** → mantém a lógica atual (Web Share + fallback clipboard).
- **Deixar de seguir** → chama server function nova `unfollowCreator` que faz `update subscriptions set status='cancelled' where subscriber_id = viewer AND creator_id = target AND status='active'`. Confirmação via `window.confirm`. Depois `router.invalidate()`.
- **Denunciar perfil** → mantém alert atual (placeholder existente).
- **Silenciar perfil** → placeholder `alert("Perfil silenciado")` (sem backend nesta iteração).
- **Adicionar amigo** → mantém alert atual.

O item "Deixar de seguir" só é renderizado quando `isFollowing === true` e o viewer não é o próprio dono. O bloco todo do popover não aparece para `isOwner`.

## Arquivos

### 1. `src/lib/monetization.functions.ts` (ou onde ficam server fns de assinatura)
- Nova `unfollowCreator({ creatorId })` com `requireSupabaseAuth`, cancela subscription ativa.

### 2. `src/routes/_authenticated/perfil.$username.tsx`
- No `beforeLoad`, buscar `isFollowing` e retornar no context.
- Popover: substituir os 3 itens atuais pela lista de 7 acima, com separador entre o item de topo e o restante, ícones do screenshot (Chat: `MessageCircle`, Compartilhar: `Share2`, Deixar de seguir: `HeartOff`, Denunciar: `AlertCircle`, Silenciar: `VolumeX`, Adicionar amigo: `UserPlus`). Item de topo sem ícone à esquerda (como no screenshot).
- Handler "Assinar" (paid, não segue) reaproveita o `SubscribeDialog` já usado no botão principal.
- Handler "Assinatura gratuita" cria a assinatura grátis (server fn existente ou nova — verifico no build).

## Fora de escopo
- Nenhuma alteração no botão principal Mimo/Chat do card.
- Sem tabela nova. Sem UI de gestão de "silenciar".
- Sem alterar `PublicationOptionsMenu`.
