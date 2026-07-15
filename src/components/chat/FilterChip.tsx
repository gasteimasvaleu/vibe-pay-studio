import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "bg-muted text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
