create extension if not exists vector with schema extensions;
create table if not exists public.documents (id uuid primary key default gen_random_uuid(), content text not null, metadata jsonb not null default '{}'::jsonb, embedding extensions.vector(768));
create or replace function public.match_documents(query_embedding extensions.vector(768), match_threshold float, match_count int)
returns table (id uuid, content text, metadata jsonb, similarity float) language sql stable as $$
  select documents.id, documents.content, documents.metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents where 1 - (documents.embedding <=> query_embedding) >= match_threshold
  order by documents.embedding <=> query_embedding limit match_count;
$$;
create index if not exists documents_embedding_hnsw on public.documents using hnsw (embedding vector_cosine_ops);
