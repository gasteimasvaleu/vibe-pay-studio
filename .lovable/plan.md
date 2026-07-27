
# Reestruturação da UX das Lives

Aplicar o padrão descrito (dois branches por form factor, chat arrastável no mobile, painel de doadores, reações flutuantes) tanto na página do espectador quanto na do transmissor, sem alterar o backend WHIP/WHEP nem o modelo de dados existente.

## Escopo

Rotas afetadas:
- `src/routes/_authenticated/live.$liveId.tsx` (viewer)
- `src/routes/_authenticated/live.$liveId.transmitir.tsx` (broadcaster)

Novos componentes em `src/components/live/`:
- `LiveChat.tsx` — chat com `variant: "card" | "overlay"`
- `LiveDonorsPanel.tsx` — top doadores/tippers, `variant` + `collapsible`
- `FloatingReactions.tsx` — layer de emojis flutuantes (imperativo via ref)
- `LiveOverlayTop.tsx` — badge AO VIVO, viewers, avatar, botões (compartilhado)
- `WhepPlayer.tsx` — extrai a lógica WHEP atual do viewer para um componente reutilizável com `objectFit` prop e suporte a múltiplos `<video>` refs (Set) para o mesmo stream
- `useLiveDragChat.ts` (hook) — encapsula o estado `chatRatio`, pointer events, `setPointerCapture`, clamp MIN=0.22 / MAX=0.82

Nenhuma alteração em `src/lib/lives.functions.ts` além de possivelmente expor um endpoint leve para "top doadores" (ver seção Dados).

## Layouts

### Desktop (≥ 768px)
```text
container max-w-7xl px-4 py-4
└─ flex gap-4 h-[calc(100vh-9rem)]
   ├─ flex-1 relative bg-black rounded-lg overflow-hidden   ← WhepPlayer object-contain + LiveOverlayTop
   └─ w-[340px] flex flex-col gap-3
      ├─ LiveDonorsPanel variant="card" collapsible shrink-0
      └─ LiveChat variant="card" flex-1 min-h-0
```

### Mobile (< 768px) — modo cinema
```text
fixed inset-0 bg-black overflow-hidden z-40   (viewer usa fixed; broadcaster usa relative h-dvh)
├─ WhepPlayer absolute inset-0 object-cover
├─ button invisível z-[5] (inset-x-0 top-0 bottom-{chatRatio}) → abre Sheet de doadores
├─ LiveOverlayTop mobile  (top-[calc(env(safe-area-inset-top)+0.75rem)])
├─ Botão voltar z-20
├─ LiveChat variant="overlay" absolute inset-x-0 bottom-0 height={chatRatio*100}%
│   └─ headerSlot: DragHandle (touch-none, pointer events)
└─ Sheet (bottom) com LiveDonorsPanel
```

## LiveChat — regras internas
- Raiz: `flex flex-col overflow-hidden` + estilo por `variant`
  - card: `bg-card border rounded-lg`
  - overlay: `bg-black/55 backdrop-blur-md text-white`
- Lista: wrapper `relative flex-1 min-h-0` com filho `absolute inset-0 overflow-y-auto p-3 space-y-3` (padrão que evita quebra do scroll em flex column)
- Âncora `bottomRef` + `useEffect([messages]) → scrollIntoView({behavior:"smooth"})`
- Form fixo naturalmente como último filho do flex column (nada de `absolute`)
- Cores no overlay usam `white/xx` (opacidade) em vez de tokens; input `bg-white/10 border-white/20`
- Mensagem do broadcaster destacada: `bg-white/15` (overlay) / `bg-primary/15` (card)
- `FloatingReactions` no mesmo wrapper `relative` da lista, `pointer-events-none`
- Reações broadcast via canal Supabase realtime `live-{id}-reactions` chamando `reactionsRef.current.push(emoji)`

## Drag handle (mobile)
```ts
MIN=0.22, MAX=0.82, default=0.4
onPointerDown → setPointerCapture; guarda {startY, startRatio, containerHeight}
onPointerMove → next = clamp(startRatio + (-deltaY / height), MIN, MAX)
onPointerUp   → releasePointerCapture
```
Faixa de 12px com `touch-none` (obrigatório no Safari).

## Overlays sobre o vídeo
- Wrapper `pointer-events-none`; filhos interativos `pointer-events-auto`
- `env(safe-area-inset-top/bottom)` em posições absolutas
- Z-index no mobile: botão-doadores `z-[5]` · chat/topOverlay `z-10` · voltar `z-20` · container `z-40`

## Viewer — comportamento
- Reaproveita branches `loading` / `live inexistente` / `bloqueada (followers-only)` / `ok` já existentes
- `useQuery({ refetchInterval: 15_000 })` mantém detecção de encerramento (hoje é 8s — passa para 15s conforme spec)
- `useDarkSurface()` novo hook simples que aplica `dark` na `<html>` enquanto a rota está montada (para status bar / navbar)
- Avatar do overlay linka para `/u/$username`

## Broadcaster — aplicar o mesmo shell
- Desktop: usa split; coluna direita mostra `LiveDonorsPanel` + `LiveChat variant="card"` (mesmo componente do viewer, sem input desabilitado — broadcaster também comenta)
- Mobile: `relative h-dvh` (não `fixed`, o broadcaster precisa continuar sob a navbar do editor) com o mesmo chat arrastável
- Reaproveita `WhepPlayer`? Não: broadcaster usa `<video muted>` local do stream capturado; mantém como `<video>` inline

## Dados (mínimo necessário)
- Comentários/likes: já existem (`live_comments`, `live_likes`)
- Reações flutuantes: usar canal realtime broadcast (efêmero, sem persistir)
- Doadores: derivar da tabela `transactions` filtrando `kind = 'live_tip' | 'live_ticket'` agrupado por `payer_user_id` para o `live_id`. Se não existir hoje, o painel renderiza estado vazio "Seja o primeiro a apoiar" e o botão de tip permanece funcional (integrado ao `payWithWallet` já existente). Definir isso apenas como leitura; nenhuma migração obrigatória neste plano.

## Fora de escopo (fica para depois)
- Sistema de gorjetas/tips com valor customizado e animação de "big tip"
- Replay/VOD após encerramento
- Moderação (ban de usuário no chat)
- `useLiveChat` unificado com persistência + presence (o plano mantém o fetch/insert direto atual e só encapsula o UI)

## Passos de implementação
1. Criar `src/hooks/useDarkSurface.ts` e `src/components/live/useLiveDragChat.ts`
2. Criar `WhepPlayer.tsx` extraindo lógica atual do viewer
3. Criar `FloatingReactions.tsx` (imperativo, `useImperativeHandle`)
4. Criar `LiveChat.tsx` com as duas variantes + reações + realtime
5. Criar `LiveDonorsPanel.tsx` (variant card + collapsible; consulta best-effort de doadores)
6. Criar `LiveOverlayTop.tsx` compartilhado
7. Refatorar `live.$liveId.tsx` para dois branches via `useIsMobile()`
8. Refatorar `live.$liveId.transmitir.tsx` para o mesmo shell (split desktop; imersivo `h-dvh` mobile)
9. Testar em ambos os breakpoints via preview
