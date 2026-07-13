## Problema

A postagem foi criada com sucesso (só áudio, sem imagem/vídeo), mas o `PublicationCard` não conhece o campo `audio_url` — por isso mostra o bloco cinza "Sem mídia" que aparece no screenshot.

## Plano

Editar `src/components/feed/PublicationCard.tsx` para renderizar o áudio quando `item.audio_url` existir:

1. **Quando não houver mídia (`first` indefinido) mas houver `audio_url`:** substituir o bloco "Sem mídia" por um card de áudio compacto com:
   - fundo escuro roxo/gradient sutil coerente com o tema
   - ícone de onda sonora (lucide `AudioLines` ou `Mic`)
   - `<audio controls src={item.audio_url} />` ocupando a largura, com `preload="metadata"`
   - altura reduzida (sem manter o `aspect-[4/5]` do container de imagem) para não deixar espaço cinza gigante

2. **Quando houver mídia E áudio:** manter a imagem/vídeo no topo e adicionar o player de áudio logo abaixo (antes do caption).

3. **Quando o post estiver bloqueado (`locked`):** manter apenas o `LockedOverlay` (não expor o áudio).

Nenhuma mudança no backend — `audio_url` já vem do `getFeed`.

## Fora do escopo

- Waveform / visualização custom (usar o player nativo do browser).
- Autoplay.