Ajustar os espaçamentos verticais da página `/cadastro` para reduzir o vão entre os cards e a navbar/footer.

## O que será alterado

1. **`src/routes/cadastro.tsx`**
   - Diminuir o padding vertical da seção principal (`py-16 md:py-24`) para aproximadamente `py-8 md:py-10` (ou equivalente) para aproximar os cards da navbar e do footer.
   - Revisar o espaçamento interno do card de cadastro (`p-6 md:p-10`) e do `HeroCard` para manter o conteúdo confortável sem exagerar na altura total.

2. **`src/components/site/Footer.tsx` (se necessário)**
   - Verificar se existe `mt-` ou `py-` excessivo no footer e ajustar para evitar grande vazio acima/abaixo dele.

## Resultado esperado
- A página `/cadastro` no desktop terá os dois cards (formulário e HeroCard) mais próximos da navbar superior e do footer inferior.
- Os cards continuam alinhados em altura e centralizados, sem quebrar o layout responsivo.
- O mobile também é beneficiado com menos espaço vazio.