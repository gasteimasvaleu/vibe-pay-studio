## Objetivo
Fazer o botão "Gravar áudio" (Step 2 do publisher) gravar um áudio pelo microfone, mostrar a barra de gravação conforme o screenshot (● timer, cancelar ✕, confirmar ✓), fazer upload com progresso e enviar o áudio junto da publicação.

## UI (seguindo o screenshot)

Estado ocioso — botão atual permanece:
`[ 🎙 Gravar áudio ]   [ ⇄ Reordenar ]`

Ao clicar em "Gravar áudio":
- Pede permissão do microfone (`getUserMedia({ audio: true })`).
- Botão vira estado "gravando" (destaque roxo/pulse) e abaixo da linha de botões aparece a **barra de gravação**:
  - fundo `bg-muted/60`, `rounded-full`, `h-12`, padding horizontal
  - à esquerda: ponto vermelho pulsante + `mm:ss` do tempo decorrido
  - à direita: dois botões circulares — vermelho com ✕ (cancelar) e verde com ✓ (parar e salvar)

Ao confirmar (✓):
- Para o `MediaRecorder`, gera `Blob` (`audio/webm`) e faz upload para o Storage com barra de progresso (mesma UX das mídias).
- Após upload, a barra vira **player**: `<audio controls>` + botão de lixeira para remover/regravar.

Ao cancelar (✕): descarta o blob, some a barra, volta ao estado ocioso.

Regras:
- Só um áudio por publicação. Enquanto grava/faz upload, desabilita o botão "Postar" (junto com a lógica atual de `canContinue`).
- Ao remover, chama `deleteDraftMedia` para apagar o arquivo do Storage.

## Backend

1. **Migration**: adicionar colunas em `public.publications`:
   - `audio_url text null`
   - `audio_storage_path text null`

2. **`src/lib/publications.functions.ts`**:
   - Estender `createPublicationSchema` com `audio: z.object({ storagePath: z.string(), url: z.string().url() }).nullable().optional()`.
   - No `insert` das `publications`, passar `audio_url` e `audio_storage_path`.
   - Estender `FeedItem` e o `select` de `getFeed` para retornar `audio_url` (para uso futuro no feed; renderização no card do feed fica fora deste escopo).

## Frontend — `src/routes/_authenticated/publisher.tsx`

- Novos estados no `PublisherPage`:
  - `audio: { status: "idle" | "recording" | "uploading" | "ready" | "error"; blob?: Blob; previewUrl?: string; storagePath?: string; publicUrl?: string; elapsedSec: number; uploadProgress: number; error?: string }`
  - refs: `mediaRecorderRef`, `mediaStreamRef`, `chunksRef`, `timerRef`.
- Handlers:
  - `startRecording()` — `getUserMedia`, cria `MediaRecorder`, inicia timer 1s.
  - `cancelRecording()` — para recorder, para tracks, limpa estado.
  - `confirmRecording()` — para recorder, no `onstop` monta o blob, cria `previewUrl` local, dispara `uploadAudio`.
  - `uploadAudio(blob)` — reutiliza `uploadWithProgress` para `posts/{userId}/drafts/audio-{uuid}.webm`, cria signed URL (mesmo padrão das mídias), atualiza estado `ready` com progresso.
  - `removeAudio()` — chama `deleteDraftMedia` e reseta estado.
- Substituir o bloco atual do botão "Gravar áudio" (linhas 874-897) por um novo componente inline com três variantes visuais: ocioso, gravando (barra do screenshot), pronto (player + lixeira). "Reordenar" continua ao lado (grid 2 colunas mantido no estado ocioso; nos demais estados a barra ocupa a linha inteira abaixo).
- No `onPost`, incluir `audio: audio.status === "ready" ? { storagePath: audio.storagePath!, url: audio.publicUrl! } : null` no payload.
- Ajustar `canContinue` / disabled do "Postar" para bloquear enquanto `audio.status === "recording"` ou `"uploading"`.

## Detalhes técnicos

- Formato: `audio/webm;codecs=opus` (fallback para default do browser).
- Limite prático: interromper automaticamente após 5 min (`MAX_AUDIO_SEC = 300`) para evitar upload gigante.
- Bucket e política de Storage já existentes (`publications` privado, prefixo `posts/{userId}/`) — nenhum ajuste necessário.
- Cleanup: `URL.revokeObjectURL(previewUrl)` ao remover/desmontar.

## Fora de escopo
- Reprodução do áudio no card do feed (apenas persistência + retorno em `FeedItem`).
- Waveform/visualização de áudio.
- Cortes/edição do áudio.