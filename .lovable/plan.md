## Corrigir tela "Assinatura" (definir preço)

**Diagnóstico:** o backend (`saveSubscriptionPricing`) e o formulário funcionam. O problema é puramente de UX/layout — a página coloca no topo os **cards de preview** (Mensal/Trimestral/Semestral zerados), depois o botão "Simular ganhos", e só bem lá embaixo o campo de input real. O usuário vê "R$ 0,00" no topo, não percebe que precisa rolar até o input de "Assinatura Mensal", e conclui que a tela está quebrada.

### Mudanças em `src/routes/_authenticated/creator.onboarding.assinatura.tsx`
1. **Inverter a ordem** do conteúdo dentro do `OnboardingShell`:
   - Título + subtítulo
   - **Formulário primeiro:** campo `Assinatura Mensal` (com destaque visual, hint de mín/máx logo abaixo) e, ao lado/abaixo, os dois campos de desconto (Trimestral / Semestral).
   - **Preview de preços** (os três `PriceCard`) logo depois do formulário, com título "Como ficam seus planos" — atualiza ao vivo conforme o usuário digita.
   - Link "Simular ganhos com assinatura" mantido como opcional abaixo do preview.
   - Mensagem de erro + botão "Avançar" no final.
2. **Placeholder guia** no campo mensal: `Ex: 29,90` em vez de `0,00`, para deixar claro que é ali que se digita.
3. **Autofocus** no campo mensal ao montar a página.
4. **Botão "Avançar"** continua desabilitado enquanto `monthly` está fora de `[19,90; 200,00]`; adicionar um pequeno texto auxiliar acima do botão quando desabilitado ("Digite um valor entre R$ 19,90 e R$ 200,00 para continuar.") para o usuário não ficar sem entender por que o botão está apagado.
5. Sem mudanças de schema, backend, rotas ou lógica de cálculo — apenas reordenação/UX e microcopy.

Isso resolve o "não estou conseguindo definir o valor": o input fica imediatamente visível e óbvio, e os preços de preview passam a ser consequência do que foi digitado.