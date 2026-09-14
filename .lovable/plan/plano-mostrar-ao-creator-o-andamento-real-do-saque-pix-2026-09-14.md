# Plano: mostrar ao creator o andamento real do saque PIX

## Resposta rápida

Sim, dá para saber. A Asaas já envia avisos automáticos para o app quando a transferência muda de estado (criada, autorizada, em processamento no banco, concluída, falhou ou cancelada), e o app já recebe e grava esses avisos. Ou seja: quando você autoriza o PIX no painel Asaas, o app fica sabendo sozinho, sem você precisar avisar nada.

O que falta é apenas **mostrar isso de forma clara** para o creator.

## O que será feito

1. Ao solicitar o saque, a mensagem passa a dizer que o PIX foi solicitado e está aguardando autorização, em vez de sugerir que já foi enviado.
2. Na lista de saques do Meu Banco, cada saque mostra um estado legível e atualizado:
   - Aguardando autorização
   - Autorizado, em processamento no banco
   - Em análise
   - Concluído
   - Falhou / Cancelado
3. A lista se atualiza sozinha enquanto houver um saque em andamento, para o creator ver a mudança sem recarregar a página.
4. Data de conclusão exibida quando o saque é finalizado.

## Onde mexer

- `src/components/banco/SacarDialog.tsx` — texto da mensagem de sucesso.
- `src/routes/_authenticated/banco.tsx` — rótulos e cores dos estados na lista de saques; atualização automática enquanto houver saque em andamento.
- `src/lib/finance.functions.ts` — garantir que a consulta dos saques devolva os campos de estado e data de conclusão usados na tela.

## Detalhes técnicos

- O webhook em `src/routes/api/public/webhooks/asaas.ts` já mapeia os eventos de transferência para os status internos (`requested`, `approved`, `in_review`, `paid`, `failed`, `rejected`) e casa o evento pelo identificador da transferência. Nenhuma mudança de integração é necessária.
- `requestWithdrawal` em `src/lib/payouts.functions.ts` continua criando a transferência; o polling curto existente permanece como está.
- Nenhuma mudança na lógica de saldo: o valor continua debitado no momento do saque.

## Fora do escopo

- Não haverá tela de aprovação interna no app; a autorização segue no painel Asaas.
- Nenhuma alteração na integração com a API da Asaas.
