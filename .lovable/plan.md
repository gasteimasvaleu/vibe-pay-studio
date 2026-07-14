## Objetivo
Deixar todo o fluxo de onboarding do creator em **tema claro** com background `#FFFFFF`, ajustando cores de textos, botões e do loader do KYC para manter contraste e legibilidade.

## Escopo (somente frontend/apresentação)

### 1. `src/components/onboarding/OnboardingShell.tsx` (shell compartilhado)
- Trocar wrapper: `bg-white text-neutral-900` no lugar de `#0b0713` + `text-white`.
- Remover as camadas de fundo escuras: gradient radial e o pattern de pontos brancos.
- Header: fundo `bg-white/80` com `backdrop-blur`, borda `border-neutral-200`, título `text-neutral-900`, botão voltar com hover `bg-neutral-100` e ícone `text-neutral-700`.
- Barra de progresso: trilho `bg-neutral-200`, preenchimento mantém gradiente fúcsia/roxo (contraste ok em branco).

### 2. Páginas de onboarding (ajustes de cor de texto/botão)
Nos arquivos abaixo, substituir tokens escuros (`text-white`, `text-white/60`, `text-white/80`, `bg-white/5`, `border-white/10`, `bg-black/…`) por equivalentes claros (`text-neutral-900`, `text-neutral-600`, `bg-neutral-50`, `border-neutral-200`, etc.) e garantir que botões primários (fúcsia/roxo) tenham texto branco:
- `src/routes/_authenticated/creator.onboarding.assinatura.tsx`
- `src/routes/_authenticated/creator.onboarding.redes-sociais.tsx`
- `src/routes/_authenticated/creator.onboarding.documentos.index.tsx`
- `src/routes/_authenticated/creator.onboarding.documentos.aprovado.tsx`
- `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx`

Cards informativos (blocos de "Privacidade", "Segurança", listas de destaque, resumo de preços simulados) passam para superfícies claras: `bg-neutral-50` com `border-neutral-200`, ícones mantendo o roxo/fúcsia da marca, texto principal em `text-neutral-900` e secundário em `text-neutral-600`.

### 3. Loading do KYC (background da página de loading)
Em `creator.onboarding.documentos.verificando.tsx` e no `pendingComponent` do `aprovado.tsx`:
- Como o `OnboardingShell` já será branco, o loader herda fundo `#FFFFFF`.
- Ajustar textos abaixo do `GooeyLoader` de `text-white/90` e `text-white/60` para `text-neutral-900` e `text-neutral-600`.
- Manter o `GooeyLoader` como está (SVG); apenas garantir que a `className` de cor (`text-[14px]`) não conflite com o novo fundo — se o gooey usar `currentColor` claro, trocar para uma cor da marca (ex.: `text-fuchsia-600`) para visibilidade sobre branco.

### 4. Não alterar
- Nenhuma lógica de negócio, server functions, validações, navegação ou dados.
- Nenhuma outra rota fora do fluxo `/creator/onboarding/*`.
- Dashboard, feed e demais telas permanecem no tema escuro atual.

## Verificação
- `bun run build:dev` para garantir tipos e build.
- Conferência visual das 5 páginas de onboarding + estado de loading do KYC.
