## Objetivo
Adicionar, acima do card "Recebimento ativo" em `/banco`, um card em formato acordeão explicando a integração com o Asaas: por que precisa criar conta, o que é o Wallet ID, como obter a API Key, e quais taxas são aplicadas.

## Onde
`src/routes/_authenticated/banco.tsx` — inserir uma nova `<section>` logo antes do bloco de status de recebimento (o card que o usuário selecionou, ~linha 106+ do preview). Fica sempre visível, independente do `kycVerified`/`walletActive`, para servir de referência.

## Componente
Usar o `Accordion` do shadcn já existente em `src/components/ui/accordion.tsx` (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`), com `type="single"` e `collapsible`. Estilo casando com os demais cards da página (`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`).

## Estrutura do card
- Cabeçalho do card (fora do accordion):
  - Título: "Integração com o Asaas"
  - Subtítulo curto: "Usamos o Asaas como processador de pagamentos. Para receber, você precisa de uma conta lá."
  - CTA externo: link "Criar conta no Asaas" para `https://www.asaas.com/registrar` (`target="_blank"`, `rel="noopener noreferrer"`).

- Itens do accordion:
  1. **"Por que preciso de uma conta Asaas?"** — Explica que o Asaas é o gateway que processa PIX/cartão e liquida diretamente na conta do creator via split, e que sem conta não conseguimos enviar os valores.
  2. **"O que é o Wallet ID e como pegar?"** — Passo a passo: entrar na conta Asaas → menu **Minha conta → Integrações → API** (ou **Configurações → Wallet ID**) → copiar o identificador no formato UUID (ex.: `ced4e093-...`). Colar no campo "Wallet ID" ao cadastrar o banco.
  3. **"Como gerar minha API Key"** — Passo a passo: **Minha conta → Integrações → Chaves de API → Gerar nova chave** (ambiente **Produção**), copiar o valor `$aact_...` e colar no cadastro. Aviso: a chave é mostrada uma única vez; guarde em local seguro; nunca compartilhe.
  4. **"Taxas cobradas"** — Tabela/lista com:
     - Comissão da plataforma Monetisexy: **15%** sobre cada transação (fica com a plataforma).
     - Taxas do Asaas (100% descontadas do creator):
       - PIX: **R$ 1,99** por cobrança recebida.
       - Cartão de crédito à vista: **2,99% + R$ 0,49** por transação.
       - (Boleto e cartão parcelado ainda não estão disponíveis no checkout.)
     - Mínimos por método aplicados no checkout: **PIX R$ 3,00** e **Cartão R$ 2,00**, para garantir sobra positiva ao creator após as taxas.
     - Nota curta: "Exemplo: em um PIX de R$ 10,00 → R$ 1,50 vai para a plataforma, R$ 1,99 para o Asaas, você recebe R$ 6,51."
  5. **"Prazo de recebimento"** — PIX cai em segundos; cartão de crédito cai em ~32 dias após o pagamento (regra padrão do Asaas).

## Ícones e polish
- Ícone `Info` ou `Wallet` no cabeçalho do card.
- Tipografia consistente com o restante da página (`text-sm text-muted-foreground` para corpo, `font-semibold text-foreground` para títulos internos).
- Links externos com sublinhado sutil e `text-primary`.

## Fora de escopo
- Não muda lógica de status, formulário de cadastro, nem cálculo de taxas — é conteúdo estático explicativo.
- Não altera o card "Recebimento ativo" existente.