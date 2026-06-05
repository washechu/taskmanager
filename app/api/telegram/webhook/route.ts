/**
 * Telegram webhook endpoint.
 *
 * Принимает входящие апдейты от Telegram Bot API:
 *   • /start          — начать привязку чата к пользователю (Никита/Галочка)
 *   • /test           — проверка «бот на связи»
 *   • callback_query  — нажатие inline-кнопок (привязка `link:nick` / `link:galya`)
 *
 * Безопасность: валидируем заголовок `X-Telegram-Bot-Api-Secret-Token`
 * против `TELEGRAM_WEBHOOK_SECRET`. Без правильного токена — 403.
 *
 * Возвращаем 200 даже при внутренних ошибках, чтобы Telegram не ретраил
 * (плохие апдейты пишутся в `telegram_log` для последующей диагностики).
 *
 * Дальше (PR β, γ): расписание (pg_cron → Edge Function), события на
 * задачах (DB-trigger → Edge Function), invite-flow (callback_data `invite:`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendMessage, editMessage, answerCallback, logTelegram, displayName,
  type TgResult,
} from '@/lib/telegram'
import type { Assignee } from '@/lib/types'

// Принудительно Node.js runtime — нужен service_role-клиент Supabase.
export const runtime = 'nodejs'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/* ── Типы Telegram Bot API (минимум того, что используем) ───────────── */
interface TgUser {
  id: number
  username?: string
}
interface TgChat {
  id: number
}
interface TgMessage {
  message_id: number
  from?: TgUser
  chat: TgChat
  text?: string
}
interface TgCallbackQuery {
  id: string
  from: TgUser
  message?: TgMessage
  data?: string
}
interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

/* ── POST handler ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // 1. Проверяем secret token.
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = req.headers.get('x-telegram-bot-api-secret-token')
  if (!expected || got !== expected) {
    return new NextResponse('forbidden', { status: 403 })
  }

  // 2. Парсим тело.
  let update: TgUpdate
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 200 })
  }

  // 3. Маршрутизация.
  const supabase = makeSupabase()
  try {
    if (update.message) {
      await handleMessage(supabase, update.message)
    } else if (update.callback_query) {
      await handleCallbackQuery(supabase, update.callback_query)
    }
    // Прочие апдейты молча игнорируем.
  } catch (err) {
    // Не отдаём 5xx — Telegram будет ретраить. Логируем для диагностики.
    console.error('[telegram-webhook] handler crashed:', err)
    await logTelegram(supabase, {
      assignee: null,
      kind: 'webhook',
      result: { ok: false, status: 0, description: err instanceof Error ? err.message : String(err) },
    }).catch(() => undefined)
  }

  return NextResponse.json({ ok: true })
}

/* ── Команды ────────────────────────────────────────────────────────── */
async function handleMessage(
  supabase: ReturnType<typeof makeSupabase>,
  msg: TgMessage,
) {
  const text = (msg.text ?? '').trim()
  const chatId = msg.chat.id

  // Команды могут быть с упоминанием бота: /start@MyBot. Срезаем.
  const cmd = text.split(/\s|@/)[0]

  if (cmd === '/start') return handleStart(supabase, chatId)
  if (cmd === '/test')  return handleTest(supabase, chatId)
  // Прочее игнорируем — бот не разговорный.
}

async function handleStart(supabase: ReturnType<typeof makeSupabase>, chatId: number) {
  // Уже привязан?
  const { data: existing } = await supabase
    .from('telegram_links')
    .select('assignee')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (existing) {
    const a = existing.assignee as Assignee
    const result = await sendMessage(
      chatId,
      `Чат уже привязан как <b>${displayName(a)}</b>.\nПроверить связь — /test`,
    )
    await logTelegram(supabase, { assignee: a, kind: 'start', result })
    return
  }

  // Спрашиваем, кто из двоих.
  const result = await sendMessage(
    chatId,
    'Привет! Кто ты?\n\nЭто разово — после привязки бот будет слать тебе утренний дайджест, напоминания о привычках вечером и события общих задач.',
    {
      inlineKeyboard: [[
        { text: 'Я Никита',  callback_data: 'link:nick'  },
        { text: 'Я Галочка', callback_data: 'link:galya' },
      ]],
    },
  )
  await logTelegram(supabase, { assignee: null, kind: 'start', result })
}

async function handleTest(supabase: ReturnType<typeof makeSupabase>, chatId: number) {
  const { data: link } = await supabase
    .from('telegram_links')
    .select('assignee')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (!link) {
    const result = await sendMessage(
      chatId,
      'Сначала /start — нужно привязать чат к одному из участников.',
    )
    await logTelegram(supabase, { assignee: null, kind: 'test', result })
    return
  }

  const a = link.assignee as Assignee
  const result = await sendMessage(chatId, `Бот на связи 👋 (${displayName(a)})`)
  await logTelegram(supabase, { assignee: a, kind: 'test', result })
}

