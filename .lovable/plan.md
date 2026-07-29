## Diagnóstico

O contador "Mídias" (e por tabela "Fotos"/"Vídeos") do header do perfil está caindo para 0 quando o visitante não é assinante do criador.

Verifiquei no banco:
- `monetisexy` tem 4 publicações, todas com 1 mídia cada e `visibility = 'paid'`.
- Apenas 1 não está arquivada → é essa que aparece como "1 Postagens" (RLS de `publications` esconde as arquivadas para quem não é dono).
- As linhas de `publication_media` das publicações pagas ficam bloqueadas por RLS para quem ainda não pagou, então o `count()` de `publication_media` retorna 0 mesmo com a postagem visível.

Ou seja: o contador de postagens vem do count de `publications` (visíveis), e o contador de mídias vem do count de `publication_media` (paywalladas). Eles usam RLS diferentes, e por isso divergem.

## Correção

Fazer a contagem de mídias derivar das mesmas linhas de `publications` que já passaram pela RLS, em vez de contar `publication_media` diretamente.

### Arquivo
`src/routes/_authenticated/perfil.$username.tsx` (loader, linhas 95–130 e 223–226)

### Mudanças
1. Trocar os três counts de `publication_media` (mediaCount, photosCount, videosCount) por uma única query em `publications` que traga, para o mesmo `author_id` visível ao viewer, os agregados via uma coluna calculada no server ou via chamada a uma RPC dedicada.
2. Implementação prática sem migração nova: no loader, buscar os `id`s das publicações visíveis do autor (`select id, visibility from publications where author_id = ...`) — o resultado já respeita RLS. Em paralelo, chamar uma pequena RPC `public.count_author_media(author_id uuid)` (SECURITY DEFINER, `set search_path=public`) que retorna `{ total, photos, videos }` contando `publication_media` juntando em `publications` com os mesmos filtros públicos do feed (não arquivada, `moderation_status='approved'`, `published_at <= now()`), bypassando a RLS de paywall — porque contar quantas mídias existem não expõe o conteúdo em si.
3. Usar o retorno da RPC para preencher `mediaCount`, `photosCount`, `videosCount`. `lockedCount` continua vindo de `publications` (já respeita RLS e é o que queremos exibir).

### Migração
Adicionar função:

```text
create or replace function public.count_author_media(_author_id uuid)
returns table(total int, photos int, videos int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::int as total,
    count(*) filter (where m.type = 'image')::int as photos,
    count(*) filter (where m.type = 'video')::int as videos
  from publication_media m
  join publications p on p.id = m.publication_id
  where p.author_id = _author_id
    and p.archived_at is null
    and p.moderation_status = 'approved'
    and p.published_at is not null
    and p.published_at <= now();
$$;

grant execute on function public.count_author_media(uuid) to anon, authenticated;
```

Isso mantém o número de mídias consistente com "1 Postagens" (1 mídia visível na aba, portanto o header vai mostrar "1 Mídias" em vez de 0) e não vaza os arquivos em si — a mídia continua bloqueada até o pagamento; apenas o *contador* fica coerente.

## Observação

Se você preferir a política oposta — "só conta o que o visitante já pode ver" — o caminho seria o inverso: usar o count de `publication_media` como fonte da verdade **também** para "Postagens" (só contar posts cuja mídia é visível). Prefiro a proposta acima porque bate com o comportamento típico de plataformas (o contador do header mostra o acervo do criador, o paywall bloqueia só o conteúdo).