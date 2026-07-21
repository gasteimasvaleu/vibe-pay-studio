# Marcar Twitter e Apple como "Em breve" na tela de Segurança

Arquivo: `src/routes/_authenticated/settings.security.tsx`

- Adicionar campo opcional `comingSoon: boolean` no tipo `Provider` e marcá-lo `true` em `twitter` e `apple`.
- No botão renderizado:
  - Quando `comingSoon`: rótulo passa a `"{name} · Em breve"`, botão fica `disabled`, cursor `not-allowed` e opacidade reduzida (`opacity-60`).
  - Google continua com o comportamento atual (mostra "conectado" / "não conectado").

Sem outras mudanças.
