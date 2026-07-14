import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreatorEarningsSummary } from "@/lib/finance.functions";

type EarningsItem = { title: string; subtitle: string; value: string };

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmt = (cents: number) => brl.format((cents ?? 0) / 100);

export function EarningsSummary() {
  const fetchSummary = useServerFn(getCreatorEarningsSummary);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["creator-earnings-summary"],
    queryFn: () => fetchSummary(),
    staleTime: 30_000,
  });

  const items: EarningsItem[] = [
    {
      title: "Faturamento",
      subtitle: "Hoje",
      value: fmt(data?.revenueTodayCents ?? 0),
    },
    {
      title: "Liberado",
      subtitle: "Valor disponível para saque",
      value: fmt(data?.releasedCents ?? 0),
    },
    {
      title: "Total",
      subtitle: "Saldo liberado + a liberar",
      value: fmt(data?.totalCents ?? 0),
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {it.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{it.subtitle}</p>
          {isLoading ? (
            <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
              {isError ? "R$ —" : it.value}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
