# Plano: deixar claro que saque está aguardando autorização da Asaas

## O que será feito

Ajustar a experiência do saque para que o creator veja, de forma clara, que o PIX já foi solicitado e está aguardando a autorização manual no painel Asaas. Também deixar o status do saque mais preciso no banco e no painel do creator.

## Como ficará para o usuário

- Ao solicitar saque, o creator vê uma mensagem como:  
  _"Saque de R$ X,XX solicitado. A transferência PIX está aguardando autorização no painel Asaas e será enviada em breve."_
- Na lista de saques do Meu Banco, saques nesse estado aparecem com status "Aguardando autorização Asaas" (em vez de apenas "Processando" ou "Solicitado").
- O admin (você) continua autorizando normalmente no painel Asaas; o app só passa a refletir esse estado de forma mais transparente.

## Onde mexer

- `src/lib/payouts.functions.ts`
  - Quando a transferência Asaas retorna `PENDING`, gravar o status no banco como algo que indique "aguardando autorização Asaas".
  - Garantir que o retorno da função inclua essa informação para o frontend.
- `src/components/banco/SacarDialog.tsx`
  - Atualizar a mensagem de sucesso para deixar explícito que o PIX está aguardando autorização da Asaas.
- `src/routes/_authenticated/banco.tsx`
  - Na lista de saques, mostrar o novo status traduzido quando a transferência está pendente de autorização Asaas.
  - Opcionalmente, mostrar um tooltip/linha explicando o que falta acontecer.

## Dados e regras

- O status atual no banco é `requested`. A proposta é manter `requested` como status interno, mas adicionar um campo novo ou usar metadados para indicar que a transferência Asaas já foi criada e está `PENDING`.
- Alternativa simples: usar `provider_ref` preenchido + `status = requested` para inferir "PIX criado na Asaas, aguardando autorização".
- Nenhuma mudança na lógica de saldo: o valor continua sendo debitado no momento do saque, como já acontece hoje.

## Fora do escopo

- Não criaremos uma tela de aprovação interna no app; a autorização continua sendo feita diretamente no painel Asaas.
- Não alteraremos a integração com a API da Asaas, apenas a mensagem e o status exibidos.
