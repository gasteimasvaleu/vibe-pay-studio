import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Send, Smile } from "lucide-react";
import { FloatingReactions, type FloatingReactionsHandle } from "./FloatingReactions";
import { useLiveChat } from "./useLiveChat";

const REACTIONS = ["❤️", "🔥", "😂", "😍", "👏", "🙌", "💜"];

export interface LiveChatProps {
  liveId: string;
  broadcasterId?: string | null;
  variant?: "card" | "overlay";
  className?: string;
  headerSlot?: ReactNode;
  canTip?: boolean;
  onTip?: () => void;
  onViewersChange?: (n: number) => void;
}

interface Sender { userId: string; username: string | null; displayName: string | null; avatarUrl: string | null }

export function LiveChat({
  liveId,
  broadcasterId,
  variant = "card",
  className,
  headerSlot,
  canTip = false,
  onTip,
  onViewersChange,
}: LiveChatProps) {
  const isOverlay = variant === "overlay";
  const [text, setText] = useState("");
  const [sender, setSender] = useState<Sender | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<FloatingReactionsHandle>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || cancelled) return;
      const { data: p } = await supabase
        .from("profiles_public" as any)
        .select("username, display_name, avatar_url")
        .eq("id", u.id)
        .maybeSingle();
      if (cancelled) return;
      setSender({
        userId: u.id,
        username: (p as any)?.username ?? null,
        displayName: (p as any)?.display_name ?? null,
        avatarUrl: (p as any)?.avatar_url ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const { messages, sendMessage, sendReaction } = useLiveChat({
    streamId: liveId,
    sender,
    onReaction: (e) => reactionsRef.current?.push(e),
    onViewersChange,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendMessage(t);
  }

  async function pickReaction(emoji: string) {
    reactionsRef.current?.push(emoji);
    await sendReaction(emoji);
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
          {messages.length === 0 && (
            <p className={cn("text-xs text-center py-6", isOverlay ? "text-white/50" : "text-muted-foreground")}>
              Seja o primeiro a comentar
            </p>
          )}
          {messages.map((m) => {
            const mine = broadcasterId && m.userId === broadcasterId;
            const name = m.displayName || (m.username ? `@${m.username}` : "Anônimo");
            return (
              <div key={m.id} className="text-sm leading-snug flex gap-2 items-start">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={cn("h-6 w-6 rounded-full flex-shrink-0", isOverlay ? "bg-white/15" : "bg-muted")} />
                )}
                <div className="min-w-0 flex-1">
                  <span className={cn("text-[11px] font-semibold mr-1", isOverlay ? "text-white/80" : "text-foreground/80", mine && "text-amber-400")}>
                    {name}
                  </span>
                  <span
                    className={cn(
                      "break-words",
                      mine
                        ? isOverlay ? "bg-white/15 rounded px-1.5 py-0.5" : "bg-primary/15 rounded px-1.5 py-0.5"
                        : isOverlay ? "text-white/90" : "text-foreground",
                    )}
                  >
                    {m.text}
                  </span>
                </div>
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
          placeholder={sender ? "Comentar…" : "Faça login para comentar"}
          disabled={!sender}
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
                <button key={r} type="button" onClick={() => pickReaction(r)} className="h-9 w-9 grid place-items-center rounded-md hover:bg-muted text-xl">
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
        <Button type="submit" size="icon" disabled={!sender || !text.trim()} className="h-9 w-9 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white disabled:opacity-50">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
