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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { FeedItem } from "@/lib/publications.functions";

export function PublicationOptionsSheet({
  item,
  open,
  onOpenChange,
  onToggleBookmark,
}: {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleBookmark?: (item: FeedItem) => void;
}) {
  if (!item) return null;

  const copyLink = async () => {
    const url = `${window.location.origin}/publicacao/${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
    onOpenChange(false);
  };

  const soon = () => {
    toast("Em breve");
    onOpenChange(false);
  };

  const options: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
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
        onOpenChange(false);
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
      label: item.comments_disabled
        ? "Habilitar comentários"
        : "Desabilitar comentários",
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 gap-0 rounded-t-3xl bg-background border-border sm:max-w-[480px] sm:mx-auto sm:left-0 sm:right-0 duration-300"
      >
        <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-muted" />

        <div className="px-4 pt-2 pb-4">
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.onClick}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-foreground/5 transition-colors"
              >
                <span className="text-foreground">{opt.icon}</span>
                <span className="text-base font-semibold text-foreground">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={soon}
            className="mt-3 w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors text-left"
          >
            <Trash2 className="h-6 w-6 text-destructive" strokeWidth={1.75} />
            <span className="text-base font-semibold text-destructive">
              Excluir post
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
