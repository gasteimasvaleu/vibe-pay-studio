# Ligar as comissões do painel ao repasse real

## O que está acontecendo hoje

O que decide quanto cai na conta do creator é um número fixo no código, não o que está salvo em Configurações do Admin.

- O repasse é calculado em `src/lib/asaas.server.ts`: comissão de 15% fixa, mais a taxa do meio de pagamento, que sai do creator.
- No banco, os 8 gatilhos de venda (publicação, story, mensagem paga, mídia do chat, ingresso de live, assinatura, gorjeta, videochamada) chamam o cálculo passando 15,00 escrito no próprio código do gatilho.
- A tela de configurações grava "Comissão nacional 15%" e "Comissão internacional 20%" numa tabela que hoje só alimenta o formulário daquela tela — nenhum cálculo lê esses valores.

Ou seja: os 15% estão valendo, mas por coincidência de o número fixo ser igual ao salvo. Editar o painel não mudaria o repasse de uma venda nova. E os 20% internacionais nunca se aplicam, porque nada no sistema marca uma venda como internacional: a coluna que guarda isso fica sempre em "falso" e o país fica sempre "BR", por mais que o país do comprador exista no cadastro dele.

## O que vamos mudar

1. **A tabela de configurações vira a única fonte dos percentuais.** Um novo cálculo no banco passa a ler os valores salvos (nacional e internacional) em vez de um número fixo.
2. **Os 8 gatilhos de venda passam a usar esse cálculo**, e a taxa que o Asaas cobra continua saindo do creator como hoje.
3. **A venda passa a saber se é internacional.** No momento da venda, gravamos o país do comprador na transação e marcamos como internacional quando o país não é Brasil. Isso dá base para os 20% existirem de verdade e faz o saldo entrar na fila certa (nacional ou internacional) — hoje tudo cai na fila nacional.
4. **O mesmo valor vale para o lado do app.** Quando o app monta a cobrança no Asaas, ele pergunta o percentual à mesma tabela, em vez de usar o número fixo. O número fixo continua como reserva se a leitura falhar.
5. **A tela de configurações deixa de ter campo decorativo.** "Taxa gateway (%)" não é usada por nenhum cálculo — as taxas do Asaas estão fixas (PIX e boleto R$ 1,99; cartão 2,99% + R$ 0,49). Vamos tirar esse campo do formulário para não dar a impressão de que dá para mudar. Os percentuais de comissão ganham um aviso simples explicando que valem para as próximas vendas.

## Como fica para você

Mudando "Comissão nacional" para 12% no painel, a venda seguinte já sai com 12% para a plataforma e 88% menos a taxa do meio de pagamento para o creator. Uma "Comissão internacional" de 20% só pesa em venda de comprador de fora do Brasil.

Vendas antigas não mudam: continuam com os 15% que foram aplicados na época, e o histórico mostra o percentual de cada uma.

## Detalhes técnicos

- Migração nova: função `platform_commission_pct(_international boolean)` (STABLE, SECURITY DEFINER, leitura de `platform_settings`); `apply_transaction_split` passa a aceitar percentual nulo e resolver pela nova função.
- Reescrever as 8 funções `*_sync_transaction`: derivar país/flag internacional do comprador (a partir de `profiles.country`), gravar `country_code` e `is_international` na transação e chamar o cálculo sem o número fixo.
- `computeCreatorNetCents(gross, method, commissionPct?)` no app: terceiro argumento opcional; chamadores em `src/lib/payments.functions.ts` e `src/lib/monetization.functions.ts` passam o percentual lido da tabela com o cliente do usuário (a leitura já é permitida a usuários logados).
- `src/routes/_authenticated/admin.settings.tsx`: remover o campo "Taxa gateway (%)" e adicionar texto de apoio nos campos de comissão.
- Efeito colateral conhecido: `transactions_apply_wallet_effects` já trata venda internacional com liberação em 15 dias; como a flag vai começar a ser preenchida, vendas de compradores de fora do Brasil passam a liberar nesse prazo, como a regra já previa.

## Como vamos conferir

- Conferir o registro de uma venda nova: percentual aplicado, comissão, taxa e valor líquido batendo com o que o painel diz.
- Mudar o percentual no painel, fazer outra venda e ver o número novo no registro.
- Fazer uma venda com perfil de país fora do Brasil e confirmar a marcação de internacional e a fila de saldo correta.
- O app é autenticado por serviço externo, então a parte de login depende de você abrir a tela; o que dá para conferir daqui é o registro das transações no banco.
