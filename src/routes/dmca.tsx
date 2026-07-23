import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "Política de Direitos Autorais (DMCA) — Monetisexy" },
      {
        name: "description",
        content:
          "Política de Direitos Autorais (DMCA) da Monetisexy: notificação e remoção de conteúdo que viole direitos autorais ou de imagem.",
      },
      { property: "og:title", content: "Política de Direitos Autorais (DMCA) — Monetisexy" },
      {
        property: "og:description",
        content:
          "Política de Direitos Autorais (DMCA) da Monetisexy: notificação e remoção de conteúdo que viole direitos autorais ou de imagem.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://monetisexy.com/dmca" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Política de Direitos Autorais (DMCA) — Monetisexy" },
      {
        name: "twitter:description",
        content:
          "Política de Direitos Autorais (DMCA) da Monetisexy: notificação e remoção de conteúdo que viole direitos autorais ou de imagem.",
      },
    ],
    links: [{ rel: "canonical", href: "https://monetisexy.com/dmca" }],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Política de Direitos Autorais (DMCA) — Monetisexy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 23/07/2026
        </p>

        <Secao titulo="1. Introdução">
          <p>
            A Monetisexy respeita a propriedade intelectual de terceiros e adota,
            voluntariamente, princípios inspirados no Digital Millennium Copyright Act
            (DMCA) dos Estados Unidos, em conjunto com a Lei de Direitos Autorais
            brasileira (Lei nº 9.610/1998), para garantir um processo claro de
            notificação e remoção de conteúdo que viole direitos autorais ou de imagem.
          </p>
        </Secao>

        <Secao titulo="2. Propósito">
          <p>
            Estabelecer diretrizes para o recebimento, análise e resposta a
            notificações de violação de direitos autorais, de imagem ou de conteúdo
            íntimo compartilhado sem consentimento na plataforma.
          </p>
        </Secao>

        <Secao titulo="3. Escopo">
          <p>
            Esta Política se aplica a todo conteúdo publicado na Monetisexy — feed,
            mensagens de chat, Mural, transmissões ao vivo e qualquer outro formato de
            mídia — e a toda notificação de violação recebida por qualquer um dos canais
            descritos na Seção 7.
          </p>
        </Secao>

        <Secao titulo="4. Diretrizes Gerais">
          <p>A Monetisexy compromete-se a:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Analisar toda notificação de violação recebida de forma diligente e em prazo
              razoável;
            </li>
            <li>
              Remover ou desabilitar o acesso ao conteúdo denunciado quando a notificação
              for válida e fundamentada;
            </li>
            <li>
              Notificar o autor do conteúdo removido sobre o motivo da remoção, quando
              aplicável;
            </li>
            <li>
              Aplicar as sanções previstas nos Termos de Uso a contas reincidentes em
              violações comprovadas.
            </li>
          </ul>
        </Secao>

        <Secao titulo="5. Pedido de Remoção por Terceiros Retratados em Conteúdo">
          <p>
            5.1. Qualquer pessoa que apareça em um conteúdo publicado na Monetisexy sem
            ter autorizado sua publicação pode solicitar a remoção, mesmo que essa pessoa
            não seja a titular da conta que publicou o material.
          </p>
          <p className="mt-3">
            5.2. Para viabilizar a análise, a solicitação deve incluir:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Link direto do conteúdo;</li>
            <li>Documento oficial com foto do solicitante;</li>
            <li>
              Uma foto de verificação segurando o documento, para confirmar que o
              solicitante é de fato a pessoa retratada;
            </li>
            <li>Descrição de como o conteúdo foi obtido/publicado sem autorização.</li>
          </ul>
          <p className="mt-3">
            5.3. Solicitações que atendam a esses critérios são tratadas com prioridade e
            o conteúdo é suspenso preventivamente durante a análise.
          </p>
        </Secao>

        <Secao titulo="6. Conteúdo Íntimo Não Consentido">
          <p>
            6.1. É terminantemente proibido publicar, enviar ou distribuir, por qualquer
            meio da plataforma, conteúdo de natureza íntima envolvendo terceiros sem o
            consentimento expresso e verificável dessas pessoas.
          </p>
          <p className="mt-3">
            6.2. Denúncias dessa natureza recebem prioridade máxima de análise, com
            suspensão imediata do conteúdo denunciado enquanto a apuração ocorre.
          </p>
          <p className="mt-3">
            6.3. Contas responsáveis pela publicação de conteúdo íntimo não consentido
            estão sujeitas a suspensão imediata e exclusão definitiva, sem prejuízo de
            reporte às autoridades competentes e de responsabilização civil e criminal do
            usuário responsável, nos termos da legislação aplicável (incluindo a Lei nº
            13.718/2018, que tipifica o crime de divulgação de cena de estupro ou de cena
            de sexo).
          </p>
        </Secao>

        <Secao titulo="7. Como Notificar uma Violação">
          <p>
            Notificações de violação de direitos autorais ou de imagem devem ser enviadas
            para{" "}
            <a
              href="mailto:contato@monetisexy.com"
              className="text-primary hover:underline"
            >
              contato@monetisexy.com
            </a>{" "}
            (nosso agente designado para questões de propriedade intelectual), contendo:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Identificação da obra ou material protegido supostamente violado;
            </li>
            <li>Link direto do conteúdo denunciado na plataforma;</li>
            <li>Informações de contato do notificante (nome, e-mail, telefone);</li>
            <li>
              Declaração, sob pena de responsabilidade legal, de que as informações são
              verdadeiras e de que o notificante é o titular do direito ou está autorizado
              a agir em seu nome;
            </li>
            <li>Assinatura (física ou eletrônica) do notificante.</li>
          </ul>
        </Secao>

        <Secao titulo="8. Contranotificação">
          <p>
            O usuário que teve conteúdo removido por notificação de violação pode
            contestar a remoção enviando uma contranotificação ao mesmo canal, com:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Identificação do conteúdo removido e sua localização anterior na
              plataforma;
            </li>
            <li>
              Declaração, sob pena de responsabilidade legal, de que o conteúdo foi
              removido por engano ou identificação incorreta;
            </li>
            <li>Consentimento com a jurisdição brasileira para resolução de eventual disputa;</li>
            <li>Informações de contato e assinatura do usuário.</li>
          </ul>
          <p className="mt-3">
            Notificações e contranotificações falsas ou feitas de má-fé podem resultar em
            sanções à conta responsável, incluindo suspensão ou exclusão, sem prejuízo
            de responsabilização civil pelos danos causados.
          </p>
        </Secao>

        <Secao titulo="9. Considerações Finais">
          <p>
            A Monetisexy reserva-se o direito de atualizar esta Política a qualquer
            momento, para refletir mudanças na legislação ou em nossos processos
            internos. A versão vigente estará sempre disponível nesta página.
          </p>
        </Secao>
      </article>
    </SiteLayout>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 space-y-3 text-sm leading-relaxed">
      <h2 className="text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}
