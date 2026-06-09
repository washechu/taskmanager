-- м.024 — различаем «приглашённый отклонил» и «инициатор отозвал».
--
-- Баг: при отзыве предложения инициатором срабатывал тот же триггер
-- _notify_invite_replied (invite_status pending→none), что и при ответе
-- приглашённого. Функция считала, что ответил «второй участник», и слала
-- инициатору «❌ <второй> отклонил твоё предложение» — хотя отклонения не было,
-- это инициатор сам отозвал.
--
-- Фикс: смотрим, КТО сделал действие, через _actor() (auth.email() для UI,
-- app.actor для Telegram-RPC):
--   • actor == invited_by  → ОТЗЫВ. Инициатору не шлём (он сам сделал),
--     приглашённому шлём «↩️ <инициатор> отозвал предложение».
--   • иначе                → ответ приглашённого, шлём инициатору как раньше.
--
-- Заодно: согласование рода глаголов («Галочка отклонилА», «приняла», и т.п.).
--
-- Зависит от м.011 (_actor), м.021 (предыдущая версия функции).

create or replace function _notify_invite_replied()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  invitee       text;    -- приглашённый = участник из OLD.assignees, не инициатор
  invitee_chat  bigint;
  inviter_chat  bigint;
  real_actor    text;
  fem           text;    -- 'а' если действующее лицо — Галочка, иначе ''
  verdict       text;
  body          text;
begin
  if OLD.invite_status <> 'pending' then return NEW; end if;
  if NEW.invite_status not in ('accepted', 'tentative', 'declined', 'none') then return NEW; end if;
  if NEW.invited_by is null then return NEW; end if;

  select a into invitee
  from unnest(OLD.assignees) a
  where a <> NEW.invited_by
  limit 1;
  if invitee is null then return NEW; end if;

  real_actor := _actor();

  -- ── Кейс ОТЗЫВА: действие сделал сам инициатор ───────────────────
  if real_actor is not null and real_actor = NEW.invited_by
     and NEW.invite_status in ('none', 'declined') then
    invitee_chat := _chat_id_of(invitee);
    if invitee_chat is not null then
      fem := case NEW.invited_by when 'galya' then 'а' else '' end;
      body := '↩️ <b>' || _display_name(NEW.invited_by) || '</b> отозвал' || fem ||
              ' предложение' || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
      perform _send_telegram(invitee_chat, body, invitee, 'invite_reply');
    end if;
    return NEW;
  end if;

  -- ── Иначе: ответил приглашённый — уведомляем инициатора ──────────
  inviter_chat := _chat_id_of(NEW.invited_by);
  if inviter_chat is null then return NEW; end if;

  fem := case invitee when 'galya' then 'а' else '' end;
  verdict := case
    when NEW.invite_status = 'accepted'  then '✅ <b>' || _display_name(invitee) || '</b> принял' || fem || ' твоё предложение'
    when NEW.invite_status = 'tentative' then '🤔 <b>' || _display_name(invitee) || '</b> ответил' || fem || ': думаю'
    when NEW.invite_status = 'declined' or NEW.invite_status = 'none'
                                         then '❌ <b>' || _display_name(invitee) || '</b> отклонил' || fem || ' твоё предложение'
    else null
  end;
  if verdict is null then return NEW; end if;

  body := verdict || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';

  perform _send_telegram(inviter_chat, body, NEW.invited_by, 'invite_reply');
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite_reply', false, sqlerrm);
  return NEW;
end;
$$;
