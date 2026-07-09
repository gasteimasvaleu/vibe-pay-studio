type EarningsItem = { title: string; subtitle: string; value: string };

const DEFAULT_ITEMS: EarningsItem[] = [
  { title: "Faturamento", subtitle: "Hoje", value: "R$ -" },
  { title: "Liberado", subtitle: "Valor disponível para saque", value: "R$ -" },
  { title: "Total", subtitle: "Saldo liberado + a liberar", value: "R$ -" },
];

export function EarningsSummary({ items = DEFAULT_ITEMS }: { items?: EarningsItem[] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {it.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{it.subtitle}</p>
          <p className="mt-4 text-3xl font-black tracking-tight text-foreground">
            {it.value}
          </p>
        </div>
      ))}
    </section>
  );
}
