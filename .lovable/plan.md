## Problema
Na tela `/live/$liveId/transmitir` (desktop) há um header com dois botões textuais lado a lado: **Voltar** (esquerda) e **Encerrar transmissão** (direita). Eles:
- Quebram a harmonia visual da interface de live;
- São redundantes, pois o componente `LiveOverlayTop` já exibe um botão **Encerrar** no topo direito do vídeo.

## Objetivo
Remover a duplicidade e deixar a navegação mais discreta, alinhada ao padrão já usado na versão mobile.

## Plano de mudança

### 1. Remover o header desktop redundante
- Excluir o bloco do header atual em `src/routes/_authenticated/live.$liveId.transmitir.tsx` (linhas ~683-690) que contém os botões "Voltar" e "Encerrar transmissão".

### 2. Adicionar botão flutuante "Voltar" sobre o player desktop
- Inserir um botão circular absoluto no canto superior esquerdo do player de vídeo, usando o mesmo estilo do mobile (`bg-black/45 backdrop-blur rounded-full text-white`).
- Posicioná-lo abaixo do `LiveOverlayTop` para evitar sobreposição (ex: `top-14 left-3` no desktop).
- Navegar para `/dashboard` ao clicar.

### 3. Manter o botão "Encerrar" no `LiveOverlayTop`
- O botão já existe no slot `right` do `LiveOverlayTop` (linha 455).
- Apenas garantir que ele continue funcionando e abrindo o `AlertDialog` customizado de confirmação.

### 4. Harmonizar estilos (opcional, se necessário)
- Se o botão "Encerrar" do `LiveOverlayTop` estiver visualmente destoante do novo botão "Voltar", ajustar altura, padding e arredondamento para que ambos compartilhem a mesma linguagem visual (ícone + label compacto, backdrop-blur, altura `h-8`/`h-9`).

### 5. Verificar mobile
- A versão mobile já possui o botão "Voltar" flutuante (linhas 645-651); mantê-lo inalterado.

### 6. Testar visualmente
- Abrir a preview em `/live/$liveId/transmitir` no desktop e confirmar que:
  - O header com os dois botões desapareceu;
  - O botão "Voltar" flutuante aparece no canto superior esquerdo do player;
  - O botão "Encerrar" continua no topo direito via `LiveOverlayTop`;
  - Não há sobreposição entre os elementos.

## Arquivos envolvidos
- `src/routes/_authenticated/live.$liveId.transmitir.tsx` (edição do layout desktop)
- `src/components/live/LiveOverlayTop.tsx` (ajuste visual do botão Encerrar, se necessário)

## Resultado esperado
Interface de transmissão desktop mais limpa, com navegação de saída discreta e botão de encerrar centralizado no overlay superior do vídeo, eliminando a duplicidade e melhorando a harmonia visual.