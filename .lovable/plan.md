## Decisão confirmada: monetização no perfil gratuito

**Comportamento desejado:** perfis gratuitos de creator podem publicar conteúdo pago (posts avulsos/PPV e desafios), sem bloqueio de monetização.

**Estado atual do sistema:**
- O publisher (`/publisher`) exibe o toggle "Publicação paga" e "Desafio" para qualquer creator, independentemente do perfil ativo ser pago ou gratuito.
- A função `createPublication` não restringe `visibility = paid/challenge` por tipo de perfil.
- O banco possui o trigger `publications_fill_profile()`, que preenche `publications.creator_profile_id` com o perfil ativo do autor no momento da publicação. Ou seja, se o autor está no modo gratuito, o post pago fica vinculado ao perfil gratuito.
- O trigger `publication_unlocks_sync_transaction()` usa o `creator_profile_id` da publicação para gerar a `transaction` de desbloqueio, então a receva do PPV é atribuída ao perfil gratuito correto.

**Ação:** nenhuma alteração de código necessária. O requisito já está atendido.