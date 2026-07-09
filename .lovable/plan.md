## Corrigir início da verificação Veriff (tela branca com spinner)

**Diagnóstico:** o server function `createIdentityVerificationSession` funciona (Network mostra 200 e URL Veriff válida). O problema é o cliente:

```ts
window.location.href = result.url;
```

No preview do Lovable a app roda dentro de um iframe. `saas.veriff.com` envia `X-Frame-Options: DENY` / CSP `frame-ancestors`, então navegar o iframe para lá deixa a tela em branco (só o spinner do Veriff, sem conteúdo). Em produção fora de iframe funcionaria, mas o usuário nunca consegue testar/usar no preview.

### Mudança — `src/routes/_authenticated/creator.onboarding.documentos.tsx`

1. Substituir `window.location.href = result.url` por uma navegação de topo segura:
   ```ts
   const veriffUrl = result.url ?? returnUrl;
   // Sempre navegar a janela do topo — funciona no preview (iframe) e em produção.
   if (window.top && window.top !== window.self) {
     window.top.location.href = veriffUrl;
   } else {
     window.location.href = veriffUrl;
   }
   ```
2. Como fallback (caso o browser bloqueie navegação cross-origin do top), abrir também `window.open(veriffUrl, "_blank", "noopener")` e mostrar um link "Abrir verificação em nova aba" com `href={result.url}` para o usuário clicar manualmente se o pop-up for bloqueado.
3. Navegar o próprio app para `/creator/onboarding/documentos/verificando` logo em seguida (`navigate({ to: ... })`) para que, quando o usuário voltar da Veriff, a tela de polling do KYC já esteja carregada.
4. Manter o estado `loading` até o redirect efetivamente ocorrer e mostrar mensagem "Abrindo verificação segura..." para dar feedback.

Sem mudanças no backend, no server function, nas rotas ou no schema. Só ajuste do handler `handleStart` e da UI de fallback.