# Aviso visível do valor mínimo de saque (R$ 50) em Meu Banco

## Problema
Na tela Meu Banco, o card mostra "Liberado para saque: R$ 10,68" e o botão "Sacar" aparece desabilitado sem explicar o porquê. O motivo já existe no código (`withdrawDisabledReason` retorna "Saldo mínimo para saque: R$ 50,00"), mas é exibido apenas no atributo `title` do botão — invisível no uso normal e no celular.

## Solução
Exibir o motivo do botão desabilitado como texto visível dentro do card de saldo, em todos os casos (verificação pendente, recebimento não configurado, API Key ausente, saldo abaixo de R$ 50).

## Mudanças

Arquivo único: `src/routes/_authenticated/banco.tsx`, na seção dos cards de saldo (bloco do `.map` dos cards).

1. Logo abaixo do botão "Sacar", quando o botão estiver desabilitado por um motivo (`disabledReason` não nulo) e não for o card mudo de "Sem movimentações internacionais", renderizar:
   - `<p className="mt-2 text-xs text-muted-foreground">` com o texto do `disabledReason` (ex.: "Saldo mínimo para saque: R$ 50,00").
2. Enquanto o saldo está sendo atualizado após um saque, manter o texto "Atualizando saldo" como hoje.
3. O tooltip `title` do botão permanece como reforço.

Textos existentes reaproveitados de `withdrawDisabledReason`, sem alterar regras de negócio nem o servidor. O mínimo de R$ 50 e o motivo já são calculados; a mudança é só de apresentação.

## Verificação
- Build OK após a edição.
- Conferência visual via Playwright na tela /banco mostrando o card Nacional com saldo abaixo de R$ 50 e o aviso visível abaixo do botão desabilitado.
