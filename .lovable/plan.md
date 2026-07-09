## Diagnóstico

O código já foi alterado no turno anterior:

- `src/components/onboarding/GooeyLoader.tsx` existe e usa `var(--primary)`.
- `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx` renderiza o `GooeyLoader` centralizado com o fundo escuro do `OnboardingShell` e o texto "Verificação de identidade em andamento" enquanto `status` for `processing` ou `not_started`.

O print enviado mostra um spinner circular pequeno em fundo branco (nada do shell escuro / gradiente da Monetisex, sem título "Verificação de documentos" no header). Isso não corresponde à tela `verificando` renderizada pelo código atual — parece um fallback de suspense/SSR do router ou uma tela em transição (ex.: redirecionando para `/aprovado`). Duas causas prováveis:

1. **Preview servindo bundle antigo em cache.** Sem hard-refresh o navegador continua com o JS anterior à mudança.
2. **A rota não está em `processing`.** Se `getKycStatus` já responde `verified`, o componente dispara `navigate(...aprovado)` e o que aparece na tela é a rota de destino carregando (fallback padrão do TanStack Router, que é um spinner branco simples), não o nosso `GooeyLoader`.

Também há uma fragilidade real no `GooeyLoader`: o `<svg className="absolute w-0 h-0">` que hospeda o `<filter id="gooey">` pode ser removido do layout por alguns navegadores/versões do Vite quando o SVG tem dimensão zero, quebrando o `filter: url(#gooey)` — mas mesmo nesse caso as duas bolas roxas apareceriam (sem o efeito de fusão), o que ainda não bate com o print do usuário.

## Plano

1. **Endurecer `src/components/onboarding/GooeyLoader.tsx`**
   - Trocar o SVG `w-0 h-0` por um `<svg width="0" height="0" style={{ position: "absolute" }}>` fora do fluxo, garantindo que o `<filter>` sempre exista no DOM.
   - Aumentar o tamanho padrão do `.gooey-loader` (160×160) para ficar visível mesmo se `className` externo não for aplicado, e usar `hsl(var(--primary))` como fallback caso `var(--primary)` esteja em outro formato.

2. **Adicionar `pendingComponent` na rota `verificando`**
   - Definir `pendingComponent` em `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx` renderizando o mesmo `OnboardingShell` + `GooeyLoader`, para que qualquer estado de "pending" do router (SSR, transição) não exiba o spinner branco padrão.

3. **Adicionar `pendingComponent` na rota `aprovado`**
   - Mesmo tratamento em `creator.onboarding.documentos.aprovado.tsx`, para que o intervalo entre `navigate` e a tela final também mostre o `GooeyLoader` sobre o fundo escuro (evita o "flash branco" que provavelmente é o que o usuário capturou).

4. **Instrução ao usuário**
   - Após o build, pedir um hard-refresh (Cmd/Ctrl+Shift+R) na preview e reabrir `/creator/onboarding/documentos/verificando`.

Nenhuma mudança em backend, schema, server functions ou lógica de polling.
