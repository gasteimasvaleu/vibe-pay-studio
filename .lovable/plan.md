## Objetivo
Aplicar o novo branding "monetisexy." (moneti em preto + sexy. no gradiente roxo) na navbar das páginas `/` e `/cadastro`, remover os elementos da navbar na página `/cadastro` mantendo apenas o logo, e atualizar o nome no footer.

## Escopo
1. **Navbar — página `/cadastro`**: modo minimal. Apenas o logo "monetisexy." deve aparecer, centralizado/alinhado. Remover links de navegação, botões de idioma/entrar/criar conta e menu mobile.
2. **Navbar — página `/`**: manter todos os elementos atuais, apenas trocar o texto do logo para "monetisexy." com as cores solicitadas.
3. **Footer**: trocar o texto "monetisex" por "monetisexy." com as mesmas cores.

## Implementação

### 1. Componente `src/components/site/Navbar.tsx`
- Adicionar prop opcional `minimal?: boolean`.
- Reescrever o logo para renderizar:
  - `<span className="text-black">moneti</span>`
  - `<span className="text-gradient-primary">sexy.</span>`
- Quando `minimal === true`:
  - Ocultar `<nav>` de links.
  - Ocultar a área de botões (idioma, Entrar, Criar conta).
  - Ocultar o botão de menu mobile.
  - Manter o container com `justify-center` (ou equivalente) para centralizar o logo.
- Quando `minimal === false` (padrão): manter layout atual, apenas com o novo texto de logo.

### 2. Componente `src/components/site/Layout.tsx`
- Receber e repassar a prop `minimal` para `<Navbar minimal={minimal} />`.
- Manter `Footer` inalterado em relação a essa prop.

### 3. Página `src/routes/cadastro.tsx`
- Alterar `<SiteLayout>` para `<SiteLayout minimal>`.

### 4. Componente `src/components/site/Footer.tsx`
- Substituir o bloco de logo por:
  - `<span className="text-2xl font-black tracking-tight text-card-foreground">moneti<span className="text-gradient-primary">sexy.</span></span>`
- Verificar se a cor preta fica legível sobre o fundo branco do card flutuante; ajustar para `text-black` se necessário, respeitando o tema.

## Validação
- Verificar visualmente nas rotas `/` e `/cadastro` que:
  - O logo exibe "monetisexy." corretamente.
  - Em `/cadastro` não há links, botões ou menu mobile visíveis.
  - O footer exibe o novo nome em todas as páginas que o utilizam.
- Rodar `bunx tsc --noEmit` (ou o typecheck do projeto) para garantir que a prop `minimal` está tipada corretamente.

## Observações
- Não serão alterados arquivos auto-gerados (ex.: `routeTree.gen.ts`) nem rotas nomeadas como `my-monetisex-stats`.
- Outras ocorrências do texto "monetisex" (ex.: meta tag em `account-status.tsx`) não estão no escopo desta tarefa, a menos que o usuário peça consistência total.