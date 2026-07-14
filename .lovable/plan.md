## Problema

Em `src/routes/_authenticated/perfil.$username.tsx` (linhas 44-46), o `beforeLoad` faz:

```ts
if ((viewerProfile?.account_type ?? "subscriber") === "subscriber") {
  throw redirect({ to: "/dashboard" });
}
```

Ou seja: qualquer visitante do tipo "subscriber" que clicar no `@username` do autor de uma publicação (link do `PublicationCard`) é chutado para o próprio dashboard antes do perfil carregar. Só criadores conseguem ver perfis alheios hoje.

## Correção

Remover esse bloqueio para que **assinantes também possam abrir o perfil de um criador** clicando em `@usuario` no feed.

### Mudança única em `src/routes/_authenticated/perfil.$username.tsx`

- Apagar o trecho que busca `viewerProfile.account_type` e o `redirect` para `/dashboard` (linhas ~38-46).
- Manter o restante do `beforeLoad`: verificação de login, busca do `profile` pelo `username`, `notFound()` se não existir, e retorno do contexto (`viewerId`, `profile`).

Nenhuma outra tela é alterada. O link do `PublicationCard` (`to="/perfil/$username"`) já está correto.

## Validação

1. Logar como assinante, abrir `/feed`, clicar em `@username` no cabeçalho de uma publicação → deve abrir `/perfil/<username>` do criador (e não o dashboard).
2. Logar como criador e repetir → continua funcionando como antes.
3. Abrir `/perfil/<username-inexistente>` → continua mostrando "Perfil não encontrado".

## Fora do escopo

- Ajustes visuais na página de perfil quando vista por assinante (ex.: esconder botões de edição). Se quiser, tratamos em passo separado.
