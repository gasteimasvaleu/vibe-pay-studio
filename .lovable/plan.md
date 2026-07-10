## Criar página /vault (Acervo)

### 1. Nova rota `src/routes/_authenticated/vault.tsx`
- `createFileRoute("/_authenticated/vault")`, `head()` com "Acervo · Monetisexy" + `noindex`.
- Layout `max-w-6xl mx-auto`, header com botão voltar + título "ACERVO" + ícones de busca (lupa) e adicionar (+).
- Grid 2 colunas em desktop (`md:grid-cols-[minmax(0,360px)_1fr]`), stack em mobile — no mobile mostra só a sidebar; ao tocar num item vai para a view de detalhe (mesma página, controlada por estado `activeTab`).
- **Sidebar esquerda** ("PADRÃO"): lista com 4 itens
  - Todas as mídias (contador `1`, com ícone imagem)
  - Publicações (contador `1`, com ícone imagem)
  - Conversas — "Vazio"
  - Envios — "Vazio"
  - Item ativo com fundo `bg-primary/10` (rosa claro).
- **Painel direito** muda conforme aba ativa:
  - **Todas as mídias / Publicações**: header "MAIS RECENTES" + filtros pill (TODAS, FOTO, VÍDEO, ÁUDIO, GIF); área de conteúdo vazia (sem cards, conforme instrução do usuário).
  - **Conversas / Envios**: estado vazio centralizado com ilustração cinza (SVG simples de frames de mídia empilhados) + texto "Categoria vazia".
- Ícone extra no header direito muda por aba: Publicações → checkbox; Envios → `+`; outras → nenhum.

### 2. Editar `src/components/dashboard/CreatorDashboard.tsx`
- Adicionar `to="/vault"` ao `ActionCard` "Acervo" (linhas 58-62).

### Nota técnica
- Puramente presentacional/UI, sem backend. Estados vazios são fixos por enquanto.
- Ícones do `lucide-react`: `ArrowLeft`, `Search`, `Plus`, `ImageIcon`, `CheckSquare`, `SlidersHorizontal`.
