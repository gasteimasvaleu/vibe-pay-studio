## Escopo

No card **Top postagem** (Visão geral › Destaques), adicionar um menu `⋮` no canto direito com 4 ações reais. Ao escolher uma opção, aparece um checkbox ao lado da postagem exibida e um botão **Aplicar** no rodapé do card; clicar em Aplicar executa a ação. Todas as ações reutilizam APIs já existentes, exceto **Fixar post**, que ganha uma nova server fn (coluna `pinned` já existe em `publications`).

Sem alterações nos outros cards, na página de arquivados, ou no fluxo de publicações.

## Mudanças

1. **UI do card `TopPostagemCard`** (`src/routes/_authenticated/my-monetisex-stats.tsx`)
   - Botão `⋮` no header (usa `DropdownMenu` já importado); opções: *Exibir estatísticas*, *Copiar link da publicação*, *Fixar post* (rótulo alterna para *Desafixar post* se `pinned = true`), *Arquivar post*.
   - Estado local `selectedAction` + `checked`. Escolher opção → mostra checkbox à esquerda da postagem exibida; header ganha texto "Ação: X" e botão *Cancelar*.
   - Rodapé do card mostra botão **Aplicar** (desabilitado se `!checked` ou nenhuma ação selecionada) + estado `isPending`.

2. **Ações**
   - *Exibir estatísticas*: abre um `Dialog` com métricas já retornadas por `getEngajamentoPublicacoes` (data, curtidas, comentários, mimos, faturamento). Sem nova query.
   - *Copiar link*: `navigator.clipboard.writeText(\`${origin}/perfil/${username}\`)` + toast. Username vem de uma pequena `useQuery` que chama uma helper existente (`getMyProfileHeader` / `getProfileSelf` — a que existir; se nenhuma servir, adiciono uma minúscula `getMyUsername` em `src/lib/profile.functions.ts` retornando `{ username }`).
   - *Fixar/Desafixar*: nova server fn `setPublicationPinned({ id, pinned })` em `src/lib/publications.functions.ts` — `requireSupabaseAuth`, `update publications set pinned = $ where id = $ and author_id = userId`. Sem migração (coluna já existe). Precisa de `pinned` no retorno de `getEngajamentoPublicacoes.items` — hoje já existe no select interno, só falta expor no map.
   - *Arquivar*: chama `setPublicationArchived({ id, archived: true })` (já existe).

3. **Feedback e cache**
   - `sonner` toast para sucesso/erro (padrão do projeto).
   - Ao concluir: `queryClient.invalidateQueries({ queryKey: ["stats"] })`, e para arquivar/fixar também `["archived-posts"]` e `["publications"]`. Limpa `selectedAction`/`checked`.

## Detalhes técnicos

- Nenhuma migração — `publications.pinned` e `publications.archived_at` já existem; RLS de update por dono já cobre.
- Sem novas rotas nem novas tabelas.
- Escopo estritamente no `TopPostagemCard`; `TopLiveCard` e `TopAssinantesCard` ficam iguais.
- Sem alterações nos tipos gerados do Supabase (a fn nova só usa colunas já tipadas).
