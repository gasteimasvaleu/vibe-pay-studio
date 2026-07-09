import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPromotion } from "@/lib/promotions.functions";
import {
  PromotionHeader,
  PromotionProgress,
  PromotionShell,
} from "@/components/promotion/PromotionShell";

export const Route = createFileRoute("/_authenticated/promotion")({
  head: () => ({
    meta: [
      { title: "Criar oferta · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromotionPage,
});

type Step = "name" | "quantity" | "duration" | "gate" | "discount" | "description" | "success";

const DURATIONS = [1, 2, 3, 4, 5, 6, 7];
const DISCOUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const MIN_PRICE = 21;
const MIN_QUANTITY = 10;

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PromotionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createPromotionFn = useServerFn(createPromotion);

  // form data
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [discountPct, setDiscountPct] = useState<number | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("price_monthly")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      setMonthlyPrice(data?.price_monthly ?? 0);
      setLoadingPrice(false);
    })();
  }, []);

  useEffect(() => {
    setSelectOpen(false);
  }, [step]);

  const order: Step[] = ["name", "quantity", "duration", "gate", "discount", "description", "success"];
  const visibleOrder = order.filter((s) => {
    if (s === "gate") return (monthlyPrice ?? 0) < MIN_PRICE;
    if (s === "discount" || s === "description") return (monthlyPrice ?? 0) >= MIN_PRICE;
    return true;
  });
  const stepIndex = Math.max(0, visibleOrder.indexOf(step));
  const totalSteps = visibleOrder.length;

  const goBack = () => {
    if (stepIndex === 0) {
      navigate({ to: "/dashboard" });
      return;
    }
    setStep(visibleOrder[stepIndex - 1]!);
  };

  const goNext = (target?: Step) => {
    if (target) {
      setStep(target);
      return;
    }
    const next = visibleOrder[stepIndex + 1];
    if (next) setStep(next);
  };

  const primaryBtn =
    "w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const outlineBtn =
    "w-full py-3.5 rounded-full border border-border bg-background text-foreground font-semibold hover:bg-muted transition";

  if (loadingPrice) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ============ STEP: NAME ============
  if (step === "name") {
    const valid = name.trim().length >= 3;
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footer={
          <button disabled={!valid} onClick={() => goNext()} className={primaryBtn}>
            Avançar
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader
          title="Dê um nome à sua oferta"
          subtitle="Crie um nome para organizar suas ofertas com facilidade"
          compact
        />
        <PillInput
          label="Nome da campanha"
          value={name}
          onChange={setName}
          autoFocus
        />
      </PromotionShell>
    );
  }

  // ============ STEP: QUANTITY ============
  if (step === "quantity") {
    const n = parseInt(quantity || "0", 10);
    const valid = n >= MIN_QUANTITY;
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footer={
          <button disabled={!valid} onClick={() => goNext()} className={primaryBtn}>
            Avançar
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader
          title="Escolha o número máximo de assinaturas que poderão aproveitar a oferta"
          subtitle="Lembre-se: A oferta só vale para assinaturas de 1 mês"
        />
        <PillInput
          label="Quantidade de assinaturas"
          value={quantity}
          onChange={(v) => setQuantity(v.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          autoFocus
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Mínimo: <b className="text-foreground">{MIN_QUANTITY} assinaturas</b>
        </p>
      </PromotionShell>
    );
  }

  // ============ STEP: DURATION ============
  if (step === "duration") {
    const valid = durationDays !== null;
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footerLowered={selectOpen}
        footer={
          <button disabled={!valid} onClick={() => goNext()} className={primaryBtn}>
            Avançar
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader
          title="Escolha por quanto tempo sua oferta estará ativa"
          subtitle="Defina por quanto tempo ficará disponível para novos assinantes"
        />
        <PillSelect
          label="Duração da oferta"
          value={durationDays !== null ? `${durationDays} ${durationDays === 1 ? "dia" : "dias"}` : ""}
          options={DURATIONS.map((d) => ({
            label: `${d} ${d === 1 ? "dia" : "dias"}`,
            value: d,
          }))}
          onSelect={(v) => setDurationDays(v as number)}
          onOpenChange={setSelectOpen}
        />
      </PromotionShell>
    );
  }

  // ============ STEP: PRICE GATE ============
  if (step === "gate") {
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footer={
          <button
            onClick={() => navigate({ to: "/creator/onboarding/assinatura" })}
            className={primaryBtn}
          >
            Ir para assinaturas
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader title="Ofertas indisponíveis" />
        <div className="space-y-4 text-muted-foreground">
          <p>
            O valor da assinatura precisa ser de{" "}
            <b className="text-foreground">R$ {formatBRL(MIN_PRICE)} ou mais</b> para ativar ofertas.
          </p>
          <p>Com esse valor, você já pode criar ofertas com desconto.</p>
          <p>Ajuste o valor da assinatura para continuar.</p>
        </div>
      </PromotionShell>
    );
  }

  // ============ STEP: DISCOUNT ============
  if (step === "discount") {
    const monthly = monthlyPrice ?? 0;
    const promoValue = discountPct !== null ? monthly * (1 - discountPct / 100) : null;
    const valid = discountPct !== null;
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footerLowered={selectOpen}
        footer={
          <button disabled={!valid} onClick={() => goNext()} className={primaryBtn}>
            Avançar
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader
          title="Defina o desconto ideal para atrair novos assinantes"
          subtitle="Escolha entre 5% até 60% de desconto para sua assinatura de 1 mês"
        />
        <PillSelect
          label="Desconto promocional"
          value={discountPct !== null ? `${discountPct}%` : ""}
          options={DISCOUNTS.map((d) => ({ label: `${d}%`, value: d }))}
          onSelect={(v) => setDiscountPct(v as number)}
          onOpenChange={setSelectOpen}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Valor de assinatura mínima:{" "}
          <b className="text-foreground">R${formatBRL(monthly)}</b>
        </p>

        {promoValue !== null && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <p className="font-semibold text-foreground">Valor da assinatura</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Mensal</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  R${formatBRL(monthly)}
                </p>
              </div>
              <div className="border-l border-border pl-4">
                <p className="text-sm text-muted-foreground">Promocional</p>
                <p className="mt-1 text-lg font-bold text-primary">
                  R${formatBRL(promoValue)}{" "}
                  <span className="text-sm text-muted-foreground">(-{discountPct}%)</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </PromotionShell>
    );
  }

  // ============ STEP: DESCRIPTION ============
  if (step === "description") {
    const valid = description.trim().length > 0 && !submitting;
    return (
      <PromotionShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        onBack={goBack}
        footer={
          <button
            disabled={!valid}
            onClick={async () => {
              if (durationDays === null || discountPct === null) return;
              setSubmitting(true);
              try {
                await createPromotionFn({
                  data: {
                    name: name.trim(),
                    maxSubscriptions: parseInt(quantity, 10),
                    durationDays,
                    discountPct,
                    description: description.trim(),
                  },
                });
                goNext("success");
              } catch (err) {
                console.error(err);
                toast.error(
                  err instanceof Error ? err.message : "Não foi possível criar a oferta",
                );
              } finally {
                setSubmitting(false);
              }
            }}
            className={primaryBtn}
          >
            {submitting ? "Criando..." : "Concluir"}
          </button>
        }
      >
        <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
        <PromotionHeader
          title="Escreva uma descrição para a oferta"
          subtitle="Uma mensagem bem escrita pode convencer e conquistar novos assinantes"
        />
        <div className="rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-primary transition-colors">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 100))}
            placeholder="Descrição para oferta"
            rows={4}
            className="w-full bg-transparent outline-none resize-none text-base text-foreground placeholder:text-muted-foreground"
          />
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {description.length} / 100
          </p>
        </div>
      </PromotionShell>
    );
  }

  // ============ STEP: SUCCESS ============
  const monthly = monthlyPrice ?? 0;
  const promoValue = discountPct !== null ? monthly * (1 - discountPct / 100) : monthly;
  return (
    <PromotionShell
      step={stepIndex + 1}
      totalSteps={totalSteps}
      onBack={() => navigate({ to: "/dashboard" })}
      footer={
        <div className="space-y-3">
          <button onClick={() => navigate({ to: "/dashboard" })} className={primaryBtn}>
            Ver perfil
          </button>
          {/* TODO: rota /promotions com listagem das ofertas do criador */}
          <button onClick={() => navigate({ to: "/dashboard" })} className={outlineBtn}>
            Ver minhas ofertas
          </button>
        </div>
      }
    >
      <PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />
      <PromotionHeader
        title="Parabéns, sua oferta foi criada com sucesso!"
        subtitle="Sua oferta já está disponível no seu perfil para todos usuários"
      />

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate">{name || "Sua oferta"}</p>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 rounded-full bg-muted w-2/3" />
          <div className="h-3 rounded-full bg-muted w-1/2" />
        </div>
        <div className="mt-6">
          <div className="flex justify-center mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
              Economize {discountPct ?? 0}%
            </span>
          </div>
          <div className="rounded-full bg-gradient-primary text-primary-foreground text-center py-3 px-4 font-bold text-sm sm:text-base">
            Assinar agora R$ {formatBRL(promoValue)}
          </div>
          <p className="mt-3 text-right text-xs text-muted-foreground">
            Preço original <span className="line-through">R${formatBRL(monthly)}</span>
          </p>
        </div>
      </div>
    </PromotionShell>
  );
}

// ============ inputs ============

function PillInput({
  label,
  value,
  onChange,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  autoFocus?: boolean;
}) {
  return (
    <div className="rounded-full border border-border bg-card px-6 py-3 focus-within:border-primary transition-colors">
      <label className="block text-xs text-muted-foreground">{label}</label>
      <input
        type="text"
        inputMode={inputMode ?? "text"}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-base font-medium text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}

function PillSelect<T extends string | number>({
  label,
  value,
  options,
  onSelect,
  onOpenChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: T }>;
  onSelect: (v: T) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const updateOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => updateOpen(!open)}
        className="w-full rounded-full border border-border bg-card px-6 py-3 focus:border-primary transition-colors flex items-center"
      >
        <div className="flex-1 text-left">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="block text-base font-medium text-foreground">
            {value || <span className="text-muted-foreground">Selecione</span>}
          </span>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="relative z-10 mt-2 w-full rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                updateOpen(false);
              }}
              className="w-full text-left px-6 py-3 hover:bg-muted transition"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
