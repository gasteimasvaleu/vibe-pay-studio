import { useCallback, useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export function useSelection() {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<string[]>([]);

  const selected = useMemo(() => new Set(ids), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => setIds([]), []);
  const exit = useCallback(() => {
    setIds([]);
    setActive(false);
  }, []);
  const setAll = useCallback((all: string[]) => setIds(all), []);

  return { active, setActive, ids, selected, toggle, clear, exit, setAll };
}

export function SelectionHeader({
  title,
  active,
  count,
  allCount,
  showingHidden,
  onToggleActive,
  onSelectAll,
  onClearSelection,
  onToggleHidden,
}: {
  title: string;
  active: boolean;
  count: number;
  allCount: number;
  showingHidden: boolean;
  onToggleActive: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleHidden: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleHidden}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {showingHidden ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showingHidden ? "Ocultar escondidos" : "Mostrar ocultos"}
        </button>
        {active ? (
          <>
            <button
              type="button"
              onClick={count === allCount ? onClearSelection : onSelectAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {count === allCount ? "Limpar seleção" : "Selecionar todos"}
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleActive}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Selecionar
          </button>
        )}
      </div>
    </div>
  );
}

export function SelectionCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "h-5 w-5 shrink-0 rounded-md border grid place-items-center transition-colors",
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-border bg-background text-transparent hover:border-primary/60",
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}

export function SelectionActionBar({
  count,
  mode,
  busy,
  onConfirm,
}: {
  count: number;
  mode: "hide" | "restore";
  busy?: boolean;
  onConfirm: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (count === 0) return null;
  return (
    <>
      <div className="sticky bottom-4 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-foreground">
          {count} {count === 1 ? "item selecionado" : "itens selecionados"}
        </p>
        {mode === "hide" ? (
          <Button
            variant="destructive"
            className="rounded-md"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            Ocultar
          </Button>
        ) : (
          <Button
            className="rounded-md"
            disabled={busy}
            onClick={() => onConfirm()}
          >
            Restaurar
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ocultar itens selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Eles somem apenas da sua visualização. Seu saldo, seus saques e os
              relatórios continuam iguais — você pode trazê-los de volta em
              “Mostrar ocultos”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onConfirm();
              }}
            >
              Ocultar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
