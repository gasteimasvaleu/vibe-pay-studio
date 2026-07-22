import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MoreVertical,
  UserRound,
  BellOff,
  Bell,
  ShieldOff,
  Shield,
  Flag,
  Eraser,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { clearThread, deleteThreadForMe, reportUser } from "@/lib/chat.functions";
import { isMuted, muteProfile, unmuteProfile } from "@/lib/mutes.functions";
import {
  isSubscriberRestricted,
  restrictSubscriber,
  unrestrictSubscriber,
} from "@/lib/restrictions.functions";

type Props = {
  threadId: string;
  partnerId: string;
  partnerUsername: string;
};

const REASONS = [
  "Spam ou golpe",
  "Assédio ou ameaça",
  "Conteúdo impróprio",
  "Discurso de ódio",
  "Menor de idade",
  "Outro",
];

export function ThreadActionsMenu({ threadId, partnerId, partnerUsername }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isMutedFn = useServerFn(isMuted);
  const muteFn = useServerFn(muteProfile);
  const unmuteFn = useServerFn(unmuteProfile);
  const isRestrictedFn = useServerFn(isSubscriberRestricted);
  const restrictFn = useServerFn(restrictSubscriber);
  const unrestrictFn = useServerFn(unrestrictSubscriber);
  const clearFn = useServerFn(clearThread);
  const deleteFn = useServerFn(deleteThreadForMe);
  const reportFn = useServerFn(reportUser);

  const { data: muted } = useQuery({
    queryKey: ["chat", "muted", partnerId],
    queryFn: () => isMutedFn({ data: { profileId: partnerId } }),
  });
  const { data: restricted } = useQuery({
    queryKey: ["chat", "restricted", partnerId],
    queryFn: () => isRestrictedFn({ data: { subscriberId: partnerId } }),
  });

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const toggleMute = useMutation({
    mutationFn: async () => {
      if (muted?.muted) await unmuteFn({ data: { profileId: partnerId } });
      else await muteFn({ data: { profileId: partnerId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "muted", partnerId] });
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
      toast.success(muted?.muted ? "Notificações reativadas" : "Conversa silenciada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRestrict = useMutation({
    mutationFn: async () => {
      if (restricted?.restricted)
        await unrestrictFn({ data: { subscriberId: partnerId } });
      else await restrictFn({ data: { subscriberId: partnerId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "restricted", partnerId] });
      toast.success(
        restricted?.restricted ? "Restrição removida" : "Assinante restringido",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doClear = useMutation({
    mutationFn: () => clearFn({ data: { threadId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
      toast.success("Conversa limpa");
      setConfirmClear(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doDelete = useMutation({
    mutationFn: () => deleteFn({ data: { threadId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
      toast.success("Conversa apagada");
      setConfirmDelete(false);
      navigate({ to: "/chat" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReport = useMutation({
    mutationFn: () =>
      reportFn({
        data: {
          targetUserId: partnerId,
          reason,
          details: details.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Denúncia enviada. Nossa equipe vai revisar.");
      setReportOpen(false);
      setDetails("");
      setReason(REASONS[0]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ações da conversa"
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link to="/perfil/$username" params={{ username: partnerUsername }}>
              <UserRound className="h-4 w-4" />
              Ver perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              toggleMute.mutate();
            }}
          >
            {muted?.muted ? (
              <>
                <Bell className="h-4 w-4" />
                Reativar notificações
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                Silenciar conversa
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              toggleRestrict.mutate();
            }}
          >
            {restricted?.restricted ? (
              <>
                <ShieldOff className="h-4 w-4" />
                Remover restrição
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Restringir assinante
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setReportOpen(true);
            }}
          >
            <Flag className="h-4 w-4" />
            Denunciar usuário
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmClear(true);
            }}
          >
            <Eraser className="h-4 w-4" />
            Limpar conversa
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Apagar conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens desta conversa vão sumir apenas para você.
              @{partnerUsername} continuará vendo o histórico normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doClear.mutate();
              }}
              disabled={doClear.isPending}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa vai sumir da sua lista. Se @{partnerUsername} enviar
              uma nova mensagem, ela volta a aparecer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDelete.mutate();
              }}
              disabled={doDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar @{partnerUsername}</DialogTitle>
            <DialogDescription>
              Sua denúncia é anônima. Nossa equipe de moderação vai analisar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
              {REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`reason-${r}`} />
                  <Label htmlFor={`reason-${r}`} className="text-sm font-normal">
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
            <Button
              onClick={() => doReport.mutate()}
              disabled={doReport.isPending}
            >
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
