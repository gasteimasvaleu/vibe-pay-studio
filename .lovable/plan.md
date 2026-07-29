Atualmente **não existe** um link "Postagens arquivadas" no menu de configurações do criador. A rota `/postsarquivados` existe (`src/routes/_authenticated/postsarquivados.tsx`), mas só é acessível digitando a URL diretamente.

## Onde adicionar

A página de menu do criador é `src/routes/_authenticated/settings.creator.tsx`.
- No bloco `isSubscriber === false` (perfil pago), dentro do `<SettingsGroup title="Geral">` (linhas 177–208), inserir uma nova `<SettingsRow>` após "Assinantes restritos".
- Rótulo: "Postagens arquivadas".
- Ícone: `Archive` do Lucide.
- Destino: `to="/postsarquivados"`.

## Verificação

- Acessar `/settings/creator` logado como perfil pago.
- Confirmar que "Postagens arquivadas" aparece e navega para `/postsarquivados`.
- A página `/postsarquivados` já lista posts com `archived_at IS NOT NULL` do `active_profile_id`.

## Arquivo único

- `src/routes/_authenticated/settings.creator.tsx` (adicionar import do `Archive` e uma `<SettingsRow />`).
