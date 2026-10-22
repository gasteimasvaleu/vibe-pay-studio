import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/uso-da-marca")({
  head: () =>
    infoHead(
      "uso-da-marca",
      "Uso da Marca · Monetisexy",
      "Regras para usar o nome e o logo Monetisexy: o que é permitido, o que não é e como pedir autorização.",
    ),
  component: () => (
    <InfoPage
      title="Uso da Marca"
      intro="Como usar o nome e o logo Monetisexy de forma correta."
      sections={[
        {
          title: "O que é permitido",
          items: [
            "Criadores podem citar a Monetisexy e divulgar o link do próprio perfil nas redes sociais.",
            "Veículos de imprensa podem usar o nome e o logo em matérias sobre a plataforma.",
            "Usar o logo nas cores e proporções originais, sem distorções.",
          ],
        },
        {
          title: "O que não é permitido",
          items: [
            "Alterar, recortar ou recolorir o logo.",
            "Sugerir parceria, patrocínio ou aprovação oficial que não existam.",
            "Usar o nome Monetisexy em domínios, perfis ou produtos de terceiros.",
            "Associar a marca a conteúdo ilegal ou que viole nossos Termos.",
          ],
        },
        {
          title: "Versões do logo",
          paragraphs: [
            "O logo é formado por “moneti” em preto e “sexy.” em degradê roxo. Em fundos escuros, “moneti” aparece em branco. Para usos comerciais ou fora dessas regras, peça autorização antes.",
          ],
        },
      ]}
      cta={{ label: "Pedir autorização", email: "marca@monetisexy.com" }}
    />
  ),
});
