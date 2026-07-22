# Redesenho do composer do chat

Trocar o composer atual por um card único (textarea em cima, barra de ícones embaixo) igual ao screenshot, mantendo a função de preço e adicionando anexo, câmera, emoji flutuante e áudio. Todos os ícones são `lucide-react` no estilo outline roxo (`text-primary`), sem emojis.

## Layout novo

```text
┌─────────────────────────────────────────────────────────┐
│ Escreva uma mensagem…                                   │
│                                                         │
│ [Paperclip] [Camera] [Sparkles] [DollarSign]   [Mic] [ArrowUp] │
└─────────────────────────────────────────────────────────┘
```

- Card `rounded-2xl border bg-card` englobando textarea + barra inferior.
- Textarea sem borda própria, `resize-none`, cresce até ~6 linhas, placeholder "Escreva uma mensagem…".
- Barra inferior: ícones à esquerda em `text-primary` (outline, tamanho `h-5 w-5`, botão-ícone `h-9 w-9` sem fundo, hover `bg-primary/10`); à direita `Mic` no mesmo estilo e botão circular `ArrowUp` (`h-9 w-9 rounded-full bg-primary/10 text-primary`, vira `bg-gradient-primary text-primary-foreground` quando há texto ou mídia).
- Chip "Mensagem paga · R$ X" aparece acima do card quando `priceCents` está ativo (mantido do fluxo atual).

## Ícones (lucide-react)

1. **`Paperclip` — Anexo**: abre `<input type="file" multiple accept="image/*,video/*">`. Upload para bucket `chat-media`, anexa em `metadata.media` no `sendMessage`. Miniaturas removíveis acima da barra antes de enviar.
2. **`Camera` — Câmera**: mesmo fluxo, com `capture="environment"` para abrir a câmera direto no mobile.
3. **`Sparkles` — Emoji flutuante**: popover com 6 emojis (❤️ 🔥 😍 👏 😂 🎉). Ao clicar:
   - anima o emoji subindo flutuando da barra até desaparecer no topo da área de mensagens (Framer Motion, ~2,5s, leve drift horizontal, fade final);
   - envia broadcast no canal realtime `chat:{threadId}` (evento `float_emoji`) para o parceiro ver a mesma animação em tempo real, **sem** persistir no histórico.
4. **`DollarSign` — Preço**: mantém o `PriceDialog` atual (só muda de lugar, agora dentro da barra de ícones).
5. **`Mic` — Áudio**: press-and-hold para gravar via `MediaRecorder` (webm/opus). Ao soltar, mostra preview com duração + descartar/enviar. Upload para `chat-media`, anexa como `metadata.media[{kind:"audio", url}]` (já renderizado).
6. **`ArrowUp` — Enviar**: envia texto + mídias pendentes; desabilitado sem texto e sem anexos; spinner durante upload/envio.

## Arquivos

- `src/routes/_authenticated/chat.$threadId.tsx` — substituir o bloco do composer (~linhas 465-520) por `<ChatComposer>`; adicionar assinatura do canal realtime para receber `float_emoji`.
- `src/components/chat/ChatComposer.tsx` **(novo)** — encapsula textarea, ícones, previews de mídia, gravação de áudio, popover de emoji, e expõe `onSend({ text, media, priceCents })` + `onFloatEmoji(emoji)`.
- `src/components/chat/FloatingEmojiLayer.tsx` **(novo)** — camada `absolute` sobre a área de mensagens que renderiza os emojis animados (locais + recebidos via broadcast) com Framer Motion.
- `src/lib/chat.functions.ts` — helper `uploadChatMedia(file)` isolado se ainda não existir; sem novo schema.

## Detalhes técnicos

- **Realtime**: `supabase.channel('chat:'+threadId).on('broadcast', { event: 'float_emoji' }, …)` no cliente, sem tabela nova. Payload: `{ emoji, senderId, id }`.
- **Gravação**: `navigator.mediaDevices.getUserMedia({audio:true})` + `MediaRecorder`; toast de erro se permissão for negada.
- **Uploads**: paralelos com `Promise.all`; enquanto sobem, botão de enviar mostra spinner e fica disabled.
- **Acessibilidade**: cada ícone com `aria-label` e `Tooltip` (usa o `TooltipProvider` já presente).
- **Escopo**: apenas o composer do chat 1:1; nenhuma outra tela é tocada.
