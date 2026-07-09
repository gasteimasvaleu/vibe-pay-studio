## Problema
A página `/perfil/$username` usa `max-w-3xl mx-auto` como largura dos cards. A `/feed` usa um grid de 3 colunas (`220px + 1fr + 300px`) dentro de `max-w-[1400px]`, então os cards do meio ficam com largura diferente (e desalinhados visualmente com o perfil).

## Mudança em `src/routes/_authenticated/feed.tsx`
1. Trocar o container do conteúdo para o mesmo shape do perfil:
   - De: `max-w-[1400px] ... grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-8`
   - Para: `max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6` (idêntico ao perfil)
2. Remover a `<aside>` da sidebar esquerda e a `<aside>` do right rail — não cabem no layout single-column de 3xl e não são o que o usuário quer nesta tela.
3. Ajustar o header topo para também usar `max-w-3xl` (hoje é `max-w-[1400px]`), para que a barra superior fique alinhada com os cards, igual ao perfil.
4. Manter conteúdo do main intacto: card de boas-vindas ("Olá, @username") e card de estado vazio ("Seu feed ainda está vazio") — mesmas classes, só mudam de container.

## Fora de escopo
- Estilo interno dos cards, cores, animações, textos.
- Rotas, auth, dados.
- Página de perfil (não é alterada).
