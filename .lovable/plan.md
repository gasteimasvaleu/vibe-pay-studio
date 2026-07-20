## Objetivo
Na etapa 2 de `/criar-perfil-gratuito`, a primeira miniatura da grade de capa (a que exibe o ícone de câmera) deve funcionar como botão de upload — ao clicar, abre o seletor de arquivo do dispositivo e a imagem enviada vira a capa selecionada do perfil. As outras duas miniaturas continuam como presets selecionáveis.

## Mudanças em `src/routes/_authenticated/criar-perfil-gratuito.tsx`

1. Reduzir `COVER_OPTIONS` para os 2 presets restantes (`coverB`, `coverC`). O primeiro slot da grade deixa de ser preset e vira "tile de upload".
2. Renderizar a grade de 3 colunas assim:
   - **Slot 1 — tile de upload**: `<button>` que dispara `coverInputRef.current?.click()`. Mostra:
     - miniatura da imagem enviada (`selectedCover`) quando já houver upload personalizado; ou
     - fundo `bg-muted` vazio quando ainda não houver.
     - Ícone de câmera sempre visível centralizado (mesmo estilo atual do overlay ativo).
     - Spinner `Loader2` sobreposto enquanto `uploading === "cover"`.
     - Borda `border-primary` quando a capa personalizada estiver ativa.
   - **Slots 2 e 3 — presets** (`coverB`, `coverC`): comportamento atual (`onClick` seta `selectedCover`, mostra overlay com câmera quando ativo).
3. Remover o botão de texto "+ Enviar sua foto" (ficou redundante com o tile de upload). O `<input type="file" ref={coverInputRef}>` oculto permanece e continua usando `onCoverPick` sem alterações.
4. Ajustar `selectedCover` inicial para o primeiro preset restante (`coverB`) para manter uma capa padrão pré-selecionada.

## Comportamento resultante
- Clicar no primeiro tile (ícone de câmera) abre o seletor de arquivo; a foto enviada é upada para o bucket `covers`, aparece dentro do próprio tile e passa a ser a capa salva ao "Criar Conta".
- Os outros dois tiles continuam selecionando presets do projeto.
- Nenhuma mudança em lógica de backend/upload — reaproveita `uploadToBucket` e `onCoverPick` existentes.