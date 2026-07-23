import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/termos-e-politicas")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Monetisexy" },
      {
        name: "description",
        content:
          "Termos de Uso da Monetisexy: cadastro, assinaturas, comissões, saques, uso aceitável e demais condições que regem o uso da plataforma.",
      },
      { property: "og:title", content: "Termos de Uso — Monetisexy" },
      {
        property: "og:description",
        content:
          "Termos de Uso da Monetisexy: cadastro, assinaturas, comissões, saques, uso aceitável e demais condições que regem o uso da plataforma.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://monetisexy.com/termos-e-politicas" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Termos de Uso — Monetisexy" },
      {
        name: "twitter:description",
        content:
          "Termos de Uso da Monetisexy: cadastro, assinaturas, comissões, saques, uso aceitável e demais condições que regem o uso da plataforma.",
      },
    ],
    links: [{ rel: "canonical", href: "https://monetisexy.com/termos-e-politicas" }],
  }),
  component: TermosEPoliticasPage,
});

function TermosEPoliticasPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Termos de Uso — Monetisexy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 23/07/2026
        </p>

        <Secao titulo="Glossário">
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            <li><strong>Plataforma:</strong> o site e aplicativo web da Monetisexy.</li>
            <li><strong>Usuário:</strong> qualquer pessoa cadastrada, seja Assinante ou Criador.</li>
            <li><strong>Assinante:</strong> usuário que consome conteúdo e realiza pagamentos.</li>
            <li><strong>Criador:</strong> usuário aprovado para publicar conteúdo e receber repasses financeiros.</li>
            <li><strong>Conteúdo:</strong> qualquer material (foto, vídeo, áudio, texto) publicado ou enviado na Plataforma.</li>
            <li><strong>Mimo:</strong> contribuição monetária voluntária enviada por um Assinante a um Criador.</li>
            <li><strong>Comissão da Plataforma:</strong> percentual retido pela Monetisexy sobre cada transação.</li>
          </ul>
        </Secao>

        <Secao titulo="Disposições Gerais">
          <p>
            Estes Termos de Uso regulam o acesso e uso da plataforma Monetisexy,
            operada por CR DQV COMÉRCIO E CURSO LTDA, CNPJ 61.963.205/0001-67. Ao
            criar uma conta, você declara ter lido, compreendido e aceitado
            integralmente estes Termos. A Monetisexy reserva-se o direito de alterar
            estes Termos a qualquer momento, com aviso prévio razoável aos usuários.
          </p>
        </Secao>

        <Secao titulo="Cadastro de Conta e Acesso à Plataforma">
          <p>2.1. O cadastro é gratuito e requer e-mail válido, nome de usuário único e senha, ou autenticação via provedores externos suportados.</p>
          <p>2.2. É obrigatório ter 18 anos completos ou mais para se cadastrar. A Monetisexy pode solicitar verificação de idade a qualquer momento.</p>
          <p>2.3. Para se tornar Criador, o usuário deve passar por processo de verificação de identidade (KYC), incluindo envio de documento oficial com foto. A aprovação está sujeita a análise, com prazo estimado de até 2 (dois) dias úteis.</p>
          <p>2.4. É proibido o cadastro de mais de uma conta pessoa física por CPF, ressalvadas as exceções previstas para contas de Pessoa Jurídica (Seção 2.5).</p>
          <p>2.5. Criadores podem solicitar conta adicional vinculada a CNPJ, mediante envio de documentação societária e aprovação manual.</p>
        </Secao>

        <Secao titulo="Assinaturas e Compras">
          <p>3.1. Criadores definem o valor de sua assinatura mensal dentro da faixa de R$ 19,90 a R$ 200,00, podendo oferecer planos trimestrais e semestrais com desconto.</p>
          <p>3.2. As assinaturas possuem renovação automática, cobrada no cartão cadastrado ao final de cada ciclo, salvo cancelamento prévio.</p>
          <p>3.3. O cancelamento da renovação automática pode ser feito a qualquer momento e produz efeitos ao final do ciclo já pago — não há reembolso proporcional por cancelamento antecipado.</p>
          <p>3.4. Política de reembolso: dado que o conteúdo digital é disponibilizado de forma imediata após a confirmação do pagamento, não há direito de arrependimento nos termos do art. 49 do Código de Defesa do Consumidor, aplicável a compras físicas ou de execução não imediata. Reembolsos excepcionais serão avaliados individualmente pela Monetisexy, a seu exclusivo critério, em casos de descumprimento comprovado por parte do Criador.</p>
          <p>3.5. Meios de pagamento aceitos: Pix (limite de R$ 2.000,00 por transação) e cartão de crédito (limite de R$ 200,00 por transação), além do saldo pré-pago da Carteira da plataforma.</p>
          <p>3.6. O saldo da Carteira (Wallet), quando recarregado, não é reembolsável nem sacável, sendo destinado exclusivamente ao consumo de conteúdo e funcionalidades dentro da Plataforma.</p>
        </Secao>

        <Secao titulo="Comissão e Repasse de Valores">
          <p>4.1. A Monetisexy retém uma comissão de 15% (quinze) sobre o valor de toda transação realizada na Plataforma, incluindo assinaturas, conteúdo avulso, chat pago, Mimo, chamada de vídeo, transmissões ao vivo e Desafios. O Criador recebe os 85% (oitenta por cento) restantes.</p>
          <p>4.2. O percentual de comissão é aplicado e registrado no momento da transação, sendo essa a taxa vigente para aquela operação específica, independentemente de futuras alterações no percentual padrão.</p>
        </Secao>

        <Secao titulo="Saques">
          <p>5.1. O valor mínimo para solicitação de saque é de R$ 30,00.</p>
          <p>5.2. É permitido 1 (um) saque gratuito por dia. Saques adicionais no mesmo dia estão sujeitos a uma taxa de R$ 3,50 por operação, descontada do valor sacado.</p>
          <p>5.3. Saques são processados exclusivamente via Pix, para conta bancária de mesma titularidade (CPF/CNPJ) cadastrada na conta do Criador.</p>
          <p>5.4. O primeiro saque de cada Criador está sujeito a análise adicional de conformidade, com prazo de até 1 (um) dia útil após a checagem.</p>
          <p>5.5. Prazos de liberação de saldo: vendas via Pix são liberadas imediatamente; vendas via cartão de crédito são liberadas em até 15 (quinze) dias corridos; vendas com comprador localizado fora do território nacional são liberadas em até 15 (quinze) dias corridos, independentemente do meio de pagamento utilizado.</p>
        </Secao>

        <Secao titulo="Compliance Fiscal e Tributário">
          <p>6.1. Toda responsabilidade tributária decorrente dos valores recebidos na Plataforma — incluindo, mas não se limitando a, Imposto de Renda — é exclusiva do Criador.</p>
          <p>6.2. A Monetisexy disponibiliza extrato de vendas como fonte de dados para fins de declaração fiscal, mas não presta consultoria tributária nem se responsabiliza por eventual descumprimento de obrigações fiscais por parte do Criador.</p>
        </Secao>

        <Secao titulo="Relação entre Assinante e Criador">
          <p>7.1. A Monetisexy atua exclusivamente como intermediária tecnológica, fornecendo a infraestrutura para que Criadores e Assinantes se conectem e realizem transações.</p>
          <p>7.2. A relação contratual estabelecida a partir de uma assinatura, compra ou interação paga é formada exclusivamente entre o Assinante e o Criador. A Monetisexy não é parte dessa relação e não garante, endossa ou se responsabiliza pelo conteúdo publicado por Criadores.</p>
        </Secao>

        <Secao titulo="Chat">
          <p>8.1. O acesso ao chat com um Criador é restrito a Assinantes com assinatura ativa daquele perfil.</p>
          <p>8.2. É proibido o uso do chat para: assédio, ameaças, compartilhamento de dados de contato para transações fora da Plataforma, ou qualquer conduta que viole a Seção 12 (Uso Aceitável).</p>
          <p>8.3. Mensagens de texto estão incluídas na assinatura; mídia enviada via chat pode ser precificada individualmente pelo Criador, conforme Seção 15.</p>
        </Secao>

        <Secao titulo="Exclusão de Conta">
          <p>9.1. Assinantes podem excluir sua conta a qualquer momento. A exclusão é imediata e implica perda de acesso a assinaturas ativas e a eventual saldo de Carteira, sem direito a reembolso.</p>
          <p>9.2. Criadores só podem concluir a exclusão de conta após o vencimento de todas as assinaturas ativas de seus Assinantes e decorrido o prazo de garantia de acesso de 60 (sessenta) dias para conteúdo avulso já adquirido. Até lá, é possível solicitar a desativação temporária do perfil.</p>
        </Secao>

        <Secao titulo="Direitos de Propriedade Intelectual">
          <p>10.1. Marca, layout, código-fonte, design e demais elementos da Plataforma são de propriedade exclusiva da Monetisexy, sendo vedada sua reprodução, cópia ou engenharia reversa sem autorização expressa.</p>
          <p>10.2. O Conteúdo publicado por um Criador permanece de propriedade do próprio Criador, que concede à Monetisexy uma licença limitada para hospedar, exibir e distribuir esse Conteúdo dentro da Plataforma, na medida necessária para operação do serviço.</p>
        </Secao>

        <Secao titulo="Licença de Uso">
          <p>A Monetisexy concede ao usuário uma licença pessoal, limitada, não exclusiva, revogável e intransferível para acessar e utilizar a Plataforma, condicionada ao cumprimento destes Termos.</p>
        </Secao>

        <Secao titulo="Uso Aceitável">
          <p>É expressamente proibido:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Publicar conteúdo ilegal, fraudulento, difamatório, discriminatório ou que incite violência ou ódio;</li>
            <li>Publicar conteúdo que viole direitos autorais ou de imagem de terceiros sem autorização;</li>
            <li>Publicar conteúdo envolvendo pessoas menores de 18 anos, sob qualquer circunstância;</li>
            <li>Utilizar a Plataforma para fins de spam, personificação de terceiros ou fraude de qualquer natureza;</li>
            <li>Comprar o próprio conteúdo, direta ou indiretamente, com o objetivo de manipular métricas, rankings ou algoritmos de recomendação (&ldquo;autofraude&rdquo;);</li>
            <li>Utilizar ferramentas automatizadas para copiar, extrair ou redistribuir Conteúdo da Plataforma sem autorização.</li>
          </ul>
          <p>Violações podem resultar nas sanções descritas na Seção 26.</p>
        </Secao>

        <Secao titulo="Conteúdo do Criador">
          <p>13.1. O Criador é o único responsável pela legalidade, veracidade e titularidade dos direitos sobre o Conteúdo que publica, declarando possuir todas as autorizações necessárias, inclusive de eventuais terceiros retratados.</p>
          <p>13.2. Perfis que utilizam conteúdo gerado por Inteligência Artificial devem indicar essa condição de forma clara e visível no perfil, nos termos da política de transparência da Plataforma.</p>
          <p>13.3. A Monetisexy adota medidas técnicas de proteção de conteúdo pago (marca d&apos;água, URLs de acesso temporário e outras), sem garantir proteção absoluta contra cópia não autorizada.</p>
        </Secao>

        <Secao titulo="Mimo">
          <p>O Mimo é uma contribuição monetária voluntária, sem entrega de conteúdo ou serviço específico em contrapartida, não sendo, portanto, passível de reembolso ou estorno em nenhuma hipótese.</p>
        </Secao>

        <Secao titulo="Mídia Paga / Postagem Paga">
          <p>15.1. Criadores podem oferecer conteúdo avulso com preço individual, tanto no feed quanto em conversas privadas, cobrado separadamente de qualquer assinatura ativa.</p>
          <p>15.2. O acesso ao conteúdo avulso adquirido é garantido ao comprador por, no mínimo, 60 (sessenta) dias corridos a partir da compra, mesmo que o conteúdo seja posteriormente arquivado pelo Criador.</p>
        </Secao>

        <Secao titulo="Desafio">
          <p>16.1. O Desafio é uma funcionalidade de arrecadação coletiva vinculada a um conteúdo específico, com meta definida pelo Criador, limitada a R$ 2.000,00 (dois mil reais) por Desafio.</p>
          <p>16.2. Contribuições em um Desafio não são reembolsáveis, independentemente de a meta ser atingida ou não.</p>
        </Secao>

        <Secao titulo="Live">
          <p>17.1. Criadores podem realizar transmissões ao vivo mediante cobrança de ingresso, com valor definido dentro da faixa permitida pela Plataforma e duração máxima diária estabelecida nas configurações da funcionalidade.</p>
          <p>17.2. Ingressos de Live não são reembolsáveis após a compra.</p>
        </Secao>

        <Secao titulo="Vídeo Chamada">
          <p>18.1. Criadores podem oferecer chamadas de vídeo privadas mediante pagamento prévio, com preço e duração definidos por eles, dentro dos limites estabelecidos pela Plataforma.</p>
          <p>18.2. Convites de chamada não pagos dentro do prazo estipulado são automaticamente cancelados.</p>
        </Secao>

        <Secao titulo="Direitos Autorais">
          <p>A Monetisexy respeita os direitos autorais de terceiros e adota procedimento de notificação e remoção (notice-and-takedown) para denúncias de violação de direitos autorais, nos termos da Lei nº 9.610/1998. Denúncias devem ser encaminhadas ao canal indicado na Seção 29.</p>
        </Secao>

        <Secao titulo="Links e Mídia Social">
          <p>É permitido ao Criador divulgar seu perfil da Monetisexy em redes sociais externas, observadas as políticas de cada plataforma externa. A Monetisexy não se responsabiliza por conteúdo ou políticas de terceiros.</p>
        </Secao>

        <Secao titulo="Segurança da Conta">
          <p>O usuário é responsável por manter a confidencialidade de sua senha e pela ativação de medidas adicionais de segurança disponíveis, como a autenticação de dois fatores. Em caso de suspeita de acesso não autorizado, o usuário deve notificar imediatamente a Monetisexy.</p>
        </Secao>

        <Secao titulo="Isenção de Garantias e Limitação de Responsabilidade">
          <p>A Plataforma é fornecida &ldquo;no estado em que se encontra&rdquo; (&ldquo;as is&rdquo;), sem garantias de disponibilidade ininterrupta, ausência de erros ou adequação a uma finalidade específica. Na máxima extensão permitida pela lei, a Monetisexy não se responsabiliza por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso da Plataforma.</p>
        </Secao>

        <Secao titulo="Indenização">
          <p>O usuário concorda em indenizar e isentar a Monetisexy de quaisquer reclamações, danos ou prejuízos decorrentes do descumprimento destes Termos ou do uso indevido da Plataforma.</p>
        </Secao>

        <Secao titulo="Sanções e Penalidades">
          <p>Violações a estes Termos podem resultar, de forma escalonada e conforme a gravidade: (i) advertência; (ii) suspensão temporária da conta, com retenção de saldo durante o período de análise; (iii) exclusão definitiva da conta, sem prejuízo de outras medidas legais cabíveis.</p>
        </Secao>

        <Secao titulo="Alterações nos Termos">
          <p>Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas com antecedência razoável. O uso continuado da Plataforma após a entrada em vigor das alterações constitui aceitação dos novos Termos.</p>
        </Secao>

        <Secao titulo="Lei Aplicável e Foro">
          <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de João Pessoa/PB para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
        </Secao>

        <Secao titulo="Contato">
          <p>
            Dúvidas sobre estes Termos podem ser encaminhadas para:{" "}
            <a href="mailto:contato@monetisexy.com" className="text-primary hover:underline">
              contato@monetisexy.com
            </a>
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
