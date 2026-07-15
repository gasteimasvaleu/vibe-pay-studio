Ajustes visuais no card de oferta de assinatura em `src/routes/_authenticated/perfil.$username.tsx`.

## Mudanças

### 1. Card de promoção como card aninhado dentro do card de perfil
- O `SubscriptionOfferCard` hoje é renderizado como um bloco sem borda/background próprio (`space-y-3`) dentro do card de identidade.
- Envolver o conteúdo interno do `SubscriptionOfferCard` em um container com aparência de card: `rounded-2xl` (ou `rounded-3xl`), borda sutil, background diferenciado (`bg-background` ou tom mais claro que o `bg-card` do perfil) e padding interno (`p-4 md:p-5`).
- Manter o wrapper externo no card de identidade com `pr-4 md:pr-6 pt-2`, para que o card de promoção fique alinhado ao conteúdo do perfil.

### 2. Manter posição da badge "Economize X%" conforme screenshot
- A badge já está como pill inline acima do botão (`inline-flex rounded-full bg-emerald-500/15 ...`).
- Garantir que fique alinhada à esquerda, acima do botão, sem `absolute` ou sobreposição.

### 3. Manter botão "Assinar agora" mais fino
- O botão já está ajustado para `h-11 text-sm` com `shadow-sm` e gradiente.
- Manter `rounded-2xl` e o estilo de gradiente atual.

### 4. Preservar estrutura interna
- Manter cabeçalho com `Sparkles` + "Oferta de assinatura".
- Manter countdown, avatar + campo com nome da oferta, botão CTA e "Preço original" riscado.

## Fora de escopo
- Nenhuma mudança em lógica de negócio, loader, tipos ou tabelas.
- Nenhuma mudança no `SubscriptionPlansCard` ("Assinaturas") logo abaixo.