## Problema

Em `src/routes/_authenticated/perfil.$username.tsx` o loader não busca `avatar_url`, `cover_url`, `bio`, `location`, `display_name`. O card usa capa fixa (gradiente), avatar com inicial, `location` hardcoded (`"São Paulo - BRA"`) e não renderiza bio.

## Correção

### 1. Loader
- Trocar o `.select("user_id, username, account_type, price_monthly, discount_quarterly, discount_semiannual")` por incluir também `display_name, bio, location, avatar_url, cover_url`.
- No retorno, adicionar em `profile`: `displayName`, `bio`, `location`, `avatarUrl`, `coverUrl` (todos podem ser `null`).

### 2. Render (mesma página)
- `displayName`: usar `profile.displayName` quando existir; senão manter o fallback atual (username formatado).
- **Capa**: quando `profile.coverUrl` existir, renderizar `<img src={profile.coverUrl} className="absolute inset-0 h-full w-full object-cover" />` sobre o gradiente atual (mantido como fallback).
- **Avatar**: quando `profile.avatarUrl` existir, renderizar `<img src={profile.avatarUrl} />` preenchendo o círculo; senão, manter a inicial atual.
- **Bio**: acima do bloco de localização, renderizar `{profile.bio && <p className="text-sm text-foreground whitespace-pre-wrap pr-4 md:pr-6">{profile.bio}</p>}`.
- **Localização**: remover a constante `const location = "São Paulo - BRA"`. Renderizar o bloco `<MapPin />` apenas quando `profile.location` estiver preenchida, usando `{profile.location}` no lugar do valor fixo.

Sem outras mudanças (contagens, promoções, botões, assinatura).
