import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getLiveMessages, sendLiveMessage, type LiveChatMessage } from "@/lib/live-chat.functions";

const MAX = 200;

export interface UseLiveChatArgs {
  streamId: string;
  sender?: {
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  onReaction?: (emoji: string) => void;
  onViewersChange?: (n: number) => void;
}

export function useLiveChat({ streamId, sender, onReaction, onViewersChange }: UseLiveChatArgs) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [sending, setSending] = useState(false);

  const anonKeyRef = useRef(`anon-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const onReactionRef = useRef(onReaction);
  const onViewersRef = useRef(onViewersChange);

  useEffect(() => { onReactionRef.current = onReaction; }, [onReaction]);
  useEffect(() => { onViewersRef.current = onViewersChange; }, [onViewersChange]);

  const getHistoryFn = useServerFn(getLiveMessages);
  const sendMsgFn = useServerFn(sendLiveMessage);

  const presenceKey = sender?.userId ?? anonKeyRef.current;

  const appendDedup = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      const next = [...prev, m];
      return next.length > MAX ? next.slice(-MAX) : next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Histórico
    getHistoryFn({ data: { streamId, limit: 100 } })
      .then((res: any) => {
        if (cancelled) return;
        const history: LiveChatMessage[] = res?.messages ?? [];
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...history.filter((m) => !seen.has(m.id)), ...prev];
          return merged.length > MAX ? merged.slice(-MAX) : merged;
        });
      })
      .catch(() => {});

    // Anti-fantasma: fecha canais anteriores com o mesmo topic
    const topic = `livecam:${streamId}`;
    for (const existing of supabase.getChannels()) {
      const t = (existing as any).topic as string | undefined;
      if (t === `realtime:${topic}` || t === topic) {
        supabase.removeChannel(existing);
      }
    }

    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true },
        presence: { key: presenceKey },
      },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "msg" }, ({ payload }: any) => {
        if (payload && typeof payload.id === "string") appendDedup(payload as LiveChatMessage);
      })
      .on("broadcast", { event: "reaction" }, ({ payload }: any) => {
        const e = payload?.emoji;
        if (typeof e === "string") onReactionRef.current?.(e);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const n = Object.keys(state).length;
        setViewers(n);
        onViewersRef.current?.(n);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          await channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      cancelled = true;
      subscribedRef.current = false;
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      channelRef.current = null;
      setMessages([]);
      setViewers(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, presenceKey]);

  async function waitSubscribed(timeout = 1500) {
    if (subscribedRef.current) return;
    const start = Date.now();
    while (!subscribedRef.current && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || !sender) return;
    setSending(true);
    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: LiveChatMessage = {
      id: optimisticId,
      userId: sender.userId,
      username: sender.username,
      displayName: sender.displayName,
      avatarUrl: sender.avatarUrl,
      text: t,
      ts: Date.now(),
    };
    appendDedup(optimistic);

    let persisted: LiveChatMessage | null = null;
    try {
      const res: any = await sendMsgFn({ data: { streamId, text: t } });
      if (res?.status === "ok" && res.message) {
        persisted = res.message;
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? persisted! : m)));
      } else if (res?.status === "rate_limited") {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    } catch (e) {
      console.error("[useLiveChat] send falhou", e);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
    }

    if (!persisted) return;
    await waitSubscribed();
    channelRef.current?.send({ type: "broadcast", event: "msg", payload: persisted });
  }, [streamId, sender, appendDedup, sendMsgFn]);

  const sendReaction = useCallback(async (emoji: string) => {
    await waitSubscribed();
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji } });
  }, []);

  return { messages, viewers, sending, sendMessage, sendReaction };
}
