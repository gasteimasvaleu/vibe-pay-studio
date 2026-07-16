## Objetivo
Reorganizar a tela `/settings/social` para que os botões de ação fiquem abaixo do campo de identificador, ao lado do status "Este é seu identificador atual", e adicionar um botão **Cancelar** junto ao **Salvar**. Ambos devem usar a cor roxa primária do app.

## Alterações propostas

### 1. Remover o botão "Salvar" do header
- No `<header>` da página, manter apenas o botão de voltar e o título.
- Remover o botão `<button>Salvar</button>` que hoje ocupa a terceira coluna do flex do header.

### 2. Adicionar botões "Cancelar" e "Salvar" abaixo do status
- Logo após a `<div>` que exibe o status do identificador (linha ~206), adicionar uma nova seção com os dois botões.
- Usar o componente `<Button>` do projeto (`src/components/ui/button.tsx`) com a variante primária (`variant="default"`), que aplica o roxo padrão do app (`bg-primary text-primary-foreground`).
- Layout: flex com gap, alinhado à direita ou em coluna em mobile, conforme padrão existente.

### 3. Implementar ação do botão "Cancelar"
- Ao clicar em **Cancelar**, restaurar os valores iniciais:
  - `setDisplayName(initialDisplayName)`
  - `setHandle(initialUsername)`
  - `setStatus({ kind: "self" })`
- O botão pode ficar desabilitado quando não houver alterações (`!hasChanges`).

### 4. Preservar lógica do "Salvar"
- Manter a função `onSave()` existente.
- O botão **Salvar** continua desabilitado quando `!canSave || saving`.
- Texto de loading continua "Salvando…".

### 5. Ajustes de importação
- Adicionar import do componente `Button` em `src/routes/_authenticated/settings.social.tsx`.
- Verificar se o ícone `ArrowLeft` continua necessário (sim, para o botão voltar).

## Resultado esperado
- Header limpo com título centralizado e botão de voltar.
- Abaixo do campo `@`, o status "Este é seu identificador atual" continua aparecendo.
- Em seguida, os botões **Cancelar** e **Salvar** lado a lado, ambos na cor roxa primária do app.
- Cancelar descarta as alterações; Salvar persiste normalmente.

## Arquivos alterados
- `src/routes/_authenticated/settings.social.tsx`