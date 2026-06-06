-- м.014 — режим «делегирования»: семейная задача, отмечен только партнёр,
-- сам создатель не в assignees. До этой миграции триггер _auto_set_invite
-- срабатывал только при cardinality(assignees) = 2 — соответственно, когда
-- Галочка создавала задачу с одним Никитой в участниках, invite_status
-- оставался 'none', пуш не уходил.
--
-- Что меняем:
--   1. _auto_set_invite — учитываем cardinality=1 при условии assignees[1] <> actor
--   2. _notify_partner_done — если делегированная задача закрыта исполнителем,
--      уведомляем инициатора (хоть он и не в assignees)
--
-- Зависит от м.011.

-- ─── 1. Auto-set invite: добавили ветку делегирования ──────────────
create or replace function _auto_set_invite()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  actor text;
begin
  if NEW.category <> 'family'
     or coalesce(NEW.invite_status, 'none') <> 'none'
     or NEW.invited_by is not null then
    return NEW;
  end if;

  actor := _actor();
  if actor is null then return NEW; end if;

  -- Случай A: оба участника явно отмечены → классическое предложение
  if cardinality(NEW.assignees) = 2 then
    NEW.invited_by   := actor;
    NEW.invite_status := 'pending';
    return NEW;
  end if;

  -- Случай B: один участник, и это НЕ актор → делегирование
  -- (Галочка создаёт задачу, исполнителем ставит Никиту без себя)
  if cardinality(NEW.assignees) = 1 and NEW.assignees[1] <> actor then
    NEW.invited_by   := actor;
    NEW.invite_status := 'pending';
    return NEW;
  end if;

  return NEW;
end;
$$;

-- ─── 2. Партнёр выполнил — учитываем делегирование ─────────────────
-- Если задача делегирована (cardinality=1, invited_by заполнен) и
-- исполнитель закрыл её — шлём пуш инициатору.
create or replace function _notify_partner_done()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor          text;
  actor_name     text;
  recipient      text;
  recipient_chat bigint;
  body           text;
begin
  if OLD.status = 'done' or NEW.status <> 'done' then return NEW; end if;
  if NEW.category <> 'family' then return NEW; end if;

  actor := _actor();
  if actor is null then return NEW; end if;
  actor_name := _display_name(actor);

  -- Ветка A: классическая общая задача (assignees ≥ 2)
  if cardinality(NEW.assignees) >= 2 then
    for recipient in select a from unnest(NEW.assignees) a where a <> actor loop
      recipient_chat := _chat_id_of(recipient);
      if recipient_chat is null then continue; end if;
      body := '✔️ <b>' || actor_name || '</b> закрыл' ||
              case actor when 'galya' then 'а' else '' end ||
              ' общую задачу' || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
      perform _send_telegram(recipient_chat, body, recipient, 'done');
    end loop;
    return NEW;
  end if;

  -- Ветка B: делегирование (assignees=1, invited_by задан, актор == исполнитель)
  if cardinality(NEW.assignees) = 1
     and NEW.invited_by is not null
     and NEW.invited_by <> actor
     and actor = NEW.assignees[1] then
    recipient_chat := _chat_id_of(NEW.invited_by);
    if recipient_chat is null then return NEW; end if;
    body := '✔️ <b>' || actor_name || '</b> закрыл' ||
            case actor when 'galya' then 'а' else '' end ||
            ' задачу, которую ты делегировал' ||
            case NEW.invited_by when 'galya' then 'а' else '' end ||
            E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
    perform _send_telegram(recipient_chat, body, NEW.invited_by, 'done');
  end if;

  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'done', false, sqlerrm);
  return NEW;
end;
$$;
