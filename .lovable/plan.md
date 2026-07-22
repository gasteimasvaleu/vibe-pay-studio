## Diagnóstico

Na rota `/_authenticated` (`route.tsx`), o wrapper usa `pb-24` para reservar espaço para a `BottomNav` fixa. Dentro dela, o layout do chat (`src/routes/_authenticated/chat.tsx`) tem dois problemas:

1. **Faixa branca embaixo (entre composer e BottomNav):** o grid do chat usa `min-h-svh` (100vh), mas fica dentro de um wrapper com `pb-24` (96px). Resultado: o painel do chat ocupa 100vh, empurrando conteúdo, e o `pb-24` mostra o fundo branco (`bg-background`) por baixo — a "faixinha" visível acima da BottomNav.
2. **Faixas brancas nas laterais:** o grid é `max-w-6xl mx-auto`, então em telas largas o `bg-background` do wrapper (que é branco no tema claro) aparece nas laterais da sidebar e da conversa.

O TopNav tem 64px (`h-16`) e o `pb-24` reserva 96px pra BottomNav — ou seja, o chat deveria caber em `100svh - 64px - 96px`.

## Alterações — só o layout do chat

**`src/routes/_authenticated/chat.tsx`** (linhas 142-232):

- Trocar `min-h-svh` do wrapper e do grid por altura calculada que respeita TopNav + BottomNav: `h-[calc(100svh-10rem)]` (64px topnav + 96px bottomnav = 160px = 10rem).
- Remover `max-w-6xl mx-auto` para que sidebar + conversa ocupem a largura toda (sem faixa branca lateral). Aumentar a sidebar para `md:grid-cols-[360px_1fr]` mantendo proporção agradável.
- Ajustar `<section>` do outlet: trocar `min-h-svh` por `h-full min-h-0` (para o scroll interno do chat funcionar dentro do container de altura fixa).

**`src/routes/_authenticated/chat.$threadId.tsx`** (linha 265):

- Trocar `min-h-[100svh]` por `h-full min-h-0` no wrapper interno da conversa, já que a altura agora é controlada pelo layout pai.

## Escopo

Apenas as duas rotas de chat acima. Não mexo em outras páginas — se o mesmo padrão aparecer em outras rotas (o usuário mencionou "já tinha visto em algumas outras"), posso corrigi-las depois, quando ele apontar quais.
