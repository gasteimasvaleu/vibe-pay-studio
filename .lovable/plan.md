Reconstruir o componente GooeyLoader fornecido (o código colado está incompleto) e usar ele como estado de carregamento da tela `/creator/onboarding/documentos/verificando`, com cores no roxo padrão do app.

O que será feito:
1. Criar `src/components/onboarding/GooeyLoader.tsx` com o efeito "gooey" real: filtro SVG (`feGaussianBlur` + `feColorMatrix`) e duas bolas animadas que se movem e se fundem. Usar a cor primária roxa do app (`--primary`, que no tema atual é `oklch(0.72 0.13 300)`) para as bolas, garantindo consistência com o onboarding.
2. Alterar `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx` para, enquanto `status === "processing"`, renderizar uma tela de loading dedicada em vez do banner atual. Essa tela vai usar o `GooeyLoader` centralizado, manter o fundo escuro do `OnboardingShell` e exibir a mensagem embaixo: "Verificação de identidade em andamento. Isso pode demorar alguns minutos.".
3. Preservar os estados finais (`verified`, `requires_input`, `canceled`) exatamente como estão — só o estado intermediário de "processando" muda de UX.
4. Verificar o build após as alterações.

Não haverá mudanças no backend, server functions, schema ou roteamento.