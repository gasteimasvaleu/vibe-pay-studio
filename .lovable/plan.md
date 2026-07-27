## Objetivo
Ajustar o header da página `/contato` para seguir o padrão visual das outras páginas institucionais (`/privacidade`, `/termos-e-politicas`, `/centro-e-seguranca`), adicionando a linha divisória entre o título e o conteúdo do formulário.

## Alterações propostas

### 1. Reestruturar o cabeçalho de `/contato`
- Substituir o header customizado atual (com botão "Voltar", logo duplicada e espaço reservado) por um header padrão igual ao das páginas institucionais:
  - Título principal `<h1>`.
  - Subtítulo/descrição em `text-muted-foreground`.
  - Envolver em `<header className="mb-10 pb-10 border-b border-border">` para criar a linha divisória.
- Manter o link "Voltar" opcionalmente acima do título, mas sem a linha de 3 colunas que desequilibra o layout.

### 2. Ajustar o container do formulário
- Manter `max-w-3xl mx-auto px-4 md:px-6 py-12` no container principal, alinhado com as outras páginas.
- Garantir que o formulário inicie logo após a linha divisória do header.

### 3. Preservar funcionalidade
- Manter toda a lógica de estado, validação, envio via `submitContact` e toast de feedback.
- Manter os campos: Nome, E-mail, Motivo (Select) e Mensagem.
- Manter o link para o Centro de Segurança no rodapé da página.

## Resultado esperado
A página `/contato` terá um header limpo e consistente com as demais páginas institucionais, com uma linha `border-b border-border` separando visualmente o título do formulário.