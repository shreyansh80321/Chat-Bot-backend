alter table public.documents add column if not exists user_id text;
alter table public.documents add column if not exists document_id uuid;
alter table public.documents add column if not exists file_name text;

create index if not exists documents_user_id_idx on public.documents(user_id);

drop function if exists public.match_documents(extensions.vector, float, int);
create or replace function public.match_documents(
  query_embedding extensions.vector(768),
  match_threshold float,
  match_count int,
  filter_user_id text
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable set search_path = public, extensions as $$
  select d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.user_id = filter_user_id
    and 1 - (d.embedding <=> query_embedding) >= match_threshold
  order by d.embedding <=> query_embedding limit match_count;
$$;
