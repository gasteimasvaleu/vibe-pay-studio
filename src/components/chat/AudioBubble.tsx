import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  variant: "mine" | "theirs";
}

const BARS = 32;

function seededHeights(src: string): number[] {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const arr: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    arr.push(6 + ((h >>> 8) % 15)); // 6..20 px
  }
  return arr;
}

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioBubble({ src, variant }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const heights = useRef(seededHeights(src)).current;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  };

  const mine = variant === "mine";
  const progress = duration > 0 ? current / duration : 0;
  const shownTime = playing || current > 0 ? current : duration;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[240px] max-w-[280px]",
        mine ? "text-white" : "text-foreground",
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition",
          mine ? "bg-white/20 hover:bg-white/30 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div
        className="flex-1 flex items-center gap-[2px] h-6 cursor-pointer"
        onClick={seek}
      >
        {heights.map((h, i) => {
          const active = i / BARS <= progress;
          return (
            <div
              key={i}
              className={cn(
                "w-[2px] rounded-full transition-colors",
                mine
                  ? active
                    ? "bg-white"
                    : "bg-white/40"
                  : active
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Mic className={cn("h-3 w-3", mine ? "text-white/70" : "text-muted-foreground")} />
        <span className={cn("text-[10px] tabular-nums", mine ? "text-white/80" : "text-muted-foreground")}>
          {fmt(shownTime)}
        </span>
      </div>
    </div>
  );
}
