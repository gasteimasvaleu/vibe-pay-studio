## Objetivo

Permitir que quem assiste a live envie mimos (gorjetas) ao criador, através de um botão flutuante redondo, no mesmo padrão visual do botão de voltar, alinhado à direita e logo abaixo do contador de pessoas presentes.

## O que será feito

**Arquivo:** `src/routes/_authenticated/live/$liveId/index.tsx` (tela do espectador)

1. **Botão flutuante (mobile)**
   - Ícone de presente (`Gift`), círculo `h-9 w-9`, `rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/60` — exatamente o mesmo estilo do botão "Voltar" já existente.
   - Posicionado à direita (`right: 0.75rem`), na mesma altura vertical do botão de voltar (`top: calc(env(safe-area-inset-top) + 3.5rem)`), ou seja, imediatamente abaixo do contador de espectadores do overlay superior.
   - `aria-label="Enviar mimo"` para acessibilidade.

2. **Botão no desktop**
   - Mesmo botão redondo, flutuante sobre o player (canto superior direito da área de vídeo, abaixo do overlay com o contador), mantendo o padrão circular.

3. **Diálogo de cobrança padrão**
   - Reutilizar o componente existente `TipDialog` (`@/components/payments/TipDialog`), que já traz presets de valor, mensagem opcional e o seletor de método (PIX / cartão salvo / novo cartão / carteira).
   - Passar `creatorId={live.creatorId}` e `creatorName={live.creator.displayName ?? live.creator.username}`.

4. **Regras de exibição**
   - O botão só aparece quando a live está no ar e o espectador tem acesso (`live.canWatch` e `status !== "ended"`), e nunca para o próprio dono (que é redirecionado para a rota de transmissão).

5. **Atualização após o pagamento**
   - Ao concluir o mimo, invalidar as queries do painel "Top apoiadores" (`LiveDonorsPanel`) e da live, para que o apoiador apareça imediatamente sem recarregar a página.

## Detalhes técnicos

- `TipDialog` já registra a transação como `tip` via `createTipPayment`, incluindo fluxo 1-click com cartão salvo e polling de confirmação — nenhuma mudança de backend é necessária.
- Nenhuma migração de banco: os mimos já são gravados e o painel de doadores da live já lê essas transações.
