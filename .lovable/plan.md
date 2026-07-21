## Objetivo
Padronizar o header da rota `/criar-perfil-gratuito` para que fique alinhado ao padrão visual do restante do app, adicionando a linha divisória (`border-b`) que separa o header do conteúdo abaixo.

## Alteração proposta
No arquivo `src/routes/_authenticated/criar-perfil-gratuito.tsx`, atualizar o elemento `<header>` (linha 194) para incluir as classes padrão usadas nas outras páginas autenticadas:

- `sticky top-0`
- `z-20`
- `border-b border-border`
- `bg-background/90 backdrop-blur`

A classe atual é:
```
className="relative flex items-center justify-center px-4 py-4"
```

A nova classe será:
```
className="sticky top-0 z-20 flex items-center justify-center border-b border-border bg-background/90 px-4 py-4 backdrop-blur"
```

## Escopo
Apenas ajuste de estilo no header. Nenhuma alteração de lógica, dados ou estrutura de componentes.

## Validação
Após a alteração, o header da página `/criar-perfil-gratuito` deverá exibir a linha divisória na parte inferior, igual às páginas `/vault`, `/banco`, `/follow`, `/publicacoes-agendadas` e `/mywallet`.