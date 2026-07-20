## Problema
A imagem dentro do `HeroCard` não está visualmente centralizada; o espaço do lado direito está maior, indicando que o crop (`object-cover`) ou o posicionamento da ilustração está desequilibrado no container.

## Diagnóstico
- O componente renderiza a imagem com `w-full flex-1 min-h-0 object-cover`.
- `object-cover` corta a imagem para preencher o container, mas se a ilustração não tiver foco central, o crop pode parecer deslocado.
- O card não possui padding interno na área da imagem, então a imagem cola nas bordas arredondadas.

## Plano de ação
1. **Verificar o asset** `src/assets/hero-illustration.jpg` para confirmar se o conteúdo visual está centralizado ou se o arquivo possui margem maior à direita.
2. **Ajustar o layout do `HeroCard`** para garantir centralização visual:
   - Envolver a `<img>` em um container interno com padding simétrico (`px-6` ou similar) para que a imagem fique centralizada dentro do card.
   - Alterar de `object-cover` para `object-contain` (com fundo branco) OU manter `object-cover` e garantir `object-center` com um wrapper que force proporção e centralização.
   - Garantir que o container da imagem use `flex-1`, `overflow-hidden` e `rounded` para respeitar as bordas do card.
3. **Testar responsivamente** em `/cadastro` (onde `fullHeight=true`) e na página inicial (onde o card é quadrado) para garantir que a centralização funcione nos dois casos sem distorcer o layout.
4. **Validar** via preview/screenshot que o espaçamento lateral ficou simétrico.

## Arquivos envolvidos
- `src/components/site/HeroCard.tsx`
- `src/assets/hero-illustration.jpg` (apenas inspeção visual)
- `src/routes/cadastro.tsx` (contexto de uso fullHeight)
- `src/routes/index.tsx` (contexto de uso quadrado)

## Resultado esperado
Imagem centralizada com espaçamento igual dos dois lados dentro do card promocional, tanto na página inicial quanto na página de cadastro.