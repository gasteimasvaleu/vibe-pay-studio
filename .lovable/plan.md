## Objetivo
Substituir o card de login atual (branco/simples) por um card premium com efeitos: glassmorphism escuro roxo, tilt 3D no mouse, feixes de luz animados nas bordas, glow, inputs com ícones, toggle de senha, "Remember me", divisor "or" e botão "Sign in with Google".

## Adaptações ao stack (Next → TanStack Start)
- Trocar `next/link` por `Link` de `@tanstack/react-router`.
- Remover `'use client'`.
- Manter textos em português (padrão atual do projeto): "Entrar", "Bem-vindo de volta.", "E-mail", "Senha", "Lembrar-me", "Esqueceu a senha?", "ou", "Entrar com Google", "Não tem conta? Cadastre-se".
- Usar `Input` do shadcn já existente (`@/components/ui/input`) em vez do wrapper redeclarado.
- Instalar `framer-motion` (se ainda não estiver instalado) via `bun add framer-motion`.
- Ícones do `lucide-react` já disponível.

## Escopo da mudança
- Arquivo único: `src/routes/index.tsx`.
- Substituir apenas o bloco do card de login (coluna esquerda do hero — `div` na linha 16). **Não** alterar a seção da imagem à direita nem o `SiteLayout`.
- Como o novo card é escuro/roxo por design (glass + glow), ele fica isolado dentro da área branca do hero — o fundo da página permanece branco conforme sua preferência anterior. Só o card em si tem o visual escuro com glow.

## Detalhes técnicos
- Estados locais: `showPassword`, `email`, `password`, `isLoading`, `focusedInput`, `rememberMe`.
- `useMotionValue` + `useTransform` para rotação 3D (`rotateX`/`rotateY` faixa ±10°) baseada em `onMouseMove` no container do card.
- `AnimatePresence` para highlight dos inputs em foco e spinner de loading.
- 4 feixes animados (top/right/bottom/left) via `motion.div` com `animate` em loop.
- `handleSubmit` mantém stub (setTimeout 2s) — sem lógica de auth real, apenas UX (você não pediu backend).
- Preservar estrutura semântica: `<h2>` como título, `<form>` com labels acessíveis.

## Verificação
- `bun run build` e screenshot via Playwright para confirmar o card renderiza com tilt/glow e o restante do hero permanece intacto.
