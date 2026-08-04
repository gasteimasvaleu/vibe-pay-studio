# Boas-vindas do feed como primeira visita

## Situação atual

O carrossel `CircularSteps` só é renderizado no `feed.tsx` dentro do ramo `feedItems.length === 0`. Como as publicações do admin `monetisexy` agora aparecem obrigatoriamente para todos, praticamente nenhum usuário verá esse elemento.

## O que muda

Transformar o `CircularSteps` em uma experiência de **boas-vindas de primeira visita**: aparece sozinho em tela cheia no primeiro acesso ao feed, pode ser dispensado pelo usuário, e nunca mais volta. O estado vazio passa a mostrar apenas uma mensagem simples.

## Implementação

### 1. Banco de dados

Nova coluna em `public.profiles`:

```sql
ALTER TABLE public.profiles ADD COLUMN feed_welcome_seen_at timestamptz;
```

A coluna já existe na tabela e as políticas de UPDATE permitem que o usuário altere apenas a própria linha, então basta garantir que o campo esteja disponível para leitura/escrita.

### 2. Server functions

Criar `src/lib/feed-welcome.functions.ts` com:

- `getFeedWelcomeSeen()` — retorna `true`/`false` consultando `feed_welcome_seen_at` do perfil logado.
- `markFeedWelcomeSeen()` — define `feed_welcome_seen_at = now()` para o perfil logado.

Ambas usam `createServerFn` com `requireSupabaseAuth` e leem/escrevem via `context.supabase`.

### 3. Feed (`src/routes/_authenticated/feed.tsx`)

- Carregar o estado `welcomeSeen` via `useServerFn(getFeedWelcomeSeen)` em uma `useQuery`.
- Enquanto `welcomeSeen` está carregando, mostrar o loader existente.
- Se `welcomeSeen === false`:
  - Renderizar o `CircularSteps` ocupando a tela sozinha, sem stories e sem publicações.
  - Adicionar botão **X** no canto superior direito para dispensar imediatamente.
  - Adicionar botão **"Concluir"** no final do carrossel (último slide) que também dispensa.
  - Ao dispensar, chamar `markFeedWelcomeSeen()` e, em seguida, invalidar a query para revelar o feed normal.
- Se `welcomeSeen === true`:
  - Renderizar o feed normal (stories + publicações).
  - Se o feed estiver vazio, mostrar a mensagem simples "Você chegou ao fim do feed." / "Nenhuma publicação por enquanto." em vez do carrossel completo.

### 4. Componente `CircularSteps`

Adicionar props opcionais:

- `onDismiss?: () => void` — chamado pelo botão X.
- `showDoneButton?: boolean` — exibe o botão "Concluir" no último slide.
- `onDone?: () => void` — chamado pelo botão "Concluir".

Manter o autoplay e a navegação por setas inalterados.

## Detalhes técnicos

- Persistência por conta: o flag fica no banco, então o usuário não vê a boas-vindas novamente ao trocar de dispositivo.
- O estado de "não visto" é padrão `NULL`, então usuários antigos também verão a boas-vindas uma única vez na próxima visita.
- A tela de boas-vindas usa o mesmo fundo escuro/gradiente do feed para não quebrar a transição visual.