/* ── Callback queries ──────────────────────────────────────────────── */
async function handleCallbackQuery(
  supabase: ReturnType<typeof makeSupabase>,
  cb: TgCallbackQuery,
) {
  const data = cb.data ?? ''

  if (data.startsWith('link:')) {
    await handleLinkCallback(supabase, cb)
    return
  }

  if (data.startsWith('invite:')) {
    await handleInviteCallback(supabase, cb)
    return
  }

  // Неизвестная кнопка
  await answerCallback(cb.id, 'Эта кнопка пока не поддерживается')
}

async function handleLinkCallback(
  supabase: ReturnType<typeof makeSupabase>,
  cb: TgCallbackQuery,
) {
  const raw = (cb.data ?? '').slice('link:'.length)
  if (raw !== 'nick' && raw !== 'galya') {
    await answerCallback(cb.id, 'Неизвестный пользователь')
    return
  }
  const assignee = raw as Assignee
  const chatId = cb.message?.chat.id
  const messageId = cb.message?.message_id
  if (!chatId || !messageId) {
    await answerCallback(cb.id, 'Ошибка контекста')
    return
  }

  // Upsert по assignee (primary key) — если пользователь переподключает
  // чат (например, новый телефон), просто заменяем chat_id.
  const { error } = await supabase
    .from('telegram_links')
    .upsert({
      assignee,
      chat_id: chatId,
      username: cb.from.username ?? null,
    }, { onConflict: 'assignee' })

  if (error) {
    await answerCallback(cb.id, 'Не удалось сохранить')
    await logTelegram(supabase, {
      assignee,
      kind: 'start',
      result: { ok: false, status: 0, description: error.message },
    })
    return
  }

  await answerCallback(cb.id, '✓ Привязано')

  const editResult: TgResult = await editMessage(
    chatId,
    messageId,
    `✓ Чат привязан как <b>${displayName(assignee)}</b>.\nПроверить связь — /test`,
  )
  await logTelegram(supabase, { assignee, kind: 'start', result: editResult })
}

/* ── Invite callbacks (Принять / Думаю / Отклонить из Telegram) ─── */
async function handleInviteCallback(
  supabase: ReturnType<typeof makeSupabase>,
  cb: TgCallbackQuery,
) {
  // Формат: invite:<task_id>:<accept|tentative|decline>
  const parts = (cb.data ?? '').split(':')
  if (parts.length !== 3 || parts[0] !== 'invite') {
    await answerCallback(cb.id, 'Неверный формат')
    return
  }
  const taskId = parts[1]
  const response = parts[2]
  if (response !== 'accept' && response !== 'tentative' && response !== 'decline') {
    await answerCallback(cb.id, 'Неизвестное действие')
    return
  }

  const chatId = cb.message?.chat.id
  const messageId = cb.message?.message_id
  if (!chatId || !messageId) {
    await answerCallback(cb.id, 'Ошибка контекста')
    return
  }

  // Кто нажал?
  const { data: link } = await supabase
    .from('telegram_links')
    .select('assignee')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (!link) {
    await answerCallback(cb.id, 'Сначала /start')
    return
  }
  const responder = link.assignee as Assignee

  // Зовём SQL RPC, которая обновит задачу + audit + триггеры уведомят инициатора
  const { data, error } = await supabase.rpc('respond_to_invite_rpc', {
    p_task_id: taskId,
    p_response: response,
    p_actor: responder,
  })

  if (error) {
    await answerCallback(cb.id, 'Ошибка: ' + error.message.slice(0, 100))
    await logTelegram(supabase, {
      assignee: responder, kind: 'invite_reply',
      result: { ok: false, status: 0, description: error.message },
    })
    return
  }

  // RPC возвращает { ok, error? } — проверим бизнес-логику
  const rpcResult = data as { ok: boolean; error?: string } | null
  if (rpcResult && rpcResult.ok === false) {
    await answerCallback(cb.id, rpcResult.error ?? 'Не удалось ответить')
    return
  }

  // Эмодзи + надпись по выбранному ответу
  const summary =
    response === 'accept'    ? '✅ Принято' :
    response === 'tentative' ? '🤔 Подумаешь' :
                                '❌ Отклонено'

  await answerCallback(cb.id, summary)

  // Заменяем сообщение: убираем кнопки, показываем итог.
  // Достанем заголовок задачи, чтобы оставить контекст.
  const { data: task } = await supabase
    .from('tasks').select('title').eq('id', taskId).maybeSingle()
  const title = task?.title ?? ''

  const editResult: TgResult = await editMessage(
    chatId, messageId,
    `${summary}\n\n<b>${escapeHtml(title)}</b>`,
  )
  await logTelegram(supabase, { assignee: responder, kind: 'invite_reply', result: editResult })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
