# Conteúdo pago com cartão só libera após reload

## O que está acontecendo (confirmado nos dados)

O pagamento com cartão é aprovado na Asaas imediatamente, mas quem realmente
libera o conteúdo no app é a **reconciliação** (marcar `publication_unlocks`,
`subscriptions`, `story_unlocks` etc. como pagos). Consultando os últimos
pagamentos com cartão, essa reconciliação chegou pelo webhook em **~5 a 7
segundos** depois da cobrança (dois pagamentos de hoje: 4,6s e 6,9s).

Do lado do app:

- No caminho de **cartão salvo (1 clique)**, quando a Asaas confirma na hora
  (`paidImmediately`), o app mostra "desbloqueado!" e já começa a recarregar as
  telas — mas o servidor ainda não reconciliou. A janela de recarga é de
  ~6 segundos (5 tentativas a cada 1,2s), então ela termina antes ou junto com a
  reconciliação e o conteúdo continua bloqueado até o usuário recarregar.
- No caminho de cartão com acompanhamento na tela de processamento, o app
  considera "pago" apenas pelo status da Asaas, sem confirmar que a liberação já
  foi gravada no banco.

O PIX sofre menos porque o usuário fica alguns segundos na tela do QR Code,
dando tempo da reconciliação acontecer antes do fechamento.

## O que será feito

### 1. Esperar a confirmação real de liberação
Criar um utilitário de cliente que fica consultando o status do pagamento até o
servidor marcar a intenção como **processada** (esse mesmo endpoint já dispara a
reconciliação quando percebe que a Asaas confirmou). Limite de ~40 segundos com
consultas a cada 2 segundos, e encerramento seguro caso estoure o tempo.

### 2. Aplicar essa espera em todos os fluxos de cartão em 1 clique
Nos 8 pontos que hoje tratam `paidImmediately` — feed, stories, perfil, chat
(2 pontos), mimos, assinatura e ingresso de live — o app passa a:
mostrar "Confirmando pagamento…", aguardar a liberação confirmada e só então
recarregar as telas e mostrar o sucesso.

### 3. Tela de processamento do cartão
A etapa "Pagamento com cartão" só conclui quando a liberação estiver confirmada
no servidor, com um passo visível "Liberando conteúdo". Se estourar o tempo, a
mensagem deixa claro que o pagamento foi aprovado e a liberação está a caminho.

### 4. Janela de recarga mais tolerante
Aumentar o padrão da recarga pós-pagamento de 5 tentativas/1,2s para
8 tentativas/1,5s, cobrindo com folga o tempo de reconciliação observado.

## Escopo técnico

- Novo: `src/lib/wait-for-payment.ts` (polling de `getPaymentIntentStatus` até
  `processedAt`).
- Ajuste: `src/lib/refresh-after-payment.ts` (tentativas/intervalo padrão).
- Ajuste: `src/components/payments/CardProcessingStep.tsx` (concluir por
  `processedAt`, não só pelo status da Asaas).
- Ajuste nos ramos `paidImmediately`: `feed.tsx`, `StoryViewer.tsx`,
  `perfil.$username.tsx`, `chat.$threadId.tsx`, `TipDialog.tsx`,
  `SubscribeDialog.tsx`, `LiveTicketDialog.tsx`.
- Sem mudanças de banco, de RLS ou na integração com a Asaas.
