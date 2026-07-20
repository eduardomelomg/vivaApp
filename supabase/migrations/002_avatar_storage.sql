-- Fotos públicas usadas no perfil e no ranking. O caminho sempre começa pelo
-- UUID do proprietário, por exemplo: <user-id>/avatar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1500000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads viva avatars" on storage.objects;
create policy "public reads viva avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "users upload own viva avatar" on storage.objects;
create policy "users upload own viva avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users update own viva avatar" on storage.objects;
create policy "users update own viva avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own viva avatar" on storage.objects;
create policy "users delete own viva avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
