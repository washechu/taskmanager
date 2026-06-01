-- Иконка привычки (эмодзи) + категория больше не задаётся в UI (привычки личные),
-- поэтому проставляем дефолт, чтобы вставка без категории не падала.

alter table habits add column if not exists icon text;
alter table habits alter column category set default 'personal';
