Ajustes visuais no card de oferta de assinatura em `src/routes/_authenticated/perfil.$username.tsx`.

## Mudanças

### 1. Mover o card da oferta para dentro do card de identidade do perfil
- Hoje o `<SubscriptionOfferCard />` é renderizado fora do bloco de identidade (linhas 666–674), como uma seção irmã com borda/sombra próprias — por isso aparece "solto" abaixo do perfil.
- Mover essa renderização para dentro do `<div>` do card de identidade (linhas 599–664), logo após o bloco de botões "Mimo / Chat" (após a linha 651), de modo que o conteúdo apareça abaixo do bio, ainda dentro da mesma "folha" do perfil, como no primeiro screenshot de referência.
- Adicionar padding direito ao container (`pr-4 md:pr-6`) para casar com o padding esquerdo já existente.

### 2. Ajustar o `SubscriptionOfferCard` para viver dentro do card do perfil
- Remover o wrapper externo com borda/sombra/background próprios (`rounded-3xl border border-primary/30 bg-primary/[0.04] p-5 md:p-6 shadow-card`) — passa a ser apenas um bloco com espaçamento vertical (`pt-2 space-y-3`), sem cartão duplicado.
- Manter a estrutura interna: cabeçalho com `Sparkles` + "Oferta de assinatura", countdown, avatar + campo com o nome da oferta, botão CTA e "Preço original" riscado.

### 3. Ajustar a badge "Economize X%"
- Hoje está posicionada com `absolute -top-3 left-3` sobrepondo o botão — no primeiro screenshot ela é um pill inline acima do botão, alinhado à esquerda, sem sobreposição.
- Trocar por um pill inline (`inline-flex` num container acima do botão), sem `absolute`, mantendo cores emerald atuais.

### 4. Afinar o botão "Assinar agora"
- Reduzir de `h-14 text-base` para algo mais próximo dos demais botões do perfil (`h-11 text-sm`), remover `shadow-lg` deixando apenas `shadow-sm`, manter o gradient e o `rounded-2xl`.

## Fora de escopo
- Nenhuma mudança em lógica de negócio, loader, tipos ou tabelas.
- Nenhuma mudança no `SubscriptionPlansCard` ("Assinaturas") logo abaixo.
