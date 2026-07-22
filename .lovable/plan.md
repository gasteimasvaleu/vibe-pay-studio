Problema: a página `/chat-agendamento` usa `min-h-[100svh]` no container raiz, mas o layout `_authenticated` já reserva `pb-24` (96 px) de padding inferior para a `BottomNav`. Isso faz o conteúdo ocupar 100% da viewport **mais** o padding reservado, criando um espaço em branco entre o final do conteúdo e a navbar inferior.

Plano de ajuste:

1. **Container raiz da página**
   - Substituir `min-h-[100svh]` por `h-[calc(100svh-56px-96px)]` (viewport - altura da `TopNav` - padding reservado para `BottomNav`).
   - Manter `flex flex-col` para que o conteúdo se estique corretamente.

2. **Composer (view `composer`)**
   - Substituir `min-h-[calc(100svh-56px)]` por `h-[calc(100svh-56px-96px)]` para que a grade de duas colunas ocupe exatamente o espaço útil entre as navbars.
   - Garantir que a grade (`grid`) preencha essa altura sem estourar.

3. **Coluna de filtros (`aside`)**
   - Manter `flex flex-col overflow-y-auto`.
   - Garantir que a lista de chips e o card informativo ocupem o espaço restante e o botão "Aplicar filtro" fique ancorado na parte inferior visível, sem empurrar a coluna além da altura disponível.

4. **Coluna de mensagem (`section`)**
   - Manter `flex flex-col overflow-hidden`.
   - A área de digitação deve permanecer colada na base da coluna, sem deixar espaço branco abaixo.

5. **Validação visual**
   - Verificar no preview se o espaço em branco desapareceu e se a página não apresenta scroll vertical desnecessário.
   - Confirmar que o layout continua funcionando na view `calendar` também.

Arquivos envolvidos:
- `src/routes/_authenticated/chat-agendamento.tsx`
- `src/routes/_authenticated/route.tsx` (apenas como referência do `pb-24` e da `TopNav`)