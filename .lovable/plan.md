# Posts só para assinantes

## O que muda para o creator
- No publicador aparece uma nova opção: **"Só para assinantes"**, ao lado de "Pago" e "Desafio". Só dá para escolher uma das três.
- Pode colocar uma prévia, como nos posts pagos.
- O que já foi publicado não muda: posts grátis continuam visíveis para todos.

## O que muda para o fã
- **Assinante ativo** (dentro do ciclo pago) vê o post completo, sem pagar nada a mais.
- **Quem não assina** vê o post borrado com a prévia e um botão **"Assinar para ver"**, que leva à assinatura desse creator.
- Quando a assinatura vence, o post volta a ficar bloqueado.
- Posts pagos e desafios continuam cobrando de todo mundo, inclusive do assinante.

## Onde a regra vale
O feed, o perfil do creator, as coleções salvas e as publicações agendadas. A liberação é conferida no servidor e no banco, então ninguém vê a mídia só mexendo na tela.

## Detalhes técnicos
- Migration:
  - Incluir `'subscribers'` no check de `publications.visibility`.
  - Atualizar `can_see_publication`: libera quando `visibility='subscribers'` e existe uma `subscriptions` com subscriber = auth.uid(), creator = author, status `active` e `current_period_end > now()`. Quando o post tem `creator_profile_id`, a assinatura também precisa ser daquele perfil.
- `src/lib/publications.functions.ts`:
  - Aceitar `"subscribers"` no schema.
  - Buscar as assinaturas ativas do usuário para os autores da página.
  - Em `isUnlocked`, nas 3 listagens e na de post único, liberar o post quando o usuário é assinante.
  - Para quem não assina, mandar só a prévia, com a mesma regra de URLs assinadas usada nos posts pagos.
- `src/routes/_authenticated/publisher.tsx`: novo toggle, que não pode ficar ligado junto com Pago ou Desafio, e a prévia também habilitada para esse tipo.
- `src/components/feed/PublicationCard.tsx`: selo "Assinantes" e o botão "Assinar para ver" levando ao fluxo de assinatura que já existe.
- `colecoes.tsx` e `publicacoes-agendadas.tsx`: tratar o novo tipo nos rótulos.
- Teste: um teste para a regra de liberação, com assinante ativo vendo, assinatura vencida bloqueada e quem não assina bloqueado.
