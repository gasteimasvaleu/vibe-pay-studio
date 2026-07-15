import { useState, type ReactNode } from "react";
import {
  Copy,
  Bookmark,
  Pencil,
  MessageSquareOff,
  MessageSquare,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Trash2,
  VolumeX,
  EyeOff,
  Flag,
} from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showTopBanner } from "@/components/ui/top-banner";
import { EditCaptionDialog } from "@/components/feed/EditCaptionDialog";
import type { FeedItem } from "@/lib/publications.functions";
import {
  deletePublication,
  setPublicationArchived,
  setPublicationCommentsDisabled,
} from "@/lib/publications.functions";

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
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const queryClient = useQueryClient();

  const toggleCommentsFn = useServerFn(setPublicationCommentsDisabled);
  const archiveFn = useServerFn(setPublicationArchived);
  const deleteFn = useServerFn(deletePublication);

  const invalidateFeeds = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["user-publications"] });
    queryClient.invalidateQueries({ queryKey: ["archived-posts"] });
  };


  const close = () => setOpen(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/publicacao/${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showTopBanner("Link copiado");
    } catch {
      showTopBanner("Não foi possível copiar o link");
    }
    close();
  };

  const soon = () => {
    showTopBanner("Em breve");
    close();
  };

  const toggleCommentsMutation = useMutation({
    mutationFn: () =>
      toggleCommentsFn({
        data: { id: item.id, disabled: !item.comments_disabled },
      }),
    onSuccess: (res) => {
      showTopBanner(res.disabled ? "Comentários desabilitados" : "Comentários habilitados");
      invalidateFeeds();
    },
    onError: (e: unknown) =>
      showTopBanner(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const isArchived = !!item.archived_at;

  const archiveMutation = useMutation({
    mutationFn: () =>
      archiveFn({ data: { id: item.id, archived: !isArchived } }),
    onSuccess: () => {
      showTopBanner(isArchived ? "Post desarquivado" : "Post arquivado");
      invalidateFeeds();
    },
    onError: (e: unknown) =>
      showTopBanner(e instanceof Error ? e.message : "Erro ao arquivar"),
  });


  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { id: item.id } }),
    onSuccess: () => {
      showTopBanner("Post excluído");
      invalidateFeeds();
      setConfirmDelete(false);
    },
    onError: (e: unknown) =>
      showTopBanner(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const ownerOptions: Array<{
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
      onClick: () => {
        close();
        setEditOpen(true);
      },
    },
    {
      key: "toggle-comments",
      label: item.comments_disabled ? "Habilitar comentários" : "Desabilitar comentários",
      icon: item.comments_disabled ? (
        <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
      ) : (
        <MessageSquareOff className="h-6 w-6" strokeWidth={1.75} />
      ),
      onClick: () => {
        close();
        toggleCommentsMutation.mutate();
      },
    },
    {
      key: "archive",
      label: isArchived ? "Desarquivar post" : "Arquivar post",
      icon: <Archive className="h-6 w-6" strokeWidth={1.75} />,
      onClick: () => {
        close();
        archiveMutation.mutate();
      },
    },
  ];

  const viewerOptions: Array<{
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
      key: "mute",
      label: `Silenciar @${item.author_username ?? "usuario"}`,
      icon: <VolumeX className="h-6 w-6" strokeWidth={1.75} />,
      onClick: soon,
    },
    {
      key: "not-interested",
      label: "Não tenho interesse",
      icon: <EyeOff className="h-6 w-6" strokeWidth={1.75} />,
      onClick: soon,
    },
  ];

  const isOwner = item.is_owner;
  const options = isOwner ? ownerOptions : viewerOptions;
  const destructive = isOwner
    ? { label: "Excluir post", icon: <Trash2 className="h-6 w-6 text-destructive" strokeWidth={1.75} /> }
    : { label: "Denunciar post", icon: <Flag className="h-6 w-6 text-destructive" strokeWidth={1.75} /> };

  const handleDestructive = () => {
    if (isOwner) {
      close();
      setConfirmDelete(true);
    } else {
      soon();
    }
  };

  return (
    <>
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
            onClick={handleDestructive}
            className="mt-3 w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors text-left"
          >
            {destructive.icon}
            <span className="text-sm font-semibold text-destructive">{destructive.label}</span>
          </button>
        </PopoverContent>
      </Popover>

      {isOwner && (
        <EditCaptionDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          publicationId={item.id}
          initialCaption={item.caption}
        />
      )}

      {isOwner && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir post?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente. O post e todas as mídias serão removidos e não poderão ser recuperados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
