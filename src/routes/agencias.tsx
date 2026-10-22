import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/agencias")({
  head: () =>
    infoHead(
      "agencias",
      "Agências · Monetisexy",
      "Para agências que gerenciam criadores: 85% de repasse, saque via Pix e painel de estatísticas.",
    ),
  component: () => (
    <InfoPage
      title="Agências"
      intro="Para agências que gerenciam a carreira de criadores."
      sections={[
        {
          title: "Por que trazer seus criadores",
          items: [
            "85% de cada venda fica com o criador.",
            "Saque via Pix, em reais.",
            "Painel de estatísticas com faturamento, alcance e top assinantes.",
            "Várias formas de ganhar: assinaturas, conteúdo avulso, chat pago, lives e chamadas de vídeo.",
          ],
        },
        {
          title: "Como funciona",
          paragraphs: [
            "Cada criador mantém a própria conta, verificada com a identidade dele. Fale com a nossa equipe para combinar o cadastro dos seus criadores e tirar dúvidas.",
          ],
        },
      ]}
      cta={{ label: "Falar com a equipe", email: "agencias@monetisexy.com" }}
    />
  ),
});
