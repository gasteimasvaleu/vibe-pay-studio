import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MoreHorizontal,
  Reply,
  Copy,
  Forward,
  Download,
  Flag,
  Trash,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ActionPopover,
  ActionPopoverList,
  ActionPopoverItem,
  ActionPopoverDestructive,
} from "@/components/ui/action-popover";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hideMessageForMe,
  deleteMessageForAll,
  reportMessage,
  forwardMessage,
  listForwardTargets,
  type ChatMessage,
} from "@/lib/chat.functions";

const REASONS = [
  "Spam ou golpe",
  "Assédio ou ameaça",
  "Conteúdo impróprio",
  "Discurso de ódio",
  "Menor de idade",
  "Outro",
];

type Props = {
  message: ChatMessage;
  mine: boolean;
  threadId: string;
  onReply: (m: ChatMessage) => void;
};

export function MessageActionsMenu({ message, mine, threadId, onReply }: Props) {
  const qc = useQueryClient();
  const hideFn = useServerFn(hideMessageForMe);
  const deleteFn = useServerFn(deleteMessageForAll);
  const reportFn = useServerFn(reportMessage);
  const forwardFn = useServerFn(forwardMessage);
  const targetsFn = useServerFn(listForwardTargets);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const canDeleteForAll =
    mine && Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;
  const hasText = !!message.content?.trim();
  const hasMedia = (message.metadata?.media?.length ?? 0) > 0;
  const canDownload = hasMedia && message.unlocked;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["chat", "messages", threadId] });

  const doHide = useMutation({
    mutationFn: () => hideFn({ data: { messageId: message.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Mensagem apagada para você");
      setConfirmHide(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doDelete = useMutation({
    mutationFn: () => deleteFn({ data: { messageId: message.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Mensagem apagada");
      setConfirmDelete(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReport = useMutation({
    mutationFn: () =>
      reportFn({
        data: {
          messageId: message.id,
          reason,
          details: details.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Denúncia enviada");
      setReportOpen(false);
      setDetails("");
      setReason(REASONS[0]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doForward = useMutation({
    mutationFn: (toThreadId: string) =>
      forwardFn({ data: { messageId: message.id, toThreadId } }),
    onSuccess: () => {
      toast.success("Mensagem encaminhada");
      setForwardOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content ?? "");
      toast.success("Texto copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  async function handleDownload() {
    const first = message.metadata?.media?.[0];
    if (!first?.url) return;
    try {
      const res = await fetch(first.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      const ext = (first.mime.split("/")[1] ?? "bin").split(";")[0];
      a.download = `chat-${message.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("Falha ao baixar mídia");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ações da mensagem"
            className={cn(
              "h-7 w-7 shrink-0 grid place-items-center rounded-full",
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              "opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={mine ? "end" : "start"} className="w-48">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onReply(message);
            }}
          >
            <Reply className="h-4 w-4" />
            Responder
          </DropdownMenuItem>
          {hasText && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void handleCopy();
              }}
            >
              <Copy className="h-4 w-4" />
              Copiar texto
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setForwardOpen(true);
            }}
          >
            <Forward className="h-4 w-4" />
            Encaminhar
          </DropdownMenuItem>
          {canDownload && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void handleDownload();
              }}
            >
              <Download className="h-4 w-4" />
              Salvar mídia
            </DropdownMenuItem>
          )}
          {!mine && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setReportOpen(true);
              }}
            >
              <Flag className="h-4 w-4" />
              Denunciar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmHide(true);
            }}
          >
            <Trash className="h-4 w-4" />
            Apagar para mim
          </DropdownMenuItem>
          {canDeleteForAll && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmDelete(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Apagar para todos
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmHide} onOpenChange={setConfirmHide}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar apenas para você?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem some da sua tela, mas continua visível para a outra pessoa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doHide.mutate();
              }}
              disabled={doHide.isPending}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar para todos?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem some para os dois lados. Só é possível dentro de 15 minutos do envio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                doDelete.mutate();
              }}
              disabled={doDelete.isPending}
            >
              Apagar para todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar mensagem</DialogTitle>
            <DialogDescription>
              Sua denúncia é anônima. Nossa equipe vai revisar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
              {REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`msg-r-${r}`} />
                  <Label htmlFor={`msg-r-${r}`} className="text-sm font-normal">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Descreva com mais detalhes (opcional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => doReport.mutate()} disabled={doReport.isPending}>
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ForwardDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        currentThreadId={threadId}
        onPick={(id) => doForward.mutate(id)}
        loading={doForward.isPending}
        fetcher={() => targetsFn()}
      />
    </>
  );
}

function ForwardDialog({
  open,
  onOpenChange,
  currentThreadId,
  onPick,
  loading,
  fetcher,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentThreadId: string;
  onPick: (threadId: string) => void;
  loading: boolean;
  fetcher: () => Promise<
    Array<{ threadId: string; partnerUsername: string; partnerAvatar: string | null }>
  >;
}) {
  const { data: threads, isLoading } = useQuery({
    queryKey: ["chat", "forward-targets"],
    queryFn: fetcher,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaminhar mensagem</DialogTitle>
          <DialogDescription>
            Escolha uma conversa para reenviar o conteúdo.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground p-4">Carregando…</div>
          )}
          {threads
            ?.filter((t) => t.threadId !== currentThreadId)
            .map((t) => (
              <button
                key={t.threadId}
                type="button"
                disabled={loading}
                onClick={() => onPick(t.threadId)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left disabled:opacity-50"
              >
                {t.partnerAvatar ? (
                  <img
                    src={t.partnerAvatar}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
                    {t.partnerUsername.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-sm font-medium">@{t.partnerUsername}</div>
              </button>
            ))}
          {threads && threads.length <= 1 && !isLoading && (
            <div className="text-sm text-muted-foreground p-4">
              Nenhuma outra conversa disponível.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
