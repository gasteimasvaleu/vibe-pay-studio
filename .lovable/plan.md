Objetivo: na versão desktop da página `/cadastro`, fazer o card de cadastro e o card promocional (`HeroCard`) terem o mesmo tamanho, e aumentar o espaçamento entre o texto superior / inferior e a imagem no card promocional.

## Alterações previstas

### 1. `src/routes/cadastro.tsx` — igualar altura dos cards
- Remover o `max-w-md` do container do card de cadastro para que ele ocupe toda a largura da coluna.
- Fazer o card de cadastro preencher a altura disponível da coluna (`h-full`) e usar `flex flex-col` para distribuir o conteúdo.
- Ajustar o grid/ container para que ambas as colunas cresçam juntas sem quebrar o layout responsivo.
- Garantir que, em telas menores (`< lg`), o card continue funcionando normalmente (sem altura forçada que corte conteúdo).

### 2. `src/components/site/HeroCard.tsx` — aumentar espaçamentos
- Aumentar o espaçamento entre o título superior e a imagem (`pt`/`pb`/`mt`).
- Aumentar o espaçamento entre a imagem e o texto inferior (`p`/`pt`/`pb`).
- Ajustar a altura da imagem para não vazar do card ao aumentar os espaçamentos (por exemplo, reduzir `h-[58%]` para `h-[52%]` ou usar `flex-1` para que a imagem ocupe o espaço restante de forma flexível).
- Manter o card com `aspect-square` e o visual atual (bordas arredondadas, sombra, fundo branco).

### 3. Validação
- Rodar `tsgo` / typecheck para garantir que não haja erros de tipo.
- Capturar um screenshot da página em viewport desktop para confirmar que os cards estão alinhados e os espaçamentos estão visivelmente maiores.

## Não está no escopo
- Alterar o conteúdo do card promocional.
- Modificar funcionalidade do formulário de cadastro.
- Mudar cores, fontes ou animações do card de login.