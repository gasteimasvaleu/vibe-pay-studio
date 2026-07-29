## Objetivo
Adicionar indicador visual de etapas no checkout inline de cartão (`NewCardCheckoutStep`) para dar feedback claro durante o fluxo tokenização → cobrança → confirmação, evitando a sensação de "travado tokenizando".

## Escopo
Somente UI/UX do componente `src/components/payments/NewCardCheckoutStep.tsx` e ajustes mínimos nos chamadores para sinalizar a fase de cobrança.

## Mudanças

### 1. `NewCardCheckoutStep.tsx`
- Adicionar estado interno `phase: "idle" | "tokenizing" | "charging" | "done" | "error"`.
- Definir `phase = "tokenizing"` ao iniciar `mutation`.
- Após `tokenize()` resolver com sucesso, transicionar para `"charging"` antes de chamar `onSuccess()`.
- Após `onSuccess()` resolver, transicionar para `"done"` (breve, ~600ms) antes de deixar o pai fechar o dialog.
- Em erro, `phase = "error"` e volta para `"idle"` ao editar qualquer campo.
- Substituir o texto simples "Validando cartão…" do botão por um **StepIndicator** compacto acima dos botões, com 3 pontos/linhas conectados:
  1. Tokenizando cartão
  2. Processando pagamento
  3. Confirmado
- Cada etapa mostra: ícone circular (spinner ativo / check concluído / número pendente), label pequeno, e uma linha de progresso animada (pulse/gradient) entre elas.
- O botão permanece desabilitado durante `tokenizing`/`charging`/`done`; label do botão reflete a fase ("Tokenizando cartão…", "Processando pagamento…", "Concluído").
- Enquanto `phase !== "idle"`, esconder inputs (ou reduzir opacidade) e destacar o indicador no lugar — decisão: manter os inputs visíveis mas com `opacity-60 pointer-events-none`, focando o olhar no indicador logo abaixo.

### 2. Sinalização "charging" nos chamadores
O componente já sabe quando saiu da tokenização (promise `tokenize` resolveu), então a transição para `"charging"` acontece automaticamente enquanto aguarda `onSuccess()` do pai (que hoje já executa a cobrança 1‑click). Nenhuma mudança de assinatura necessária.

Opcional: expor prop `chargingLabel?: string` para o pai customizar (ex.: "Gerando PIX de fallback…"), mas não obrigatório.

## Detalhes técnicos

- Ícones: `Loader2` (spinner), `Check`, `AlertCircle` do `lucide-react` (já usados).
- Animação da linha entre etapas: `bg-gradient-to-r from-primary to-primary/40 bg-[length:200%_100%] animate-[shimmer_1.2s_linear_infinite]` — adicionar keyframes locais via classe utilitária inline (`style={{ animation: "..." }}`) para evitar mexer em `tailwind.config`/`styles.css`. Alternativa mais simples e já suportada: usar `animate-pulse` no segmento ativo.
- Respeitar `tone="light" | "dark"` já existente para cores do indicador.
- Sem novas dependências.

## Fora de escopo
- Não alterar server functions (`tokenizeAndSaveCard`, `chargeSavedCardTopUp`, `payments.functions.ts`).
- Não mudar layout dos `PaymentMethodPicker`/`PaymentMethodDialog` além do que o componente interno renderiza.
- Não introduzir toasts adicionais (mantém `toast.error` existente em falha).