## Ajustes na UI do fluxo de publicação paga

Todos os ajustes ficam em `src/routes/_authenticated/publisher.tsx`. Sem mudanças de dados ou lógica de upload.

### 1. Mostrar a prévia junto às mídias, com selo e borda roxa

- Renderizar a prévia como um card extra **no início da grade de mídias** (mesmo tamanho/aspecto dos thumbs existentes), antes do `media.map(...)` em `StepCompose`.
- Estilo do card da prévia:
  - Borda destacada: `ring-2 ring-primary` + `border-2 border-primary` no wrapper `rounded-2xl`.
  - Selo no canto inferior-esquerdo: pílula `bg-primary text-primary-foreground` com ícone `ImageIcon` + texto "Prévia".
  - Estados: `uploading` (spinner + progresso), `ready` (thumb da imagem/vídeo), `error` (mensagem).
  - Clique no card abre o `PreviewPickerSheet` (mesmo `onEditPreview`).
- O card só aparece quando `toggles.paid.enabled` for true. Se ainda não houver prévia, mostra um placeholder clicável com o mesmo selo e borda tracejada roxa.

### 2. Linha "Publicação paga" no formato do screenshot 2

Substituir o bloco atual (thumb 64x64 + texto "Prévia adicionada" + link "Editar prévia" abaixo do toggle) por:

- Mantém a `ToggleRow` de "Publicação paga" no topo (com o switch).
- Quando `toggles.paid.enabled`, renderiza **abaixo** uma linha com **dois botões lado a lado** (`grid grid-cols-2 gap-3`), estilo pílula branca com sombra sutil:
  - Botão esquerdo: ícone lápis + valor formatado (ex.: `R$ 14,90`). Clique abre o `PriceDialog`.
  - Botão direito: ícone lápis + "Editar prévia". Clique abre o `PreviewPickerSheet`.
- Remover o thumbnail/texto de status daqui (a prévia agora vive na grade de mídias no topo).

### 3. Trocar laranja por roxo (token `primary`) no fluxo do publisher

Substituir as classes hardcoded `orange-*` / `pink-*` restantes por tokens semânticos:
- `text-orange-500` → `text-primary` (linhas 1052, 1503).
- Abas ativas (linhas 1651, 1657): `data-[state=active]:border-orange-500 data-[state=active]:text-orange-500` → `...border-primary ...text-primary`.
- Input do preço (1678): `border-orange-500` → `border-primary`.
- Botão gradiente (1685): `bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400` → `bg-primary hover:bg-primary/90` (mantendo classe pill/altura).

### Fora do escopo

- Nenhuma alteração no schema, migrations, `publications.functions.ts`, ou lógica de upload/estado da prévia.
- Nenhuma alteração nas páginas de feed/detalhe.
