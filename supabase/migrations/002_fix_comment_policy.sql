-- Обновление RLS политики для удаления комментариев
-- Старая политика проверяла nick@example.com / galya@example.com
-- Новая использует реальные email пользователей

drop policy if exists "Delete own comments" on comments;

create policy "Delete own comments" on comments
  for delete using (
    (author = 'nick'  and auth.email() = 'washechuvachestvo@gmail.com') or
    (author = 'galya' and auth.email() = 'holyterror@icloud.com')
  );
