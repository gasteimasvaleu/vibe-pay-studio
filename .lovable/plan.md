# Melhorias na página Alterar Senha

Cobrir dois casos que hoje passam sem tratamento adequado em `/settings/change-password`.

## 1. Contas OAuth (Google) — bloquear com mensagem clara

- Detectar se o usuário logado tem provedor de senha (`email`) entre os `identities` do Supabase (`supabase.auth.getUser()` → `user.identities[].provider`).
- Se **não** tiver o provedor `email` (ex.: entrou só via Google):
  - Substituir o formulário por um estado informativo dentro do mesmo card:
    - Título: "Alteração de senha indisponível"
    - Texto: "Você entrou com Google. Sua senha é gerenciada pela sua conta Google — altere-a diretamente lá."
    - Botão secundário "Abrir conta Google" → `https://myaccount.google.com/security`.
  - Não renderizar campos de senha nem botão de salvar.
- Se tiver ambos (email + google), manter o formulário normal.

## 2. Impedir senha nova igual à atual

- Validação client-side: no schema Zod (ou no submit), comparar `newPassword` com `currentPassword`; se iguais, exibir erro no campo "Nova senha": "A nova senha deve ser diferente da atual."
- Reforço no submit: mesmo check antes de chamar `updateUser`, para caso o usuário edite os campos após validação.
- Manter as regras de complexidade existentes.

## Detalhes técnicos

- Arquivo único afetado: `src/routes/_authenticated/settings.change-password.tsx`.
- Detecção de provedor via `supabase.auth.getUser()` no mount (useEffect + estado `hasPasswordProvider: boolean | null`); enquanto `null`, mostrar skeleton do card.
- Sem migrações, sem novas server functions, sem mudanças em outras telas.
