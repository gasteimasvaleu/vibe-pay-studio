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