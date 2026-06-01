-- Тип комментария: 'user' — обычный, 'audit' — авто-запись об изменениях задачи
alter table comments
  add column if not exists kind text default 'user'
    check (kind in ('user', 'audit'));

-- Удалять можно только свои пользовательские комментарии (audit удалять нельзя)
drop policy if exists "Delete own comments" on comments;

create policy "Delete own user comments" on comments
  for delete using (
    kind = 'user' and (
      (author = 'nick'  and auth.email() = 'washechuvachestvo@gmail.com') or
      (author = 'galya' and auth.email() = 'holyterror@icloud.com')
    )
  );
