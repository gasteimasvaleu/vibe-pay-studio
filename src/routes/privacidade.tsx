import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Monetisexy" },
      {
        name: "description",
        content:
          "Política de Privacidade da Monetisexy: como coletamos, usamos, armazenamos, compartilhamos e protegemos os dados pessoais dos usuários, em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Monetisexy" },
      {
        property: "og:description",
        content:
          "Como a Monetisexy trata seus dados pessoais em conformidade com a LGPD.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Política de Privacidade — Monetisexy" },
      {
        name: "twitter:description",
        content:
          "Como a Monetisexy trata seus dados pessoais em conformidade com a LGPD.",
      },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Política de Privacidade — Monetisexy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Última atualização: 23/07/2026
          </p>
        </header>

        <div className="space-y-10 leading-relaxed text-[15px] md:text-base">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como a{" "}
              <strong>CR DQV COMÉRCIO E CURSO LTDA</strong>, através do seu
              produto "Monetisexy", inscrita no CNPJ sob o nº{" "}
              <strong>61.963.205/0001-67</strong>, com sede em Av Presidente
              Epitácio Pessoa, 4840, Sala 409, Cabo Branco, João Pessoa/PB, CEP
              58045-000, coleta, usa, armazena, compartilha e protege os dados
              pessoais dos usuários da plataforma Monetisexy, em conformidade
              com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
              e demais legislações aplicáveis.
            </p>
            <p className="mt-3">
              Ao criar uma conta ou utilizar a Monetisexy, você concorda com os
              termos desta Política. Caso não concorde, não utilize a
              plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              2. Quem somos (Controlador de Dados)
            </h2>
            <p>
              A Monetisexy atua como <strong>Controladora</strong> dos dados
              pessoais tratados na plataforma, nos termos do art. 5º, VI da
              LGPD, sendo responsável pelas decisões referentes ao tratamento
              desses dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Definições</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Usuário:</strong> qualquer pessoa cadastrada na
                plataforma, seja como Assinante ou Criador.
              </li>
              <li>
                <strong>Assinante:</strong> usuário que consome conteúdo e
                realiza pagamentos (assinaturas, compras avulsas, gorjetas
                etc.).
              </li>
              <li>
                <strong>Criador:</strong> usuário que publica conteúdo e recebe
                repasses financeiros pela monetização de seu perfil.
              </li>
              <li>
                <strong>Dados Pessoais:</strong> qualquer informação
                relacionada a pessoa natural identificada ou identificável.
              </li>
              <li>
                <strong>Dados Pessoais Sensíveis:</strong> dados sobre origem
                racial/étnica, convicção religiosa, opinião política, saúde,
                vida sexual, dado genético ou biométrico (art. 5º, II, LGPD) —
                incluindo, quando aplicável, documentos de identificação com
                foto e dados biométricos usados no processo de verificação de
                identidade.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Dados que coletamos</h2>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              4.1 Dados fornecidos voluntariamente
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>No cadastro:</strong> nome, e-mail, nome de usuário,
                senha, data de nascimento.
              </li>
              <li>
                <strong>
                  Na verificação de identidade (obrigatória para Criadores):
                </strong>{" "}
                nome completo, CPF/CNPJ, endereço, documento oficial com foto,
                selfie de confirmação de identidade.
              </li>
              <li>
                <strong>Nos dados de pagamento e recebimento:</strong> dados
                bancários, chave Pix (dados de cartão são processados
                diretamente pelo processador de pagamentos — a Monetisexy não
                armazena números completos de cartão).
              </li>
              <li>
                <strong>No conteúdo publicado:</strong> fotos, vídeos, áudios,
                textos e mensagens enviadas na plataforma.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              4.2 Dados coletados automaticamente
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Dados de uso:</strong> páginas visitadas, perfis
                acessados, interações, tempo de sessão.
              </li>
              <li>
                <strong>Dados de dispositivo e conexão:</strong> endereço IP,
                tipo de dispositivo, navegador, sistema operacional.
              </li>
              <li>
                <strong>Dados de localização aproximada</strong> (com base no
                IP), usados inclusive para identificar transações nacionais e
                internacionais.
              </li>
              <li>Cookies e tecnologias similares (ver Seção 9).</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              4.3 Dados recebidos de terceiros
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Dados de autenticação, quando o usuário opta por cadastro via
                Google ou X (Twitter).
              </li>
              <li>
                Confirmação de status de pagamento e dados de KYC, recebidos do
                processador de pagamentos e do provedor de verificação de
                identidade.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Finalidades do tratamento</h2>
            <p>Utilizamos os dados coletados para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Criar e gerenciar contas de usuário;</li>
              <li>
                Processar pagamentos, assinaturas, saques e repasses
                financeiros;
              </li>
              <li>
                Verificar identidade e idade, prevenindo fraude e uso por
                menores de idade;
              </li>
              <li>
                Viabilizar a comunicação entre Criadores e Assinantes (chat,
                videochamadas);
              </li>
              <li>Personalizar a experiência e recomendar perfis/conteúdos;</li>
              <li>
                Cumprir obrigações legais e regulatórias (incluindo prevenção
                à lavagem de dinheiro e obrigações fiscais);
              </li>
              <li>
                Investigar denúncias, fraudes e violações dos Termos de Uso;
              </li>
              <li>
                Enviar comunicações transacionais (confirmação de cadastro,
                recuperação de senha, recibos, notificações de aprovação de
                KYC).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Base legal (LGPD, art. 7º)</h2>
            <p>
              O tratamento de dados pessoais na Monetisexy se baseia, conforme
              o caso, em:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Execução de contrato</strong> (art. 7º, V) — para
                viabilizar o uso da plataforma e o processamento de pagamentos;
              </li>
              <li>
                <strong>Cumprimento de obrigação legal ou regulatória</strong>{" "}
                (art. 7º, II) — verificação de identidade, prevenção à lavagem
                de dinheiro, obrigações fiscais;
              </li>
              <li>
                <strong>Consentimento</strong> (art. 7º, I) — para finalidades
                específicas, como comunicações de marketing;
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX) — para
                prevenção a fraudes e segurança da plataforma, sempre
                respeitando direitos e liberdades fundamentais do titular.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Com quem compartilhamos dados</h2>
            <p>
              Compartilhamos dados pessoais estritamente na medida necessária
              para operar a plataforma, com:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Processador de pagamentos</strong> (Instituição de
                Pagamento parceira) — para processar cobranças via Pix/cartão,
                realizar o split de pagamento entre a Monetisexy e os
                Criadores, e efetuar saques via Pix.
              </li>
              <li>
                <strong>Provedor de verificação de identidade (KYC)</strong> —
                para validar documentos e confirmar a maioridade dos Criadores.
              </li>
              <li>
                <strong>Provedor de armazenamento em nuvem</strong> — para
                hospedar o conteúdo (fotos, vídeos, áudios) de forma segura.
              </li>
              <li>
                <strong>
                  Provedor de infraestrutura de videochamada/transmissão ao
                  vivo
                </strong>{" "}
                — apenas durante o uso dessas funcionalidades, e apenas com os
                dados estritamente necessários para viabilizar a chamada.
              </li>
              <li>
                <strong>Autoridades públicas</strong>, quando exigido por lei,
                ordem judicial ou requisição regulatória.
              </li>
              <li>
                Em caso de fusão, aquisição ou reestruturação societária, com o
                devido aviso prévio aos titulares.
              </li>
            </ul>
            <p className="mt-3">
              <strong>Não vendemos dados pessoais a terceiros para fins de publicidade.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              8. Transferência internacional de dados
            </h2>
            <p>
              Alguns dos provedores mencionados na Seção 7 podem processar
              dados fora do Brasil. Nesses casos, adotamos as salvaguardas
              exigidas pela LGPD (art. 33), como cláusulas contratuais
              específicas de proteção de dados com os fornecedores envolvidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              9. Cookies e tecnologias de rastreamento
            </h2>
            <p>
              Utilizamos cookies essenciais (necessários para login e
              funcionamento da plataforma) e cookies analíticos (para entender
              uso e melhorar o produto). Você pode gerenciar suas preferências
              de cookies não essenciais nas configurações do navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              10. Retenção e exclusão de dados
            </h2>
            <p>
              Mantemos os dados pessoais pelo tempo necessário para cumprir as
              finalidades descritas nesta Política, incluindo obrigações legais
              de guarda de registros financeiros e fiscais (que podem exceder o
              período de uso ativo da conta, conforme legislação aplicável).
              Após o encerramento da conta e o fim das obrigações legais de
              retenção, os dados são eliminados ou anonimizados, salvo quando a
              manutenção for exigida por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              11. Seus direitos como titular de dados (LGPD, art. 18)
            </h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar seus dados;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Solicitar anonimização, bloqueio ou eliminação de dados
                desnecessários ou tratados em desconformidade com a LGPD;
              </li>
              <li>Solicitar a portabilidade de dados;</li>
              <li>Revogar o consentimento, quando aplicável;</li>
              <li>
                Solicitar informações sobre com quem compartilhamos seus dados.
              </li>
            </ul>
            <p className="mt-3">
              Para exercer esses direitos, entre em contato pelo canal indicado
              na Seção 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">12. Segurança da informação</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os
              dados pessoais contra acessos não autorizados, perda, alteração
              ou destruição, incluindo: criptografia de dados sensíveis,
              controle de acesso baseado em papéis (RLS), autenticação de dois
              fatores disponível aos usuários, e monitoramento de atividades
              suspeitas. Nenhum sistema é 100% infalível — em caso de incidente
              de segurança relevante, notificaremos os titulares afetados e a
              Autoridade Nacional de Proteção de Dados (ANPD), conforme
              exigido em lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">13. Menores de idade</h2>
            <p>
              A Monetisexy é destinada exclusivamente a maiores de 18 anos. Não
              coletamos intencionalmente dados de menores de idade. Caso
              identifiquemos uma conta de menor, os dados serão excluídos
              imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">14. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Alterações
              relevantes serão comunicadas por e-mail ou aviso na plataforma,
              com antecedência razoável antes de entrarem em vigor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              15. Contato — Encarregado de Dados (DPO)
            </h2>
            <p>
              Para dúvidas, solicitações ou exercício de direitos relacionados
              a esta Política, entre em contato com nosso Encarregado de Dados
              (DPO):
            </p>
            <ul className="list-none pl-0 space-y-2 mt-3">
              <li>
                <strong>E-mail:</strong>{" "}
                <a
                  href="mailto:contato@monetisexy.com"
                  className="text-primary hover:underline"
                >
                  contato@monetisexy.com
                </a>
              </li>
              <li>
                <strong>Endereço:</strong> Av Presidente Epitácio Pessoa, 4840,
                Sala 409, Cabo Branco, João Pessoa/PB, CEP 58045-000
              </li>
            </ul>
          </section>
        </div>
      </article>
    </SiteLayout>
  );
}
