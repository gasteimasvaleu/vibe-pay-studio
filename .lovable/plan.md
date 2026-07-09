## Nova página: Configurações do Chat

Criar uma rota dedicada acessada pelo ícone de engrenagem (Settings) na sidebar de conversas, com o layout dos screenshots adaptado às cores e ao tema do app.

### Rota
- Arquivo: `src/routes/_authenticated/chat.configuracoes.tsx` → URL `/chat/configuracoes`
  - Como `chat.tsx` é layout com `<Outlet />`, esta página renderiza no painel direito (sem sair da experiência de chat).
- Atualizar o ícone `Settings` em `src/routes/_authenticated/chat.tsx` para um `<Link to="/chat/configuracoes">`.

### Layout (adaptado ao design system)
Estrutura em coluna, centralizada, dentro do painel de conteúdo do chat:

1. **Header**
   - Botão voltar (ícone `ArrowLeft`) à esquerda → navega para `/chat`.
   - Título centralizado "Configurações" (font-semibold, `text-foreground`).
   - Borda inferior `border-border`.

2. **Banner de dica** (equivalente ao verde claro do screenshot)
   - Fundo suave usando token semântico (`bg-accent/40` ou `bg-muted`), borda `border-border`, cantos `rounded-xl`.
   - Ícone `Lightbulb` em `text-primary`.
   - Texto: "Aproveite o primeiro contato para se apresentar e oferecer uma mídia exclusiva de boas vindas".

3. **Linha de toggle**
   - Título "Habilitar mensagem de boas-vindas" + subtítulo "Sua mensagem de boas-vindas é enviada automaticamente aos novos assinantes".
   - Componente `Switch` do shadcn à direita (herda `--primary` da paleta do app — sem laranja fixo).

4. **Área do compositor** (só aparece quando o toggle está ativo)
   - Container `rounded-2xl border border-border bg-card` com padding.
   - `Textarea` sem borda, placeholder "Mín. 3 caracteres", altura mínima ~140px.
   - Barra de ações abaixo: ícones `Image`, `Mic`, `Archive`, `Smile`, `Tag` (lucide), cada um com `Tooltip` (usando componente `Tooltip` do shadcn) — labels: "Adicionar mídia", "Gravar um áudio", "Adicionar mídia do acervo", "Adicionar um emoji", "Adicionar tag". Ícones apenas visuais nesta etapa (sem lógica).

5. **Botão "Salvar alterações"**
   - `Button` full-width, `rounded-full`, altura ~48px, usando `bg-gradient-primary text-primary-foreground shadow-glow` (padrão do app, ao invés do laranja do screenshot).
   - Desabilitado quando o toggle está desligado ou o texto tem menos de 3 caracteres.

### Estado
- Local somente (nesta etapa): `enabled: boolean`, `message: string`.
- Sem persistência backend — apenas UI. Se o usuário quiser salvar no Supabase depois, tratamos em um próximo pedido.

### Fora de escopo
- Persistência da mensagem, upload de mídia, gravação de áudio, picker de emoji, sistema de tags.
- Alterações em outras telas do chat.
