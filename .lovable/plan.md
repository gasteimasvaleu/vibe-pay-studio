# Padronização de botões para altura fina (h-9)

## Objetivo
Deixar todos os botões do app com a mesma altura fina e elegante dos botões "Salvar"/"Cancelar" da tela `/settings/details` (36px / `h-9`), removendo overrides grossos espalhados pelo código.

## Escopo confirmado
- **Altura alvo:** `h-9` (36px).
- **Alvos:** apenas componente `<Button>` do shadcn (não inclui `<button>` nativos).
- **Sem exceções:** CTAs de pagamento, publicar, assinar etc. também passam para `h-9`.

## Diagnóstico atual
- O componente base `src/components/ui/button.tsx` já tem `default: h-9 px-4 py-2`.
- Porém, ~28 instâncias de `<Button>` sobrescrevem a altura com `h-10`, `h-11` ou `h-12`.
- A maioria dos overrides usa classes explícitas como `h-12 rounded-md bg-gradient-primary...`.

## Passos

### 1. Ajustar escala do componente Button
Atualizar as variantes `size` em `src/components/ui/button.tsx` para manter a proporção fina em todos os tamanhos:
- `default`: `h-9 px-4 py-2` (mantém).
- `sm`: `h-8 px-3 text-xs` (mantém).
- `lg`: mudar de `h-10` para `h-9 px-6` (para não haver botão grande no design system).
- `icon`: `h-9 w-9` (mantém).

### 2. Remover overrides de altura em <Button>
Percorrer os ~28 arquivos e remover os tokens de altura explícitos (`h-10`, `h-11`, `h-12`) dos `className` do `<Button>`, preservando cores, gradientes, arredondamento e largura.

Arquivos identificados com overrides:
- `src/routes/_authenticated/account-status.tsx`
- `src/routes/_authenticated/bugreport.tsx`
- `src/routes/_authenticated/chat-agendamento.tsx`
- `src/routes/_authenticated/content-leak-report.tsx`
- `src/routes/_authenticated/mywallet.extrato.tsx`
- `src/routes/_authenticated/mywallet.index.tsx`
- `src/routes/_authenticated/mywallet.recarregar.tsx`
- `src/routes/_authenticated/publisher.tsx`
- `src/routes/_authenticated/settings.language.tsx`
- `src/routes/_authenticated/settings.myprofile.tsx`
- `src/routes/_authenticated/settings.personal.tsx`
- `src/routes/_authenticated/settings.two-factor.setup.tsx`
- `src/routes/_authenticated/settings.two-factor.verify.tsx`
- `src/components/banco/CadastrarBancoForm.tsx`
- `src/components/payments/ChallengeContributeSheet.tsx`
- `src/components/payments/SubscribeDialog.tsx`
- `src/components/payments/TipDialog.tsx`
- `src/components/publisher/VaultPickerSheet.tsx`

### 3. Verificar botões com `size="lg"`
Buscar usos de `size="lg"` no `<Button>` e, se houver, trocar para `size="default"` ou remover, já que `lg` deixará de ter altura diferente.

### 4. Ajustes visuais de acompanhamento
- Em botões que ficavam com texto grande (`text-base`, `text-lg`), reduzir para `text-sm` para manter a proporção fina.
- Verificar se algum botão perde legibilidade após redução (especialmente CTAs com gradiente).

### 5. Validação
- Rodar `tsc` para garantir que nenhuma alteração quebrou tipos.
- Verificar visualmente telas críticas: publisher, carteira, perfil, configurações, pagamento.

## Resultado esperado
Todos os `<Button>` do app terão altura consistente de 36px, criando um visual mais leve, alinhado e "chique", conforme o exemplo da tela atual.

## Nota
Botões nativos (`<button>`) e elementos decorativos (ícones redondos, inputs) não serão alterados, conforme solicitado.