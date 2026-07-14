import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showTopBanner } from "@/components/ui/top-banner";
import { updatePublicationCaption } from "@/lib/publications.functions";

export function EditCaptionDialog({
  open,
  onOpenChange,
  publicationId,
  initialCaption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationId: string;
  initialCaption: string | null;
}) {
  const [value, setValue] = useState(initialCaption ?? "");
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updatePublicationCaption);

  useEffect(() => {
    if (open) setValue(initialCaption ?? "");
  }, [open, initialCaption]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({ data: { id: publicationId, caption: value.trim() || null } }),
    onSuccess: () => {
      showTopBanner("Legenda atualizada");
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-publications"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      showTopBanner(e instanceof Error ? e.message : "Erro ao salvar");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar legenda</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder="Escreva uma legenda…"
        />
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/2000
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
