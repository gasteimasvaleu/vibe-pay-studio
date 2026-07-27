import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "creator-hub-tour-v1";

const SLIDES: Array<{ title: string; body: string }> = [
  {
    title: "Seu painel em 3 áreas",
    body: "Notificações, Destaques e Pergunte. Use os botões do topo pra alternar a qualquer momento — o número na bolinha mostra quantos itens precisam da sua atenção em cada área.",
  },
  {
    title: "Foque no que importa",
    body: "Filtre suas notificações por Vendas, Mimos, Comentários ou Feed (curtidas e menções dos seus assinantes). Toque em Todas pra voltar à lista completa.",
  },
  {
    title: "Notificações em tempo real",
    body: "Cada venda, mimo, comentário e curtida aparece aqui em ordem cronológica com avatar e valor recebido, quando aplicável.",
  },
  {
    title: "Vendas",
    body: "Acompanhe o faturamento dos últimos 7 dias, novas assinantes no período e sua mídia mais vendida. Ideal pra entender o que está gerando mais receita na sua semana.",
  },
  {
    title: "Conquistas",
    body: "Marcos de R$ 100 mil, R$ 500 mil e R$ 1 milhão de faturamento. Ao atingir um marco, você pode solicitar o troféu físico direto por aqui — a Monetisexy envia pra você.",
  },
  {
    title: "Moderação",
    body: "Postagens suas que foram moderadas aparecem aqui. Você tem 7 dias pra contestar cada decisão. O número na bolinha mostra quantas contestações ainda estão disponíveis.",
  },
  {
    title: "Perguntas frequentes",
    body: "Respostas rápidas pras dúvidas mais comuns — saques, planos, moderação, como funcionam os troféus. Toque em cada pergunta pra ver a resposta.",
  },
];

export function CreatorHubTour({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const total = SLIDES.length;
  const s = SLIDES[step];
  const isLast = step === total - 1;

  const done = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // ignore
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : done())}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader className="space-y-3 text-left">
          <p className="text-sm font-semibold text-primary">
            {step + 1} / {total}
          </p>
          <DialogTitle className="text-xl font-bold">{s.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground/80">
            {s.body}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex items-center justify-end gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="rounded-full px-6"
              onClick={() => setStep((v) => Math.max(0, v - 1))}
            >
              Anterior
            </Button>
          )}
          {isLast ? (
            <Button className="rounded-full px-6" onClick={done}>
              Concluir
            </Button>
          ) : (
            <Button
              className="rounded-full px-6"
              onClick={() => setStep((v) => Math.min(total - 1, v + 1))}
            >
              Próximo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCreatorHubTourAutoOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // ignore
    }
  }, []);
  return [open, setOpen];
}
