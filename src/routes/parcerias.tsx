import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/parcerias")({
  head: () =>
    infoHead(
      "parcerias",
      "Parcerias · Monetisexy",
      "Seja parceiro da Monetisexy: marcas, influenciadores e sites de review e comparativos.",
    ),
  component: () => (
    <InfoPage
      title="Parcerias"
      intro="Queremos crescer junto com quem fala com criadores e com o público."
      sections={[
        {
          title: "Tipos de parceria",
          items: [
            "Marcas que querem se conectar com criadores e suas audiências.",
            "Influenciadores que indicam a plataforma para outros criadores.",
            "Sites de review e comparativos de plataformas para criadores.",
          ],
        },
        {
          title: "O que oferecemos",
          items: [
            "Atendimento direto com a nossa equipe.",
            "Informações atualizadas sobre a plataforma e suas condições.",
            "Condições especiais conforme o perfil da parceria.",
          ],
        },
      ]}
      cta={{ label: "Propor uma parceria", email: "parcerias@monetisexy.com" }}
    />
  ),
});
