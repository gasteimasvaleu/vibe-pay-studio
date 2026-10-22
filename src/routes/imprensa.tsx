import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/imprensa")({
  head: () =>
    infoHead(
      "imprensa",
      "Imprensa · Monetisexy",
      "Informações para jornalistas: quem é a Monetisexy, fatos sobre a plataforma, kit de imprensa e contato.",
    ),
  component: () => (
    <InfoPage
      title="Imprensa"
      intro="Informações e materiais para jornalistas e veículos de comunicação."
      sections={[
        {
          title: "Quem somos",
          paragraphs: [
            "A Monetisexy é uma plataforma brasileira de creator economy para maiores de 18 anos. Criadores publicam conteúdo, vendem assinaturas e recebem pagamentos em reais, com repasse via Pix.",
          ],
        },
        {
          title: "Fatos sobre a plataforma",
          items: [
            "85% de cada venda fica com o criador.",
            "Pagamentos por Pix e cartão, em reais.",
            "Verificação de identidade obrigatória para todo criador.",
            "Assinaturas, conteúdo avulso, chat pago, lives e chamadas de vídeo.",
            "Suporte em português, com resposta em até 48 horas úteis.",
          ],
        },
        {
          title: "Kit de imprensa",
          paragraphs: [
            "Logos, imagens e informações institucionais são enviados sob solicitação. Fale com a nossa equipe informando o veículo e a pauta.",
          ],
        },
      ]}
      cta={{ label: "Falar com a assessoria", email: "imprensa@monetisexy.com" }}
    />
  ),
});
