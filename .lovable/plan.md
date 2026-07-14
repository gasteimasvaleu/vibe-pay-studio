## Objetivo
Alterar o background do header da página de perfil (`/src/routes/_authenticated/perfil.$username.tsx`) para `#FFFFFF` e deixar o texto e elementos internos (título, ícones de voltar e menu) na cor preta.

## Elemento alvo
- Arquivo: `src/routes/_authenticated/perfil.$username.tsx`
- Linha aproximada: 177
- Elemento: `<header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20">`

## Alterações propostas
1. Substituir `bg-black/20` por `bg-white` no header.
2. Substituir `border-white/10` por `border-black/10` para manter a separação sutil com a nova cor de fundo.
3. Aplicar `text-black` no container interno (`<div className="max-w-3xl ...">`) para herdar cor preta nos elementos filhos.
4. Atualizar as classes dos botões de navegação para refletir o tema claro:
   - Trocar `text-white/80` por `text-black/80`.
   - Trocar `hover:bg-white/10` por `hover:bg-black/10`.
5. Manter o `backdrop-blur-md` se desejado (pode ser removido caso o fundo sólido branco seja o objetivo).

## Resultado esperado
Header com fundo branco sólido, texto e ícones pretos, mantendo o layout e comportamentos existentes (voltar, menu, título centralizado).