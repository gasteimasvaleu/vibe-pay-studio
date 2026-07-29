import { forwardRef, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Shared action popover used for all "..." (MoreVertical/MoreHorizontal) menus.
 * Visual pattern based on PublicationOptionsMenu:
 *  - Popover arredondado (rounded-3xl) com padding interno
 *  - Lista principal agrupada em rounded-2xl com divisores
 *  - Item: ícone à esquerda, label ao lado, hover suave
 *  - Ação destrutiva destacada em bloco separado com bg-destructive/10
 */

type ActionPopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  widthClass?: string;
  contentClassName?: string;
};

export function ActionPopover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "end",
  side,
  sideOffset = 8,
  widthClass = "w-[300px]",
  contentClassName,
}: ActionPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          widthClass,
          "rounded-3xl p-3 bg-card border border-border shadow-xl",
          contentClassName,
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function ActionPopoverList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-background border border-border overflow-hidden divide-y divide-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ItemProps = {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

export const ActionPopoverItem = forwardRef<HTMLButtonElement, ItemProps>(
  function ActionPopoverItem(
    { icon, label, onClick, disabled, className, type = "button" },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
          "hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
      >
        {icon && <span className="text-foreground shrink-0">{icon}</span>}
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </button>
    );
  },
);

export function ActionPopoverDestructive({
  icon,
  label,
  onClick,
  disabled,
  className,
}: ItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "mt-3 w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left transition-colors",
        "bg-destructive/10 hover:bg-destructive/15 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      {icon && <span className="text-destructive shrink-0">{icon}</span>}
      <span className="text-sm font-semibold text-destructive">{label}</span>
    </button>
  );
}
