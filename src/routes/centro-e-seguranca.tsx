import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/centro-e-seguranca")({
  head: () => ({
    meta: [
      { title: "Centro de Segurança e Transparência — Monetisexy" },
      {
        name: "description",
        content:
          "Centro de Segurança e Transparência da Monetisexy: políticas, moderação, verificação de identidade, prevenção a fraude e canais de denúncia.",
      },
      { property: "og:title", content: "Centro de Segurança e Transparência — Monetisexy" },
      {
        property: "og:description",
        content:
          "Centro de Segurança e Transparência da Monetisexy: políticas, moderação, verificação de identidade, prevenção a fraude e canais de denúncia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://monetisexy.com/centro-e-seguranca" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Centro de Segurança e Transparência — Monetisexy" },
      {
        name: "twitter:description",
        content:
          "Centro de Segurança e Transparência da Monetisexy: políticas, moderação, verificação de identidade, prevenção a fraude e canais de denúncia.",
      },
    ],
    links: [{ rel: "canonical", href: "https://monetisexy.com/centro-e-seguranca" }],
  }),
  component: CentroDeSegurancaPage,
});

function CentroDeSegurancaPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Centro de Segurança e Transparência — Monetisexy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 23/07/2026
        </p>

        <Secao titulo="1. Introdução">
          <p>
            A Monetisexy existe para conectar criadores e assinantes de forma segura,
            transparente e responsável. Este Centro de Segurança e Transparência reúne,
            num só lugar, as políticas, processos e compromissos que sustentam essa
            confiança — para que qualquer usuário, criador ou autoridade possa entender
            exatamente como operamos.
          </p>
        </Secao>

        <Secao titulo="2. Missão, Visão e Valores">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Missão:</strong> oferecer uma plataforma onde criadores monetizem seu trabalho com segurança e previsibilidade, e onde assinantes tenham uma experiência confiável.</li>
            <li><strong>Visão:</strong> ser reconhecida como a plataforma de assinatura de criadores mais segura e transparente do mercado brasileiro.</li>
            <li><strong>Valores:</strong> segurança em primeiro lugar, transparência com usuários e autoridades, responsabilidade no tratamento de dados e recursos financeiros, e tolerância zero a abuso.</li>
          </ul>
        </Secao>

        <Secao titulo="3. Monitoramento de Conteúdo">
          <p>3.1. Todo conteúdo publicado na vitrine pública passa por um processo de moderação antes de ficar visível, combinando análise automatizada e revisão humana.</p>
          <p>3.2. Denúncias de conteúdo (feitas por qualquer usuário através do botão &ldquo;Denunciar&rdquo;, disponível em toda publicação e perfil) são encaminhadas a uma fila de moderação prioritária, com motivo estruturado e contexto.</p>
          <p>3.3. Mantemos sistemas de monitoramento contínuo para identificar padrões de uso indevido, incluindo contas fraudulentas e comportamento suspeito.</p>
        </Secao>

        <Secao titulo="4. Compromisso com Segurança">
          <ul className="list-disc pl-5 space-y-2">
            <li>Autenticação de dois fatores (2FA) disponível a todos os usuários.</li>
            <li>Verificação de identidade obrigatória para todo Criador antes de publicar conteúdo ou receber pagamentos.</li>
            <li>Proteção técnica de conteúdo pago (URLs de acesso temporário, marca d&apos;água de rastreabilidade).</li>
            <li>Canal de denúncia disponível em toda a plataforma, com sigilo garantido ao denunciante.</li>
            <li>Bloqueio automático de conta após tentativas de login malsucedidas consecutivas, como camada adicional contra acesso não autorizado.</li>
          </ul>
        </Secao>

        <Secao titulo="5. Verificação de Idade e Identidade">
          <p>5.1. A Monetisexy é destinada exclusivamente a maiores de 18 anos. A idade é declarada no cadastro e reforçada com documentação oficial no momento em que um usuário solicita se tornar Criador.</p>
          <p>5.2. Criadores devem enviar documento oficial com foto e passar por processo de verificação de identidade (KYC) antes de publicar qualquer conteúdo ou receber repasses financeiros — a análise é feita por tecnologia de verificação combinada com revisão humana em casos de dúvida.</p>
          <p>5.3. Contas identificadas como pertencentes a menores de idade têm acesso e conteúdo removidos imediatamente, assim que detectadas.</p>
        </Secao>

        <Secao titulo="6. Jurisdição">
          <p>
            A Monetisexy opera sob as leis da República Federativa do Brasil e está
            sujeita à jurisdição brasileira para todos os efeitos legais, incluindo
            obrigações perante autoridades de proteção ao consumidor, proteção de dados
            (ANPD) e persecução penal, quando aplicável. CR DQV COMÉRCIO E CURSO LTDA,
            CNPJ 61.963.205/0001-67.
          </p>
        </Secao>

        <Secao titulo="7. Proteção Contra Abuso de Menores">
          <p>7.1. Tolerância zero: é terminantemente proibida a publicação de qualquer conteúdo que envolva, retrate ou sugira o envolvimento de pessoas menores de 18 anos, sob qualquer circunstância.</p>
          <p>7.2. Toda conta ou conteúdo suspeito de violar esta política é removido imediatamente, e o caso é reportado às autoridades competentes, incluindo, quando aplicável, aos canais oficiais de combate à exploração infantil.</p>
          <p>7.3. O processo de verificação de identidade (Seção 5) e a exigência de declaração de autorização para conteúdo envolvendo terceiros são as principais barreiras preventivas dessa política.</p>
        </Secao>

        <Secao titulo="8. Direitos Autorais">
          <p>8.1. A Monetisexy respeita a propriedade intelectual de criadores e de terceiros, adotando um processo de notificação e remoção (notice-and-takedown) para denúncias de uso não autorizado de conteúdo, nos termos da Lei nº 9.610/1998.</p>
          <p>8.2. Criadores contam com camadas técnicas de proteção de conteúdo (acesso via URLs temporárias, marca d&apos;água de rastreabilidade), reduzindo o risco de cópia e redistribuição não autorizada — sem, no entanto, garantir proteção absoluta.</p>
          <p>8.3. Casos de vazamento de conteúdo em sites de terceiros podem ser reportados ao nosso canal de suporte para acompanhamento.</p>
        </Secao>

        <Secao titulo="9. Privacidade do Usuário">
          <p>
            O tratamento de dados pessoais na Monetisexy é regido pela nossa{" "}
            <Link to="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            , em conformidade com a Lei Geral de Proteção de Dados (LGPD). Recomendamos
            a leitura do documento completo para entender quais dados coletamos, como
            usamos e quais direitos você tem sobre eles.
          </p>
        </Secao>

        <Secao titulo="10. Prevenção a Fraude e Lavagem de Dinheiro">
          <p>10.1. Todo Criador passa por verificação de identidade (KYC) antes de poder receber repasses financeiros.</p>
          <p>10.2. O primeiro saque de cada Criador passa por uma análise de conformidade adicional, verificando a origem da receita.</p>
          <p>10.3. Saques só podem ser direcionados a contas bancárias/chaves Pix de mesma titularidade (CPF/CNPJ) da conta do Criador, prevenindo o uso da plataforma para movimentação de recursos de terceiros.</p>
          <p>10.4. É proibida a &ldquo;autofraude&rdquo; — a compra do próprio conteúdo, direta ou indiretamente, para manipular métricas ou rankings da plataforma.</p>
          <p>10.5. Transações suspeitas são monitoradas e podem resultar em retenção de saldo durante investigação, com posterior reporte às autoridades competentes quando aplicável.</p>
        </Secao>

        <Secao titulo="11. Discurso de Ódio">
          <p>
            É proibido publicar, enviar ou promover conteúdo que incite ódio,
            discriminação ou violência com base em raça, etnia, religião, gênero,
            orientação sexual, deficiência ou qualquer outra característica protegida
            por lei. Violações são tratadas com as sanções descritas em nossos Termos
            de Uso, podendo incluir suspensão ou exclusão definitiva da conta.
          </p>
        </Secao>

        <Secao titulo="12. Prevenção a Trabalho Escravo e Tráfico de Pessoas">
          <p>
            A Monetisexy possui tolerância zero a qualquer forma de exploração, coação
            ou tráfico de pessoas. O processo de verificação de identidade exige que
            cada Criador confirme, sob declaração própria, que atua de forma
            independente e voluntária na criação e publicação de seu conteúdo.
            Suspeitas dessa natureza são tratadas com prioridade máxima, incluindo
            suspensão imediata da conta e reporte às autoridades competentes.
          </p>
        </Secao>

        <Secao titulo="13. Canais de Denúncia e Contato">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Denúncia de conteúdo/perfil:</strong> botão &ldquo;Denunciar&rdquo;, disponível em qualquer publicação ou perfil da plataforma.</li>
            <li>Suporte geral;</li>
            <li>Questões jurídicas/direitos autorais;</li>
            <li>
              Encarregado de Dados (DPO):{" "}
              <a href="mailto:contato@monetisexy.com" className="text-primary hover:underline">
                contato@monetisexy.com
              </a>
            </li>
          </ul>
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
