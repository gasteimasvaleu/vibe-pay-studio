## Página "Criar Perfil Gratuito" (/criar-perfil-gratuito)

Fluxo autenticado em 2 steps, acessado pelo card "Perfil Gratuito" do dashboard do creator.

### Rota e navegação

- Novo arquivo: `src/routes/_authenticated/criar-perfil-gratuito.tsx`
  - `createFileRoute("/_authenticated/criar-perfil-gratuito")`
  - `head()` com título "Criar perfil gratuito · Monetisexy" + `robots: noindex`
  - Estado local `step` (1 | 2) controla qual etapa renderiza (sem sub-rota; botão voltar do step 2 volta para step 1; no step 1 volta para o dashboard)
- `src/components/dashboard/CreatorDashboard.tsx`: adicionar `to="/criar-perfil-gratuito"` no `ActionCard` "Perfil Gratuito"

### Layout comum

Fundo claro (`bg-background`), header simples com botão voltar (chevron esquerda, `router.history.back()` no step 1 / `setStep(1)` no step 2) e título centralizado. Container `max-w-3xl mx-auto px-4 py-6 space-y-6`. Nada de `DashboardShell` (o fluxo é imersivo, sem profile header).

### Step 1 — "Crie seu perfil gratuito"

- Título do header: "Crie seu perfil gratuito"
- Colagem no topo: grade responsiva com 4 imagens (2 grandes verticais nas laterais + 1 grande vertical central destacada + 1 quadrada) usando placeholders de `picsum.photos` (sem gerar binários agora)
- Título laranja centralizado: "Conheça seu novo perfil" (`text-primary`, fonte bold, ~2xl)
- Subtítulo cinza: "Você começa sem custo e com todas as ferramentas de faturamento à sua disposição."
- Lista numerada com números em laranja:
  1. O Perfil será gratuito para seus assinantes.
  2. Perfis gratuitos não viram pagos depois.
  3. Use todas as ferramentas da Monetisexy para faturar.
- Botão largo laranja "Avançar" fixo no rodapé (`w-full rounded-full bg-primary text-primary-foreground py-4`) → `setStep(2)`

### Step 2 — "Personalizando perfil"

- Título do header: "Personalizando perfil"
- Avatar circular grande centralizado (`h-32 w-32 rounded-full bg-muted grid place-items-center`) exibindo as iniciais do nome de perfil digitado (ou "CA" enquanto vazio); overlay de câmera (ícone `Camera` do lucide) num badge branco circular no canto inferior direito — `<input type="file" accept="image/*">` escondido dispara upload; o arquivo fica no estado local (sem persistência agora).
- Campo `Input` pill: placeholder "Nome de perfil" (`rounded-full bg-muted/50 border-0 h-12 px-5`)
- Campo `Input` pill: placeholder "monetisexy.com/(seu @)" (mesmo estilo)
- Título de seção: "Escolha uma foto de capa e sua biografia" (`text-sm font-semibold`)
- Grade horizontal com 3 miniaturas de capa (placeholders picsum, `aspect-[4/3] rounded-xl overflow-hidden`); a miniatura selecionada mostra overlay escuro + ícone de câmera branco central. Clicar em uma seleciona (borda destacada); adicionar botão "+ Enviar sua foto" que abre input file escondido.
- `Textarea` grande: placeholder "Biografia" (`rounded-2xl bg-muted/50 border-0 min-h-40 p-4 resize-none`)
- Botão largo "Criar Conta" (`w-full rounded-full py-4`) desabilitado enquanto nome de perfil ou @ estiverem vazios; habilitado com `bg-primary text-primary-foreground`. Ao clicar: por enquanto apenas `toast.success("Perfil criado!")` + navega para `/dashboard` (sem chamar Supabase — persistência ficará para próxima iteração).

### Componentes

Criar em `src/components/criar-perfil-gratuito/`:
- `StepHeader.tsx` — header com back + título
- `Step1Intro.tsx`
- `Step2PersonalizarPerfil.tsx`

Reutilizar `Input`, `Textarea`, `Button` de `@/components/ui/*`. Ícones `ArrowLeft`, `Camera` do lucide. Tokens semânticos apenas (`bg-primary`, `text-primary`, `bg-muted`, `text-muted-foreground`, `text-foreground`).

### Escopo

- Apenas UI + navegação de steps. Sem migrations, sem server functions, sem upload real ao Supabase Storage nesta iteração (arquivos apenas em memória via `URL.createObjectURL`).
- Validação client-side simples: nome de perfil obrigatório, @ obrigatório (regex `^[a-z0-9_.]{3,30}$`), biografia opcional. Sem zod nesta iteração — validação inline via booleans.
- Não altera o comportamento de outros cards ou rotas.
