## Objetivo

Substituir a tela genérica de "Perfil não encontrado" (mostrada quando um assinante tenta acessar `/perfil/$username` de uma conta que não é creator) por uma tela de bloqueio mais rica, com um card convidando o usuário a criar um perfil como creator para desbloquear o acesso à página individual de perfil.

## Alteração

Em `src/routes/_authenticated/perfil.$username.tsx`, substituir o `notFoundComponent` atual (linhas 117–126) por uma tela com:

- Topbar simples com botão "Voltar" (usa `router.history.back()`).
- Card central destacado contendo:
  - Ícone (ex.: `Lock` ou `Sparkles` do lucide-react) em círculo com gradiente fúcsia/roxo, alinhado ao estilo visual do app.
  - Título: "Perfil disponível apenas para creators".
  - Descrição curta: explica que a página individual de perfil é exclusiva de contas creator, e que ao virar creator o próprio usuário também ganha sua página pública.
  - Lista de 2–3 benefícios rápidos (ícones + texto): monetizar conteúdo, receber assinaturas, aparecer no feed com perfil próprio.
  - Botão primário (gradiente fúcsia→roxo, arredondado): "Criar perfil de creator" → navega para `/creator/onboarding/assinatura` (primeira etapa existente do onboarding creator).
  - Link secundário discreto: "Voltar ao feed" → `/feed`.

Visual: fundo com o mesmo gradiente radial já usado no restante da página (`bg-background` + `--gradient-radial`), card em `bg-card` com borda `border-primary/30`, arredondado `rounded-3xl`, sombra suave. Usa apenas tokens semânticos existentes.

## Fora de escopo

- Nenhuma mudança na lógica de `beforeLoad` — a checagem `account_type !== 'creator'` continua lançando `notFound()`.
- Sem alteração em rotas, backend, ou fluxo de onboarding.
- Sem mudanças nas telas de perfil próprias (`/profile/$username`) ou em outras páginas.
