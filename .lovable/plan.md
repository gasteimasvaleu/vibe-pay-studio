Diagnóstico:

- O perfil `monetisex` tem assinatura mensal configurada em `R$ 29,00`.
- Os descontos de `3 meses` e `6 meses` estão como `0%` no banco.
- Na tela do perfil, o app só mostra os planos de `3 meses` e `6 meses` dentro da seção “Promoções” quando existe desconto trimestral ou semestral maior que zero.
- Por isso, na página individual aparece apenas `1 mês`.
- A promoção ativa `teste` de `5%` é outra coisa: ela aparece no card de oferta e atualmente é aplicada somente ao plano mensal.

Se quiser ajustar, o plano é:

1. Alterar a regra visual da página de perfil para mostrar também `3 meses` e `6 meses` mesmo quando o desconto for `0%`.
2. Deixar esses planos abaixo de “Assinaturas”, não dependentes da seção “Promoções”.
3. Manter o card da promoção ativa separado, como oferta especial mensal.
4. Garantir que ao clicar em qualquer plano, o diálogo de assinatura receba o plano correto: mensal, trimestral ou semestral.