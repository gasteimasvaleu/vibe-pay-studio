# Tela branca em `/perfil/monetisexy`

## Diagnóstico

Testei a rota logado como dono e o loader/componente renderizam normalmente (~28 KB de HTML, título correto). Isso indica que o problema aparece só quando o visitante **não** é o dono do perfil (caso reportado: `sexandoapp7` vendo `monetisexy`).

Dois pontos suspeitos:

1. **`errorComponent` invisível no tema claro.** Em `src/routes/_authenticated/perfil.$username.tsx` (linhas 229–233) o fallback de erro usa `bg-background text-white`. No tema claro, `bg-background` é praticamente branco → o texto branco fica invisível. Se o loader lançar qualquer erro para o visitante, o usuário vê uma tela "totalmente branca" mesmo com o boundary renderizado.
2. **Erro real no loader para não-donos.** Ainda não confirmei a causa; preciso reproduzir logado como assinante para capturar a exceção.

## Passos

1. **Instrumentar e reproduzir**
   - Logar no preview como `sexandoapp7@hotmail.com`, abrir `/perfil/monetisexy` e capturar o erro (console + `stack_modern--server-function-logs`).
   - Confirmar se vem do loader (query em `subscriptions`/`follows`/`promotions`/RPC `count_author_media`) ou de algum `useServerFn` no render (`getLastSeen`, `isMuted`, `isFriend`, `useCreatorActiveLive`).

2. **Corrigir o `errorComponent` do perfil**
   - Trocar `bg-background text-white` por tokens que funcionem em ambos os temas (`bg-background text-foreground` + borda/card), garantindo que qualquer erro futuro seja legível.
   - Incluir botão "Voltar" e "Tentar novamente" (`router.invalidate()` + `reset()`).

3. **Corrigir a causa raiz** (depois de identificada no passo 1)
   - Ajuste pontual no loader ou nos hooks conforme o stack (ex.: guardar contra `profile.user_id` ausente, tratar retorno da RPC, tornar `getLastSeen` tolerante quando o alvo não tem linha em `profiles`, etc.).

4. **Verificar**
   - Recarregar `/perfil/monetisexy` como `sexandoapp7` e confirmar render normal com dados do perfil, contadores e badge de presença.

## Detalhes técnicos

- Arquivo principal: `src/routes/_authenticated/perfil.$username.tsx` (loader linhas 67–223, errorComponent 229–233, hooks de presença 373–392).
- Server fns envolvidas: `getLastSeen` (`src/lib/presence.functions.ts`), `isMuted`, `isFriend`, `getUserPublications`.
- Sem migração de banco prevista; correção fica em frontend + eventual guarda numa server fn.
