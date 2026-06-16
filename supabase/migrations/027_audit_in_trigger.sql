-- м.027 — audit-комментарии в DB-триггере.
--
-- Раньше: клиентский useAuditedTaskUpdate.ts делал две транзакции —
-- UPDATE задачи + INSERT comment. Если insert падал, audit терялся.
-- Дополнительно: правки через бот/RPC/прямой SQL не получали audit-коммент.
--
-- Теперь: триггер AFTER UPDATE на tasks вычисляет diff и пишет один
-- audit-comment строкой «дельта; дельта; дельта». Атомарно с самим UPDATE.
--
-- Автор: _actor() (та же функция, что используется в invite-логике).
-- Если actor null — audit не пишется (правка из прямого SQL без app.actor).
--
-- respond_to_invite_rpc больше не пишет audit-comments — это теперь делает
-- триггер по факту изменения invite_status.
--
-- Зависит от м.011 (_actor, _display_name).

create or replace function _audit_task_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor       text;
  out_text    text[] := array[]::text[];
  -- assignees diff
  added_a     text[];
  removed_a   text[];
  -- tags diff
  added_t     text[];
  removed_t   text[];
  -- project resolve
  old_proj    text;
  new_proj    text;
begin
  actor := _actor();
  if actor is null then
    return NEW;
  end if;

  -- title
  if NEW.title is distinct from OLD.title then
    out_text := out_text || format('Название: «%s» → «%s»', OLD.title, NEW.title);
  end if;

  -- status
  if NEW.status is distinct from OLD.status then
    out_text := out_text || format('Статус: %s → %s',
      case OLD.status when 'todo' then 'Беклог' when 'in_progress' then 'В процессе'
                      when 'done' then 'Готово' when 'paused' then 'Остановлено' end,
      case NEW.status when 'todo' then 'Беклог' when 'in_progress' then 'В процессе'
                      when 'done' then 'Готово' when 'paused' then 'Остановлено' end
    );
  end if;

  -- priority
  if NEW.priority is distinct from OLD.priority then
    out_text := out_text || format('Приоритет: %s → %s',
      case OLD.priority when 'high' then 'Высокий' when 'medium' then 'Средний' else 'Низкий' end,
      case NEW.priority when 'high' then 'Высокий' when 'medium' then 'Средний' else 'Низкий' end
    );
  end if;

  -- category
  if NEW.category is distinct from OLD.category then
    out_text := out_text || format('Категория: %s → %s',
      case OLD.category when 'personal' then 'Личное' else 'Семейное' end,
      case NEW.category when 'personal' then 'Личное' else 'Семейное' end
    );
  end if;

  -- assignees (массивы)
  if NEW.assignees is distinct from OLD.assignees then
    added_a := array(
      select unnest(NEW.assignees)
      except
      select unnest(OLD.assignees)
    );
    removed_a := array(
      select unnest(OLD.assignees)
      except
      select unnest(NEW.assignees)
    );
    if cardinality(added_a) > 0 then
      out_text := out_text || ('Добавлен участник: ' || (
        select string_agg(case x when 'nick' then 'Никита' when 'galya' then 'Галочка' else x end, ', ')
        from unnest(added_a) x
      ));
    end if;
    if cardinality(removed_a) > 0 then
      out_text := out_text || ('Убран участник: ' || (
        select string_agg(case x when 'nick' then 'Никита' when 'galya' then 'Галочка' else x end, ', ')
        from unnest(removed_a) x
      ));
    end if;
  end if;

  -- project_id (резолв названия)
  if NEW.project_id is distinct from OLD.project_id then
    select title into old_proj from projects where id = OLD.project_id;
    select title into new_proj from projects where id = NEW.project_id;
    out_text := out_text || format('Проект: %s → %s',
      coalesce(old_proj, '—'), coalesce(new_proj, '—'));
  end if;

  -- due_date
  if NEW.due_date is distinct from OLD.due_date then
    out_text := out_text || format('Дедлайн: %s → %s',
      coalesce(OLD.due_date::text, '—'), coalesce(NEW.due_date::text, '—'));
  end if;

  -- description (только факт обновления, без диффа текста)
  if coalesce(NEW.description, '') <> coalesce(OLD.description, '') then
    out_text := out_text || 'Описание обновлено';
  end if;

  -- tags (массив имён)
  if NEW.tags is distinct from OLD.tags then
    added_t := array(
      select unnest(NEW.tags)
      except
      select unnest(OLD.tags)
    );
    removed_t := array(
      select unnest(OLD.tags)
      except
      select unnest(NEW.tags)
    );
    if cardinality(added_t) > 0 then
      out_text := out_text || ('Добавлен тег: ' || (
        select string_agg(format('«%s»', x), ', ') from unnest(added_t) x
      ));
    end if;
    if cardinality(removed_t) > 0 then
      out_text := out_text || ('Удалён тег: ' || (
        select string_agg(format('«%s»', x), ', ') from unnest(removed_t) x
      ));
    end if;
  end if;

  -- invite_status переходы (зеркало старого describeInvite в TS)
  if NEW.invite_status is distinct from OLD.invite_status then
    if OLD.invite_status = 'pending' then
      if NEW.invite_status = 'accepted' then
        out_text := out_text || 'Принял предложение';
      elsif NEW.invite_status = 'tentative' then
        out_text := out_text || 'Сказал: думаю';
      elsif NEW.invite_status in ('declined', 'none') then
        -- Отозвал (если actor == инициатор) vs Отклонил (иначе)
        if actor = OLD.invited_by then
          out_text := out_text || 'Отозвал предложение';
        else
          out_text := out_text || 'Отклонил предложение';
        end if;
      end if;
    elsif OLD.invite_status = 'accepted' and NEW.invite_status = 'tentative' then
      out_text := out_text || 'Изменил ответ: думаю';
    elsif OLD.invite_status = 'tentative' and NEW.invite_status = 'accepted' then
      out_text := out_text || 'Изменил ответ: принял';
    end if;
  end if;

  -- Если нечего записывать — выходим (типовые «пустые» UPDATE-ы тоже триггерят
  -- realtime, но мусора в comments не создаём).
  if cardinality(out_text) = 0 then
    return NEW;
  end if;

  insert into comments(task_id, kind, author, text)
  values (NEW.id, 'audit', actor, array_to_string(out_text, '; '));

  return NEW;
end;
$$;

drop trigger if exists trg_audit_task_changes on tasks;
create trigger trg_audit_task_changes
  after update on tasks
  for each row execute function _audit_task_changes();

-- ─── respond_to_invite_rpc: убираем INSERT audit-коммента ───────────
-- Теперь это делает триггер. RPC только обновляет колонки и выставляет
-- app.actor — триггер прочитает _actor() и допишет audit сам.
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
  elsif p_response = 'tentative' then
    update tasks set invite_status = 'tentative', updated_at = now() where id = p_task_id;
  else  -- decline
    new_assignees := array[task_row.invited_by]::text[];
    update tasks
       set invite_status = 'none', assignees = new_assignees, updated_at = now()
     where id = p_task_id;
  end if;

  return jsonb_build_object('ok', true, 'response', p_response);
end;
$$;
