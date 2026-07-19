## Objetivo
O botão "Câmera" no bottom sheet de mídia principal do publicador (`/publisher`) atualmente apenas abre o seletor de arquivos padrão. Ele deve abrir a câmera nativa do dispositivo (celular ou webcam do computador), igual ao botão "Câmera" já existente no sheet de prévia.

## Mudanças em `src/routes/_authenticated/publisher.tsx`

1. **Adicionar novo ref** `mediaCameraInputRef` ao lado de `fileInputRef` e `previewCameraInputRef`.
2. **Adicionar novo handler** `triggerMediaCamera` que dispara `mediaCameraInputRef.current?.click()`.
3. **Adicionar um `<input type="file">` oculto** com `accept="image/*,video/*"`, `capture="environment"` e `multiple`, reusando o mesmo `onChange` do input principal (a mesma função que processa arquivos selecionados via biblioteca).
4. **Trocar o `onClick`** do `PickerOption` "Câmera" (linha 933) de `triggerFileInput` para `triggerMediaCamera`.

## Comportamento resultante
- Mobile: abre diretamente o app de câmera do sistema (foto ou vídeo) via atributo `capture`.
- Desktop: navegadores tratam `capture` como dica; abrem a webcam quando disponível ou caem no seletor de arquivos.
- Os arquivos capturados entram no mesmo pipeline dos uploads da biblioteca (upload para o bucket, geração de preview, etc.), sem alterar lógica de negócio.
