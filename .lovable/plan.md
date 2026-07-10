## Objetivo
Atualizar a página dedicada `/mywallet/extrato` (já é o destino de "Ver todas as transações") para refletir os screenshots: título "Transações" e 4 filtros com dropdowns em pills.

## Arquivo
`src/routes/_authenticated/mywallet.extrato.tsx`

## Alterações

### Cabeçalho
- Título muda de "Extrato" para **"Transações"**.
- `head().title`: "Transações · Monetisex".

### Layout dos filtros
Grid 2 colunas (md+), 1 coluna no mobile:
- Linha 1: **Tipo de item** | **Tipo de pagamento**
- Linha 2: **Status** | **Data inicial — Até — Data final** (com ícone de calendário)

Todos os campos: pills arredondadas (`h-12 rounded-full`), fundo `bg-secondary` (bege claro), chevron à direita. Ao abrir, popover branco com pills de opções (mesma estética atual).

### Opções por filtro
- **Tipo de item**: Todos, Assinatura, Chat, Desafio, Live, Mimo, Postagem, Recarga Wallet, Videochamada
- **Tipo de pagamento**: Todos, ApplePay, Cartão, GooglePay, PicPayWallet, Pix, Privacy Wallet
- **Status**: Todos, Negado, Autorizado, Devolvido
- **Datas**: mantém o range calendar existente

### Estado / seleção
- Um `useState` por filtro (`tipoItem`, `tipoPagamento`, `status`, `range`).
- "Todos" limpa a seleção (`null`).
- Selecionado ganha destaque (`bg-primary text-primary-foreground`).

### Conteúdo
- Remove o card "Últimas movimentações" e mostra apenas o texto centralizado **"Nenhuma transação encontrada"** abaixo dos filtros, conforme screenshots.

### Remover
- Constantes antigas `TIPO_ITEM_OPTIONS` (com Depósito/Bônus/Estorno) e `TIPO_MOV_OPTIONS`.
- Filtro "Tipo de movimentação".

Sem alterações em rotas, backend ou outros arquivos. O link "Ver todas as transações" em `mywallet.index.tsx` já aponta para essa rota — nada a alterar lá.
