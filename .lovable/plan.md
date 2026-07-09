## Plano

### 1. Corrigir a tela final "Parabéns, sua oferta foi criada"
No card de pré-visualização da oferta:
- Reposicionar o selo **"Economize X%"** para que fique **acima** do botão "Assinar agora" (com respiro), sem sobrepor o botão nem sair para fora do card.
- Ajustar o card para ficar mais compacto e alinhado ao restante do fluxo (padding, largura do botão, tamanho do selo).
- Garantir que "Preço original R$ XX,XX" fique logo abaixo do botão, alinhado à direita, sem cortar.
- Manter os dois botões inferiores ("Ver perfil" e "Ver minhas ofertas") no mesmo padrão pill usado nas outras etapas.
- Não mexer em navbar, fundo branco, barra de progresso nem textos.

### 2. Criar tabela de ofertas no backend (Supabase)

Nova tabela `public.promotions` para armazenar as ofertas criadas pelos creators. Campos de negócio:
- `creator_id` → dono da oferta (referência ao usuário)
- `name` → nome da campanha
- `max_subscriptions` → limite de assinaturas que podem aproveitar
- `duration_days` → duração da oferta (1–7)
- `discount_pct` → percentual de desconto (5–60)
- `monthly_price_snapshot` → preço mensal no momento da criação
- `promo_price` → valor promocional calculado
- `description` → descrição livre (até 100 caracteres)
- `status` → `active` | `paused` | `ended` (default `active`)
- `starts_at`, `ends_at` → janela da oferta
- `subscriptions_used` → contador (default 0)

Regras de acesso (RLS):
- Criador autenticado pode **ver, criar, editar e excluir** apenas as próprias ofertas.
- Qualquer pessoa autenticada pode **ver ofertas ativas** de qualquer criador (para futura exibição no perfil/feed).
- `service_role` com acesso total.

Também:
- Índices em `creator_id` e `status`.
- Trigger `updated_at`.
- GRANTs padrão para `authenticated` e `service_role`.

### 3. Persistir a oferta ao concluir o wizard
- Criar um server function `createPromotion` (`src/lib/promotions.functions.ts`) com `requireSupabaseAuth` que valida e insere na tabela `promotions`, retornando a oferta criada.
- Na etapa "Descrição" do wizard, ao clicar em **Concluir**: chamar o server function, e só então avançar para a tela de sucesso. Mostrar erro amigável se falhar.
- Passar o `discount_pct` real e o `promo_price` retornado para a tela de sucesso (hoje já é calculado no client, apenas garantir consistência).

### 4. Fora de escopo (agora)
- Listagem/edição/exclusão de ofertas em uma tela dedicada. Fica pronto no backend; a UI de listagem será feita quando você indicar onde exibir.

### Detalhes técnicos
- Migration seguirá a estrutura obrigatória: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY, com trigger `updated_at` e função `set_updated_at` já existente reutilizada.
- Server function em `src/lib/promotions.functions.ts` (client-safe path), usando `context.supabase` para respeitar RLS como o próprio creator.
- Sem alterações em navbar, layout global ou lógica de progresso do wizard.
