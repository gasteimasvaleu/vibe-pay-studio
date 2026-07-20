## Objetivo
Replicar na página `/cadastro` o card lateral promocional que hoje aparece ao lado do formulário de login na página inicial (`/`).

## Estado atual
- `src/routes/index.tsx` renderiza um layout de duas colunas: `LoginCard` à esquerda e, à direita, um card branco com título "Monetisexy, do seu jeito.", imagem `hero-illustration.jpg` e descrição.
- `src/routes/cadastro.tsx` renderiza apenas o formulário de cadastro centralizado em uma única coluna, sem o card lateral.

## Alterações propostas

### 1. Extrair componente reutilizável
Criar `src/components/site/HeroCard.tsx` contendo o card promocional atualmente inline em `src/routes/index.tsx`.

- Preservar imagem `heroBg`, título, descrição, estilos (`bg-white`, `rounded-[2.5rem]`, `shadow-card`, etc.).
- Aceitar props opcionais para título/descrição caso seletores futuros queiram variar o texto.

### 2. Refatorar `src/routes/index.tsx`
- Substituir o bloco do card lateral pela importação e uso de `<HeroCard />`.
- Garantir que o visual final permaneça idêntico ao atual.

### 3. Atualizar `src/routes/cadastro.tsx`
- Trocar o container atual (`flex items-center justify-center`) por um layout de duas colunas responsivo, igual ao da home:
  - Em telas grandes (`lg:grid-cols-2`): formulário à esquerda, `<HeroCard />` à direita.
  - Em telas menores: formulário em uma coluna (o card pode ficar oculto ou empilhado abaixo, conforme decisão visual padrão do projeto).
- Ajustar padding/margens para alinhar com a home (`py-16 md:py-24`, `max-w-7xl`, etc.).
- Manter todos os comportamentos do formulário de cadastro intactos (tabs, validação, Google, etc.).

## Critérios de aceitação
- A página `/cadastro` exibe o mesmo card lateral da página inicial.
- A página inicial continua funcionando e com o mesmo visual.
- O formulário de cadastro mantém todas as funcionalidades existentes.
- Layout responsivo: em mobile o card não quebra a usabilidade do formulário.

## Arquivos envolvidos
- `src/components/site/HeroCard.tsx` (novo)
- `src/routes/index.tsx` (refatorado)
- `src/routes/cadastro.tsx` (refatorado)