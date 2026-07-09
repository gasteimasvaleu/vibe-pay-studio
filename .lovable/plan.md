## Corrigir textos invisíveis no onboarding do creator

**Causa:** as telas `creator.onboarding.*` usam classes hardcoded `text-white`, `text-white/60`, `bg-white/5` etc., mas o `OnboardingShell` renderiza com `bg-background text-foreground`. Neste projeto `--background` é claro, então texto branco fica invisível (como no screenshot: "Não se preocupe…", "Mensal/Trimestral/Semestral", "R$", subtítulos).

O restante da área logada (feed, dashboard) resolve isso montando um fundo escuro próprio (`bg-background` + gradiente radial + textura de pontos) e usa `text-white` por cima. O onboarding deve seguir o mesmo padrão para ficar coerente e legível.

### Mudança
Em `src/components/onboarding/OnboardingShell.tsx`:
- Trocar o wrapper de `bg-background text-foreground` para o mesmo stack visual do feed/dashboard:
  - camada `absolute inset-0 bg-background`
  - overlay `bg-[var(--gradient-radial)]` opacidade 70%
  - textura de pontos (`radial-gradient` de 22px)
  - texto base branco (`text-white`)
- Ajustar header e barra de progresso para contrastarem com o fundo escuro (borda inferior `border-white/10`, título `text-white/90`, botão voltar com `hover:bg-white/10`).

Isso torna todos os textos brancos das telas filhas (`redes-sociais`, `assinatura`, `documentos`, `verificando`, `aprovado`) imediatamente legíveis, sem tocar em cada página.

### Arquivo
- `src/components/onboarding/OnboardingShell.tsx` — apenas as classes do wrapper e do header.

Sem mudanças de conteúdo, layout, rotas ou lógica.