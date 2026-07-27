import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Send, Smile } from "lucide-react";
import { FloatingReactions, type FloatingReactionsHandle } from "./FloatingReactions";

const REACTIONS = ["❤️", "🔥", "😂", "😍", "👏", "🙌", "💜"];

export interface LiveChatProps {
  liveId: string;
  broadcasterId?: string | null;
  variant?: "card" | "overlay";
  className?: string;
  headerSlot?: ReactNode;
  canTip?: boolean;
  onTip?: () => void;
}

interface Comment { id: string; user_id: string; content: string; created_at: string; }

export function LiveChat({ liveId, broadcasterId, variant = "card", className, headerSlot, canTip = false, onTip }: LiveChatProps) {
  const isOverlay = variant === "overlay";
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<FloatingReactionsHandle>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: comments } = useQuery({
    queryKey: ["live-comments", liveId],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_comments")
        .select("id, user_id, content, created_at")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true })
        .limit(120);
      return (data ?? []) as Comment[];
    },
    refetchInterval: 15_000,
  });

  // Realtime — novos comentários + broadcast de reações
  useEffect(() => {
    const ch = supabase
      .channel(`live-${liveId}-chat`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_comments", filter: `live_id=eq.${liveId}` },
        () => qc.invalidateQueries({ queryKey: ["live-comments", liveId] }))
      .on("broadcast", { event: "reaction" }, (p: any) => {
        const e = p?.payload?.emoji;
        if (typeof e === "string") reactionsRef.current?.push(e);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [liveId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = text.trim();
    if (!c) return;
    setText("");
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    await supabase.from("live_comments").insert({ live_id: liveId, user_id: u.id, content: c });
  }

  async function sendReaction(emoji: string) {
    reactionsRef.current?.push(emoji);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji } });
    const u = (await supabase.auth.getUser()).data.user;
    if (u) supabase.from("live_likes").insert({ live_id: liveId, user_id: u.id }).then(() => {});
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        isOverlay ? "bg-black/55 backdrop-blur-md text-white" : "bg-card border rounded-lg",
        className,
      )}
    >
      {headerSlot}
      {!headerSlot && (
        <div className={cn("px-3 py-2 flex items-center justify-between", isOverlay ? "border-b border-white/15" : "border-b")}>
          <p className={cn("text-xs font-semibold uppercase tracking-wide", isOverlay ? "text-white/70" : "text-muted-foreground")}>Chat ao vivo</p>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto p-3 space-y-2">
          {(comments ?? []).length === 0 && (
            <p className={cn("text-xs text-center py-6", isOverlay ? "text-white/50" : "text-muted-foreground")}>
              Seja o primeiro a comentar
            </p>
          )}
          {(comments ?? []).map((c) => {
            const mine = broadcasterId && c.user_id === broadcasterId;
            return (
              <div key={c.id} className="text-sm leading-snug">
                <span
                  className={cn(
                    "inline-block px-2 py-1 rounded-md break-words",
                    mine
                      ? isOverlay ? "bg-white/15" : "bg-primary/15"
                      : isOverlay ? "text-white/90" : "text-foreground",
                  )}
                >
                  {c.content}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <FloatingReactions ref={reactionsRef} />
      </div>

      <form onSubmit={handleSubmit} className={cn("p-2 flex gap-2", isOverlay ? "border-t border-white/15" : "border-t")}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Comentar…"
          className={cn(
            "h-9 flex-1",
            isOverlay && "bg-white/10 border-white/20 text-white placeholder:text-white/60",
          )}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="icon" variant={isOverlay ? "ghost" : "outline"} className={cn("h-9 w-9", isOverlay && "text-white hover:bg-white/10")}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2">
            <div className="flex gap-1">
              {REACTIONS.map((r) => (
                <button key={r} type="button" onClick={() => sendReaction(r)} className="h-9 w-9 grid place-items-center rounded-md hover:bg-muted text-xl">
                  {r}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {canTip && (
          <Button type="button" size="icon" variant={isOverlay ? "ghost" : "outline"} onClick={onTip} className={cn("h-9 w-9", isOverlay && "text-white hover:bg-white/10")}>
            <Heart className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" size="icon" className="h-9 w-9 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
