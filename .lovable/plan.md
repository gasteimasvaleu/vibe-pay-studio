# Assinaturas: o que existe hoje e como deixar sem renovação automática

## Resposta às suas perguntas

**1. A assinatura renova sozinha?**
Hoje, na maioria dos casos, não renova. Mas existe uma exceção no app:
- Pix, boleto ou cartão digitado na hora: vale só pelo ciclo escolhido (mensal, trimestral ou semestral). Perto do vencimento o fã recebe um lembrete por e-mail e paga de novo se quiser.
- **Cartão salvo:** o app cria uma cobrança recorrente no Asaas, e a assinatura **renova sozinha**.
- Na tela "Minhas assinaturas" existe o botão **"Reativar renovação automática"**, que liga a recorrência.
- No banco, hoje nenhuma assinatura está com renovação automática ligada.

**2. O que o assinante ganha hoje?**
Pouca coisa:
- Responder os stories do creator pelo chat. Só assinante consegue.
- Nenhum acesso extra a posts. Os posts não são liberados pela assinatura.

**3. Assinei e o creator publicou algo pago. Tenho que pagar?**
Sim. Post pago (e desafio) só libera para quem pagou por ele, mesmo para assinante.

**4. Assinante vê os posts não pagos?**
Sim.

**5. Quem não é assinante também vê os posts não pagos?**
Sim, qualquer pessoa logada vê os posts não pagos. Hoje não existe "post só para assinantes". Stories grátis também aparecem para todos.

## O que vou mudar (para garantir que nunca renove sozinha)
1. Ao assinar com cartão salvo, deixar de criar a cobrança recorrente no Asaas. A assinatura passa a valer só pelo ciclo pago, como no Pix.
2. Tirar o botão "Reativar renovação automática" da tela "Minhas assinaturas" e desligar essa função no servidor.
3. Manter o lembrete por e-mail antes do vencimento e o botão de renovar manualmente.
4. Ajustar os textos que falam em "renovação automática", como a descrição do e-mail de cobrança Pix.
5. Conferir no banco se ainda existe alguma cobrança recorrente ativa no Asaas e cancelar, se houver. Hoje nenhuma aparece ligada.

Não vou mexer no que o assinante vê. Se quiser que a assinatura libere posts (por exemplo "posts só para assinantes"), isso fica para um plano separado.

## Detalhes técnicos
- `src/lib/payments.functions.ts` (createSubscriptionPayment): remover o bloco `createAsaasSubscription`; sempre `auto_renew: false`, `asaas_subscription_id: null`.
- `src/lib/monetization.functions.ts`: `reactivateSubscription` passa a recusar com erro.
- `src/routes/_authenticated/subscriptions.tsx`: remover o botão e o diálogo de reativar.
- Webhook `asaas.ts`: manter o tratamento de assinaturas recorrentes antigas para não quebrar cobranças em andamento.
- `email-templates.meta.ts`: ajustar o texto.
- Teste: um teste que garante que `auto_renew` é sempre false ao criar a assinatura.
