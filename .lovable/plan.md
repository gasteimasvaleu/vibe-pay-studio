## Objetivo
Reestilizar o botão de alternância de perfil gratuito (footer do `ProfileHeaderCard`) para que fique dentro de um card interno com background branco e a mesma borda arredondada do card de perfil, mantendo a aparência e comportamento de botão, conforme screenshot de referência.

## Contexto atual
- O componente `ProfileHeaderCard` recebe um `footer` que é renderizado dentro da `<section>` principal do card.
- Em `DashboardShell.tsx`, o `footer` é um `<button>` com fundo bege (`bg-[hsl(38_60%_94%)]`), borda superior `border-t` e sem margem interna, ocupando toda a largura do card.
- O screenshot mostra um botão arredondado, com fundo claro/bege, avatar pequeno, texto e ícone de setas, aparentemente como um sub-card dentro do card de perfil.

## Mudanças propostas
1. **Em `src/components/dashboard/DashboardShell.tsx`**:
   - Envolver o `<button>` de switch em um container que simule um card interno: `rounded-2xl border bg-white shadow-sm` (mesma borda do card de perfil).
   - Adicionar margem interna (`mx-5 mb-5`) para que o sub-card fique dentro do card de perfil com respiro.
   - Ajustar o `<button>` interno para ter `rounded-2xl` (ou `rounded-xl`), `bg-white` (ou manter o tom bege do screenshot, a decidir), `w-full`, `px-4 py-3`, e estados de hover/active para parecer um botão clicável.
   - Manter avatar, spinner, label e ícone `ArrowLeftRight` exatamente como estão.
   - Preservar `disabled` e `loading`.

2. **Em `src/components/dashboard/ProfileHeaderCard.tsx`**:
   - Verificar se a estrutura do card principal (`rounded-2xl border bg-card shadow-[var(--shadow-card)]`) permite o sub-card encaixar visualmente.
   - Se necessário, ajustar o padding inferior da área do corpo para evitar colisão com o novo sub-card.

## Critérios de aceitação
- O botão de perfil gratuito aparece como um card arredondado dentro do card de perfil.
- Background branco (ou tom claro conforme screenshot) e borda visível.
- Comportamento de botão mantido: hover, cursor pointer, disabled/loading.
- Texto e ícone preservados.
- Sem regressões no layout do card de perfil.

## Arquivos envolvidos
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/ProfileHeaderCard.tsx` (possível ajuste de espaçamento)