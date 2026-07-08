## Objetivo
Adaptar a página de cadastro (`/cadastro`) para suportar dois tipos de conta — **Assinante** e **Creator** — no estilo do Privacy (tabs no topo), com validação de username e regras de senha visíveis.

## Mudanças

### 1. `src/routes/cadastro.tsx` — Reestruturar formulário
- Adicionar **tabs no topo** ("Seja assinante" / "Seja creator") com estado `accountType: "subscriber" | "creator"`.
  - Tab ativa: fundo lilás claro (`bg-primary/10`), texto roxo.
  - Tab inativa: transparente, texto cinza.
  - Container arredondado (`rounded-full`) com borda sutil.
- **Copy dinâmica** por tab:
  - Assinante: "Crie sua conta e tenha acesso a conteúdos exclusivos dos seus criadores favoritos!"
  - Creator: "Publique, se relacione com sua comunidade e comece a faturar."
- **Campos**: Nome de usuário, E-mail, Senha (remover "Confirmar senha" — não aparece na referência).
- **Username com validação/limites** (compatível com login Google, onde nome pode vir longo/com espaços):
  - Regex: `^[a-zA-Z0-9_]+$` (letras, números, underscore)
  - `minLength={3}`, `maxLength={20}`
  - Contador de caracteres opcional abaixo do input
  - Auto-strip de espaços/caracteres inválidos no `onChange`
- **Checklist de regras de senha** (com ícone de check que fica roxo quando cumprido):
  - Mínimo de 8 caracteres
  - Pelo menos um número
  - Pelo menos uma letra minúscula e uma maiúscula
  - Pelo menos um caractere especial
  - Estado derivado da senha digitada em tempo real.
- **Checkbox de termos** mantido (18+, Termos, Privacidade).
- **Botão "Confirmar"** com `bg-gradient-primary`, arredondado full (já está).
- Enviar `accountType` no submit (apenas armazenar no state por enquanto — sem backend).

### 2. Google login — limite de username
- Ao "Continuar com Google" (placeholder atual), após autenticação real, o username derivado do email/nome do Google deverá passar pelo mesmo sanitizador (`sanitizeUsername`): lowercase, remover não-alfanuméricos, truncar a 20 chars.
- Extrair helper `sanitizeUsername(input: string): string` em `src/lib/utils.ts` para ser reutilizado no fluxo Google futuramente e no `onChange` do input.

### 3. `src/routes/entrar.tsx`
- Sem mudanças estruturais (login é único para ambos os tipos). Manter como está.

## Fora de escopo
- Backend / persistência (Lovable Cloud não está ativado nesta iteração).
- Fluxo OAuth real do Google (permanece como botão visual).
- Página pós-cadastro diferenciada por tipo de conta.

## Detalhes técnicos
- Tema mantido: branco + roxo claro + cinza claro (tokens semânticos existentes em `src/styles.css`).
- Sem novas dependências.
- Componentes locais na própria rota (`Field`, `PasswordRules`, `AccountTypeTabs`).
