## Objetivo
Criar a página "Meu Banco" acessada ao clicar no card **Meu Banco** do dashboard do creator, seguindo os 4 screenshots enviados (adaptados ao design system atual — tokens semânticos, sem cores hardcoded, mantendo o visual escuro/glass do painel).

## Rota
- Novo arquivo: `src/routes/_authenticated/banco.tsx` → URL `/banco`
  - `head()`: `title: "Meu Banco · Monetisex"`, `robots: noindex`
  - Layout com header estilo `DashboardShell` (botão voltar à esquerda, título "Meu Banco" ao centro, botão ícone "i" à direita que abre um modal informativo).
- Adicionar sub-rota: `src/routes/_authenticated/banco.cadastrar.tsx` → `/banco/cadastrar` (form "Cadastrar Dados Bancários").
- Ligar o card no `CreatorDashboard.tsx`: adicionar `to="/banco"` no `ActionCard` "Meu Banco".

## Conteúdo da página `/banco`

### 1. Cards de saldo (grid 2 colunas)
Dois cards lado a lado — **Nacional** e **Internacional**:
- Título pequeno (label) do tipo de conta
- "Liberado para saque" + valor grande `R$ -`
- "Saldo a liberar" + `R$ -`
- Botão "Sacar" (desabilitado quando sem saldo)

### 2. Seção "Extrato"
- Título "Extrato"
- Estado vazio: banner com ícone de alerta + "Aqui você verá as movimentações da sua conta"

### 3. Seção "Dados bancários"
- Título "Dados bancários"
- Card "Adicionar novo banco" (ícone `+`, `Link` para `/banco/cadastrar`)
- Lista futura de bancos cadastrados (por ora apenas o card de adicionar)

### 4. Card "Minha carteira"
- Ícone carteira + título "Minha carteira"
- Texto: "Veja seu saldo, gerencie suas formas de pagamento e acompanhe suas transações"
- Botão "Acessar carteira" (por ora sem destino, ou `#`)

### 5. Modal informativo (ícone "i" no header)
Dialog (shadcn `Dialog`) com título "Entenda como funciona os saques na Privacy" adaptado para "Monetisex":
- Bloco "Disponível para saque" (ícone caixa eletrônico) + descrição
- Bloco "Saldo pendente" (ícone relógio) + descrição
- Divisor
- "Processo de liberação do saldo" + subtítulo
- "Cartão de crédito: **14 dias**"
- "Outros métodos de pagamento":
  - → Live: **3 dias**
  - → Internacional: **14 dias**
  - → Nacional: **Instantâneo** (destaque em verde via token `text-emerald-500`/semantic success)
- Botão "Entendido" fecha o modal

## Conteúdo da página `/banco/cadastrar`
Form "Cadastrar Dados Bancários" com header (voltar + título centralizado):
Campos (todos obrigatórios, `*`):
1. **Banco** — Select com ícone `Landmark`
2. **Tipo de conta** — Select (Corrente / Poupança) com ícone
3. **Agência** — Input texto
4. **Número da conta (com dígito)** — Input texto
5. **Tipo de chave Pix** — Select (CPF/CNPJ/E-mail/Telefone/Aleatória)
6. **Chave Pix** — Input (placeholder muda conforme tipo)

Rodapé com dois botões lado a lado:
- "Voltar" (outline) → `router.history.back()`
- "Salvar" (primary, com gradient) → por ora apenas mostra toast "Em breve" e volta

## Detalhes técnicos
- Usar componentes shadcn existentes: `Dialog`, `Button`, `Input`, `Select`, `Label`.
- Tudo estático/mock (sem chamadas Supabase) — apenas UI.
- Ícones lucide: `ArrowLeft`, `Info`, `Plus`, `Wallet`, `Landmark`, `CreditCard`, `Building2`, `Hash`, `QrCode`, `Diamond`, `AlertCircle`, `Clock`, `Banknote`.
- Reaproveitar o padrão de header/background do `DashboardShell` (fundo com `--gradient-radial`, header `border-b border-border backdrop-blur-md bg-card/80`, container `max-w-3xl mx-auto`).
- Nenhuma mudança em backend, tipos ou migrations.

## Arquivos alterados/criados
- **novo** `src/routes/_authenticated/banco.tsx`
- **novo** `src/routes/_authenticated/banco.cadastrar.tsx`
- **editar** `src/components/dashboard/CreatorDashboard.tsx` (adicionar `to="/banco"` no card "Meu Banco")
