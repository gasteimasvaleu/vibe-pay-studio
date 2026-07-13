import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Copy,
  Bookmark,
  Pencil,
  MessageSquareOff,
  MessageSquare,
  Archive,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FeedItem } from "@/lib/publications.functions";

export function PublicationOptionsMenu({
  item,
  onToggleBookmark,
  children,
}: {
  item: FeedItem;
  onToggleBookmark?: (item: FeedItem) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/publicacao/${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
    close();
  };

  const soon = () => {
    toast("Em breve");
    close();
  };

  const options: Array<{
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }> = [
    {
      key: "copy",
      label: "Copiar link",
      icon: <Copy className="h-6 w-6" strokeWidth={1.75} />,
      onClick: copyLink,
    },
    {
      key: "bookmark",
      label: item.saved_by_me ? "Remover dos favoritos" : "Adicionar aos favoritos",
      icon: (
        <Bookmark
          className={`h-6 w-6 ${item.saved_by_me ? "fill-foreground" : ""}`}
          strokeWidth={1.75}
        />
      ),
      onClick: () => {
        onToggleBookmark?.(item);
        close();
      },
    },
    {
      key: "edit",
      label: "Editar legenda",
      icon: <Pencil className="h-6 w-6" strokeWidth={1.75} />,
      onClick: soon,
    },
    {
      key: "toggle-comments",
      label: item.comments_disabled ? "Habilitar comentários" : "Desabilitar comentários",
      icon: item.comments_disabled ? (
        <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
      ) : (
        <MessageSquareOff className="h-6 w-6" strokeWidth={1.75} />
      ),
      onClick: soon,
    },
    {
      key: "archive",
      label: "Arquivar post",
      icon: <Archive className="h-6 w-6" strokeWidth={1.75} />,
      onClick: soon,
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] rounded-3xl p-4 bg-card border border-border shadow-xl"
      >
        <div className="rounded-2xl bg-background border border-border overflow-hidden divide-y divide-border">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={opt.onClick}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-foreground/5 transition-colors"
            >
              <span className="text-foreground">{opt.icon}</span>
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={soon}
          className="mt-3 w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors text-left"
        >
          <Trash2 className="h-6 w-6 text-destructive" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-destructive">Excluir post</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
