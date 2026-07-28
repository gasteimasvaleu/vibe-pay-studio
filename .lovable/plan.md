## Problema

O botão "Câmera" nos dois sheets do `/publisher` (mídia principal e prévia) usa `<input type="file" accept="image/*,video/*" capture="environment">`. Isso:

- No desktop, o atributo `capture` é ignorado — o navegador cai no comportamento padrão e abre o seletor de arquivos (biblioteca do dispositivo). É o que você está vendo agora (viewport 1179×702).
- No mobile, alguns navegadores também mostram um seletor "câmera/galeria" em vez de abrir direto a câmera quando o `accept` mistura imagem e vídeo.

## Solução

Trocar o `<input capture>` por um capturador real dentro do app usando `navigator.mediaDevices.getUserMedia`, funcionando em desktop (webcam) e mobile (câmera traseira). Manter o input com `capture` só como fallback quando a API do navegador não estiver disponível.

## Escopo

Arquivos:

- **Novo** `src/components/publisher/CameraCaptureDialog.tsx`
- **Editar** `src/routes/_authenticated/publisher.tsx`

## Novo componente `CameraCaptureDialog`

Um `Dialog` full-screen (`max-w-2xl`, fundo escuro) com:

- Abas "Foto" / "Vídeo".
- `<video autoplay playsinline muted>` mostrando o stream ao vivo.
- Preferência por câmera traseira em mobile: `getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: modo==="video" })`. Botão "Girar câmera" quando houver múltiplos devices.
- **Foto:** botão de disparo desenha o frame num `<canvas>`, exporta com `canvas.toBlob(..., "image/jpeg", 0.92)` e devolve um `File` (`foto-<timestamp>.jpg`).
- **Vídeo:** `MediaRecorder` (mimeType `video/webm;codecs=vp9,opus` com fallbacks), botão gravar/parar, timer, limite de 60 s. Ao parar, gera `File` `video-<timestamp>.webm`.
- Prévia do resultado antes de confirmar: botões "Refazer" e "Usar".
- Cleanup: parar todas as tracks (`stream.getTracks().forEach(t => t.stop())`) ao fechar/desmontar.
- Tratamento de erros: se `getUserMedia` falhar (permissão negada, sem device, contexto não-seguro), exibir mensagem + botão "Usar biblioteca" que aciona o input file de fallback.

API:

```ts
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "single" | "multi";     // prévia = single; mídia = multi (permite tirar várias)
  accept: "image" | "video" | "both";
  onCapture: (files: File[]) => void;
};
```

## Integração no `publisher.tsx`

- Adicionar estado `cameraOpen: { target: "media" | "preview" } | null`.
- `triggerMediaCamera` → fecha o sheet e abre `<CameraCaptureDialog target="media" accept="both" mode="multi">`.
- `triggerPreviewCamera` → mesmo, com `target="preview" accept="both" mode="single"`.
- No `onCapture`, chamar `onFiles(fileList)` (mídia) ou `onPreviewFile(file)` (prévia).
- Remover os inputs `mediaCameraInputRef` e `previewCameraInputRef` **ou** mantê-los apenas como fallback acionado pelo próprio dialog em erro. Prefiro manter — custo zero, ajuda no fallback.
- Detectar suporte: se `!navigator.mediaDevices?.getUserMedia`, `triggerMediaCamera`/`triggerPreviewCamera` cai direto no input `capture` antigo.

## Notas técnicas

- `getUserMedia` só funciona em contexto seguro (https / localhost). O preview do Lovable e o domínio publicado atendem.
- Autoplay do `<video>` exige `muted` + `playsinline`.
- Bug conhecido do iOS: `MediaRecorder` só grava `video/mp4` em Safari 14.3+; usar detecção `MediaRecorder.isTypeSupported` para escolher o mimeType.
- Sem alterações no backend: os arquivos gerados entram no mesmo pipeline de upload já existente (`onFiles` / `onPreviewFile`).
