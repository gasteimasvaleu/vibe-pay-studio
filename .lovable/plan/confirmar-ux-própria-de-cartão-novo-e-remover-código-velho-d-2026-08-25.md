# Confirmar UX própria de cartão novo e remover código velho do Asaas

## Resumo do que você disse

Quando o usuário paga com **cartão que ainda não está salvo**, o app já abre a
nossa tela própria com os passos e animação — não abre o checkout do Asaas.

Verifiquei o código e **você está correto**. O fluxo atual é:

1. Usuário escolhe "Cartão" sem ter cartão salvo
2. Aparece o formulário `NewCardCheckoutStep` (nossa UX com steps)
3. Ele preenche os dados, tokeniza o cartão
4. Depois de tokenizado, o app usa esse cartão como se fosse "cartão salvo" e
   faz a cobrança 1-click
5. Só mostra sucesso quando o pagamento é confirmado

## O que ainda precisa ser arrumado

### 1. Erros de build que estão quebrando o app

Dois links no código apontam para rotas que não existem mais:

- Em `LiveOverlayTop.tsx`: link `/u/$username` → deve ser `/perfil/$username`
- Em `admin.users.$userId.tsx`: link `/$username` → deve ser `/perfil/$username`

Esses erros estão fazendo o typecheck falhar e podem quebrar outras páginas.

### 2. Código morto do checkout do Asaas

Ainda existe um componente chamado `CardCheckout.tsx` que mostra a tela "Abra o
checkout seguro do Asaas". Ele não deveria mais ser usado, porque hoje todo
cartão passa pela nossa UX própria. Vou:

- Remover esse componente
- Remover os lugares que ainda referenciam ele
- Colocar uma trava no servidor para nunca gerar link de checkout externo
  quando o método for cartão

## Resultado esperado

- O app volta a compilar sem erros
- Cartão novo continua usando a UX própria com steps e animação
- Nenhum fluxo pode acidentalmente redirecionar para fora do app no futuro
