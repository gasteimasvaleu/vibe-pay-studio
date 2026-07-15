## Objetivo
Diminuir o excesso de border-radius em botões de todo o site, eliminando o formato "pílula" (`rounded-full`) em botões e mantendo cantos mais contidos.

## Escopo
- Botões primários, secundários, de ação, CTA, submit e toggles que hoje usam `rounded-full`.
- Manter `rounded-full` apenas em elementos legítimamente circulares: avatares, dots de status, badges, ícones circulares e spinners.

## Abordagem
1. **Token global**: reduzir `--radius` de `1rem` para `0.75rem` em `src/styles.css`, o que afeta `rounded-md`/`rounded-lg`/`rounded-xl` em todo o sistema.
2. **Componente base**: o `Button` do shadcn já usa `rounded-md`; mantê-lo.
3. **Varredura de botões**: trocar `rounded-full` por `rounded-md` ou `rounded-lg` nos botões customizados encontrados em:
   - `src/routes/entrar.tsx`, `src/routes/cadastro.tsx`, `src/routes/sobre.tsx`, `src/routes/como-funciona.tsx`
   - `src/routes/_authenticated/profile.$username.tsx`, `src/routes/_authenticated/perfil.$username.tsx`, `src/routes/_authenticated/promotion.tsx`
   - `src/routes/_authenticated/settings.*` (vários arquivos de configurações)
   - `src/routes/_authenticated/mywallet.*`, `src/routes/_authenticated/vault.tsx`, `src/routes/_authenticated/banco.tsx`
   - `src/routes/_authenticated/criar-perfil-gratuito.tsx`, `src/routes/_authenticated/creator.onboarding.*`
   - `src/components/feed/PublicationCard.tsx` (botões de tier e overlay)
   - `src/components/feed/PublicationOptionsMenu.tsx`
   - Outros botões localizados com a mesma busca.
4. **Exceções preservadas**: avatares (`Avatar`), ícones circulares de ação (ex: botões de fechar em lightbox), badges e indicadores continuam com `rounded-full`.

## Critério de aceitação
- Nenhum botão de ação principal ou secundário deve usar `rounded-full`.
- O visual fica mais enxuto, com cantos arredondados moderados (`rounded-md`/`rounded-lg`).
- Build e preview continuam funcionando sem regressões visuais em elementos que devem permanecer circulares.

## Não inclui
- Mudança de cores, sombras, tipografia ou comportamento dos botões.
- Alteração em componentes não-botão (cards, inputs, modais) — salvo o efeito colateral esperado do `--radius` global.