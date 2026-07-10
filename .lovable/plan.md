## Objetivo
Ao clicar no botão "Adicionar novo cartão" em `/mywallet`, abrir um dialog com formulário de cadastro de cartão, conforme o screenshot.

## Alterações

**`src/routes/_authenticated/mywallet.index.tsx`**
- Converter o botão "Adicionar novo cartão" no gatilho de um `<Dialog>` (shadcn).
- Adicionar estado local para os campos do formulário.

## Conteúdo do Dialog (conforme screenshot)
- Título: **Adicionar cartão**
- Subtítulo: "Estamos em total conformidade com o padrão internacional de segurança de cartões PCI DSS."
- Campos (inputs arredondados, fundo cinza claro, placeholder em maiúsculas):
  - NÚMERO DO CARTÃO (com máscara `#### #### #### ####`)
  - NOME (COMO ESCRITO NO CARTÃO)
  - CPF DO TITULAR (máscara `###.###.###-##`)
  - VALIDADE (`MM/AA`) e CVV (3–4 dígitos) lado a lado
- Botão **Confirmar** (laranja, arredondado, alinhado à direita)
- Botão de fechar (X) no canto superior direito

## Comportamento
- Ao confirmar: validação básica (todos os campos preenchidos, número com 16 dígitos, CVV 3–4 dígitos, validade formato MM/AA), exibir `toast` de sucesso "Cartão adicionado" e fechar o dialog. Sem persistência backend nesta etapa.
- Sem alterações em rotas, backend ou outros arquivos.
