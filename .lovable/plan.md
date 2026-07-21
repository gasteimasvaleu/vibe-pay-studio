## Objetivo

Criar uma página neutra para ser configurada como **Callback URL** no painel do Veriff. Ela apenas informa que a verificação está em andamento e instrui o usuário a fechar a aba — a aba original do app (em `/creator/onboarding/documentos/verificando`) continua fazendo polling e redireciona sozinha para `/aprovado` quando o webhook Decision chegar.

Assim não há duplicidade: o Veriff manda o usuário para uma tela de "fim de fluxo Veriff", e o app resolve o restante na aba de origem.

## Fluxo final

```text
Aba app                                Aba Veriff (popup/redirect)
────────                                ────────────────────────
/documentos/index  ──cria sessão──►
/documentos/verificando  (polling)      Veriff faz selfie/docs
                                        ↓ conclui
                                        Callback URL do Veriff:
                                        /creator/onboarding/documentos/veriff-concluido
                                        "Pode fechar esta janela"
                                        ↓ usuário fecha
/documentos/verificando (segue polling)
   webhook Decision chega ► kyc_status = verified
/documentos/aprovado  ← navegação automática pelo polling
```

## Mudanças

1. **Nova rota** `src/routes/_authenticated/creator.onboarding.documentos.veriff-concluido.tsx`
   - Rota autenticada (o usuário já está logado; o Veriff só redireciona no mesmo browser).
   - `head()` com `title: "Verificação enviada · Monetisexy"` e `robots: noindex`.
   - UI minimalista dentro do `OnboardingShell` (ou layout simples), com:
     - Ícone de check/relógio.
     - Título: "Verificação enviada com sucesso"
     - Texto: "Recebemos seus documentos e estamos analisando. Pode fechar esta janela — vamos avisar no app assim que estiver tudo pronto."
     - Botão primário: **"Fechar esta janela"** → `window.close()`.
     - Fallback (caso o browser bloqueie `window.close()` porque a aba não foi aberta por script): botão secundário **"Voltar ao painel"** → navega para `/dashboard` na própria aba.
   - Nenhuma chamada de servidor. A página é puramente informativa; o status real é resolvido em `/verificando` e via webhook.

2. **Ajuste do `return_url` enviado ao Veriff** em `src/routes/_authenticated/creator.onboarding.documentos.index.tsx`
   - Trocar `const returnUrl = \`${window.location.origin}/creator/onboarding/documentos/verificando\`;`
     por `const returnUrl = \`${window.location.origin}/creator/onboarding/documentos/veriff-concluido\`;`
   - Continuamos navegando na aba do app para `/creator/onboarding/documentos/verificando` logo após criar a sessão (linha 42), sem mudança — é ela que segue com o polling.

3. **Painel do Veriff (configuração manual, fora do código)**
   - Callback URL: `https://monetisexy.com/creator/onboarding/documentos/veriff-concluido`
   - Decision Webhook: `https://monetisexy.com/api/public/webhooks/veriff-decision` (já configurado com domínio próprio).

## O que NÃO muda

- `/documentos/verificando` continua idêntica (polling + fallback "Verificar agora" + botão "Voltar ao painel").
- `/documentos/aprovado` continua idêntica (idempotente, chama `completeOnboarding`).
- `createIdentityVerificationSession`, `getKycStatus`, webhook `veriff-decision.ts`, `applyKycTransition` — nenhum ajuste no servidor.

## Notas técnicas

- `window.close()` só funciona de forma confiável quando a aba foi aberta por `window.open()`. Se o Veriff foi aberto por redirect na mesma aba, `close()` é ignorado — por isso o botão fallback "Voltar ao painel" leva para `/dashboard`. Nesse caso o usuário continua no app e o polling em `/verificando` (se ainda aberto em outra aba) resolve; se não houver aba com `/verificando`, o próximo carregamento de `/dashboard` já reflete o status (o webhook Decision atualiza `kyc_status` no banco).
- Rota autenticada é OK: o cookie de sessão do Supabase é compartilhado entre abas do mesmo domínio, então o retorno do Veriff no mesmo browser mantém login.
