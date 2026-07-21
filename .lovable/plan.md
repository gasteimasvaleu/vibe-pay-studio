## Problema
O header da rota `/vault` está visualmente fora do padrão do restante do app:
- O título "ACERVO" usa `text-xl font-semibold tracking-wide`, enquanto as demais páginas (ex: `/banco`, `/mywallet`, `/follow`, `/publicacoes-agendadas`) usam `text-lg font-bold tracking-tight`.
- O header usa `bg-card` sem efeito de vidro e não é `sticky`, diferente do padrão `sticky top-0 bg-background/90 backdrop-blur` adotado nas outras telas.

## Plano
1. **Padronizar o container do header** em `src/routes/_authenticated/vault.tsx`:
   - Alterar `header` para `sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur`.
   - Manter o grid de duas colunas em desktop, mas garantir que o fundo e a fixação acompanhem o padrão.

2. **Corrigir a tipografia do título principal**:
   - Trocar `text-xl font-semibold tracking-wide` por `text-lg font-bold tracking-tight` no `<h1>ACERVO</h1>`.

3. **Padronizar o título da coluna direita**:
   - O `<h2>` que mostra o nome da aba/categoria (ex: "TODAS AS MÍDIAS") também usa `text-lg font-semibold tracking-wide`; ajustar para `text-lg font-bold tracking-tight` para manter consistência com os títulos de outras páginas.

4. **Verificar e ajustar contraste no tema escuro**:
   - Confirmar que `text-foreground` permanece e que o fundo translúcido funciona tanto no tema claro quanto no escuro.

5. **Validar visualmente**:
   - Após a alteração, verificar no preview se o header da `/vault` agora segue o mesmo padrão de fonte, peso, tracking, fixação e fundo das demais páginas.

## Escopo
Apenas ajustes visuais/tipográficos no header de `src/routes/_authenticated/vault.tsx`. Nenhuma funcionalidade de negócio será alterada.