import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/politicadereclamacoes")({
  head: () => ({
    meta: [
      { title: "Política de Reclamações — Monetisexy" },
      {
        name: "description",
        content:
          "Política de Reclamações da Monetisexy: como recebemos, registramos, analisamos e respondemos demandas de criadores e assinantes.",
      },
      { property: "og:title", content: "Política de Reclamações — Monetisexy" },
      {
        property: "og:description",
        content:
          "Política de Reclamações da Monetisexy: como recebemos, registramos, analisamos e respondemos demandas de criadores e assinantes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://monetisexy.com/politicadereclamacoes" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Política de Reclamações — Monetisexy" },
      {
        name: "twitter:description",
        content:
          "Política de Reclamações da Monetisexy: como recebemos, registramos, analisamos e respondemos demandas de criadores e assinantes.",
      },
    ],
    links: [{ rel: "canonical", href: "https://monetisexy.com/politicadereclamacoes" }],
  }),
  component: PoliticaDeReclamacoesPage,
});

function PoliticaDeReclamacoesPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Política de Reclamações — Monetisexy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 23/07/2026
        </p>

        <Secao titulo="1. Introdução">
          <p>
            A Monetisexy reconhece que um canal estruturado de reclamações é essencial
            para manter a confiança de criadores e assinantes na plataforma. Esta
            Política descreve como reclamações são recebidas, registradas, analisadas
            e respondidas.
          </p>
        </Secao>

        <Secao titulo="2. Propósito">
          <p>
            Estabelecer diretrizes claras e públicas sobre como a Monetisexy recebe,
            registra e trata demandas de usuários — sejam elas relacionadas a
            conteúdo, cobranças, atendimento, condutas de outros usuários ou
            funcionamento da plataforma.
          </p>
        </Secao>

        <Secao titulo="3. Escopo">
          <p>Esta Política se aplica a qualquer reclamação relacionada:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Ao uso da plataforma e suas funcionalidades;</li>
            <li>Ao cumprimento dos Termos de Uso e desta e demais políticas por parte de criadores, assinantes ou da própria Monetisexy;</li>
            <li>A cobranças, saques ou outras questões financeiras;</li>
            <li>A conduta de outros usuários na plataforma;</li>
            <li>A conformidade legal e regulatória.</li>
          </ul>
        </Secao>

        <Secao titulo="4. Diretrizes Gerais">
          <p>A Monetisexy trata toda reclamação com uma abordagem:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Estruturada</strong> — cada reclamação recebe um registro único e acompanhamento até a resolução;</li>
            <li><strong>Transparente</strong> — o usuário é informado sobre o andamento e o resultado de sua reclamação;</li>
            <li><strong>Diligente</strong> — reclamações são priorizadas conforme gravidade e urgência (ex.: questões de segurança e menores de idade têm prioridade máxima).</li>
          </ul>
        </Secao>

        <Secao titulo="5. Como Enviar uma Reclamação">
          <p>Você pode registrar uma reclamação por meio de:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Botão &ldquo;Denunciar&rdquo;</strong>, disponível em qualquer publicação, mensagem ou perfil da plataforma — recomendado para questões relacionadas a conteúdo ou conduta de outro usuário.
            </li>
            <li>
              <strong>Canal de suporte:</strong>{" "}
              <a href="mailto:contato@monetysex.com" className="text-primary hover:underline">
                contato@monetysex.com
              </a>{" "}
              — recomendado para questões de cobrança, conta, saque ou funcionamento da plataforma.
            </li>
            <li>
              <strong>Chat de atendimento</strong>, disponível dentro da própria plataforma.
            </li>
          </ul>
          <p>
            Ao registrar uma reclamação, inclua o máximo de detalhes possível: link do
            conteúdo/perfil envolvido, data e hora do ocorrido, e qualquer evidência
            disponível (prints, comprovantes).
          </p>
        </Secao>

        <Secao titulo="6. Procedimento de Análise">
          <p>6.1. Toda reclamação recebe uma confirmação de recebimento.</p>
          <p>6.2. O prazo de análise varia conforme a complexidade e a natureza da reclamação:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Reclamações de segurança/conteúdo envolvendo possíveis menores de idade: análise prioritária e imediata.</li>
            <li>Reclamações de conteúdo/conduta em geral: até 5.</li>
            <li>Reclamações financeiras (cobrança, saque): até 5.</li>
          </ul>
          <p>
            6.3. Durante a análise, a equipe responsável pode: solicitar informações
            adicionais ao reclamante ou ao reclamado, suspender preventivamente
            conteúdo ou conta enquanto a apuração ocorre, e adotar as medidas
            corretivas previstas nos Termos de Uso (advertência, suspensão ou
            exclusão de conta).
          </p>
        </Secao>

        <Secao titulo="7. Resultado da Reclamação">
          <p>7.1. O denunciante é notificado sobre o desfecho de sua reclamação, respeitando o sigilo sobre detalhes internos da investigação.</p>
          <p>7.2. Reclamações registradas de forma anônima (quando o canal permitir) são analisadas normalmente, mas o retorno de status ao denunciante pode ficar limitado pela ausência de canal de contato.</p>
          <p>7.3. A identidade do denunciante é mantida em sigilo perante o denunciado, exceto quando exigido por lei ou ordem judicial.</p>
        </Secao>

        <Secao titulo="8. Aspectos Regulatórios">
          <p>
            Esta Política de Reclamações é complementar aos direitos já garantidos por
            lei. Nada nesta Política limita ou substitui o direito do usuário de
            recorrer a órgãos de defesa do consumidor (como Procon ou plataformas de
            mediação de conflitos) ou ao Poder Judiciário a qualquer momento.
          </p>
        </Secao>

        <Secao titulo="9. Considerações Finais">
          <p>
            A Monetisexy se compromete a revisar e melhorar continuamente seus
            processos de tratamento de reclamações. Esta Política pode ser atualizada
            periodicamente, com a versão vigente sempre disponível nesta página.
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
