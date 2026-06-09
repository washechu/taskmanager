-- м.020 — отклонение приглашения через Telegram-кнопку ❌ переводит задачу
-- в статус «приостановлено» (paused), как и отклонение/отзыв из UI.
--
-- Раньше decline сбрасывал invite_status='none' и assignees=[invited_by],
-- но статус задачи оставался прежним (обычно 'todo'). Теперь — paused, чтобы
-- отклонённая задача не висела в активной работе у инициатора.
--
-- Зависит от м.011 (respond_to_invite_rpc).

create or replace function respond_to_invite_rpc(
  p_task_id  uuid,
  p_response text,
  p_actor    text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  task_row tasks%rowtype;
  new_assignees text[];
  audit_text text;
begin
  if p_actor not in ('nick', 'galya') then
    return jsonb_build_object('ok', false, 'error', 'invalid actor');
  end if;
  if p_response not in ('accept', 'tentative', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'invalid response');
  end if;

  perform set_config('app.actor', p_actor, true);

  select * into task_row from tasks where id = p_task_id;
  if task_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'task not found');
  end if;
  if task_row.invite_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not pending', 'status', task_row.invite_status);
  end if;
  if task_row.invited_by = p_actor then
    return jsonb_build_object('ok', false, 'error', 'cannot respond to own invitation');
  end if;
  if not (p_actor = any(task_row.assignees)) then
    return jsonb_build_object('ok', false, 'error', 'not invited');
  end if;

  if p_response = 'accept' then
    update tasks set invite_status = 'accepted', updated_at = now() where id = p_task_id;
    audit_text := 'Принял предложение';
  elsif p_response = 'tentative' then
    update tasks set invite_status = 'tentative', updated_at = now() where id = p_task_id;
    audit_text := 'Сказал: думаю';
  else  -- decline: возвращаем инициатору + статус «приостановлено»
    new_assignees := array[task_row.invited_by]::text[];
    update tasks
      set invite_status = 'none', assignees = new_assignees, status = 'paused', updated_at = now()
    where id = p_task_id;
    audit_text := 'Отклонил предложение';
  end if;

  insert into comments(task_id, kind, author, text)
  values (p_task_id, 'audit', p_actor, audit_text);

  return jsonb_build_object('ok', true, 'response', p_response);
end;
$$;
