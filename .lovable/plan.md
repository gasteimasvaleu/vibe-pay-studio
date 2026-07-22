## Problema
O botão **Preço** no dialog de mensagem em massa (`BroadcastDialog`) usa `window.prompt` nativo. O browser exibe o hostname da página no título do prompt — no preview do Lovable aparece `ccce3d77-...lovableproject.com`. Isso quebra a identidade da marca e parece pouco profissional.

## Resposta sobre o domínio
- **Preview/editor**: o app roda no domínio do Lovable (`*.lovableproject.com`), por isso o prompt mostra esse endereço.
- **Produção/publicado**: o app já está no domínio próprio (`monetisexy.com` / `www.monetisexy.com`), então o prompt mostraria esse domínio.
- **Recomendação**: independente do domínio, o ideal é não usar `window.prompt`. Substituir por um dialog customizado do próprio app elimina a exposição do hostname e padroniza a UX.

## O que será feito
1. **Generalizar `PriceDialog`**
   - Adicionar props opcionais: `title`, `description`, `allowZero`.
   - Quando `allowZero` for true, permitir confirmar com valor `0` (ou "Remover preço").
   - Manter o comportamento atual como padrão para não quebrar os outros usos.

2. **Substituir o prompt no broadcast**
   - Em `BroadcastDialog`, trocar o `window.prompt` pelo componente `PriceDialog`.
   - Usar título/descrição específicos para mensagem em massa.
   - Permitir valor zero, já que o broadcast pode ser gratuito ou pago (somente quando houver mídia).

3. **Validação do broadcast**
   - Manter a regra existente: preço só é permitido quando há mídia anexada.
   - O botão "Preço" continua mostrando o valor formatado ou o label "Preço".

## Arquivos envolvidos
- `src/components/chat/PriceDialog.tsx` — generalizar props e validação.
- `src/components/chat/BroadcastDialog.tsx` — substituir `window.prompt` por `PriceDialog`.

## Resultado esperado
- O dialog de preço do broadcast terá o mesmo visual dos outros dialogs do app.
- Nenhum hostname será exibido ao definir o preço.
- A experiência fica consistente no preview e no domínio próprio.