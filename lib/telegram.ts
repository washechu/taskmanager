/**
 * Серверный helper над Telegram Bot API.
 * Используется только в server-side коде (webhook route, будущие Edge Functions).
 * Никогда не импортируется в клиентский bundle.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Assignee } from '@/lib/types'

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export type InlineButton =
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } }
  | { text: string; url: string }

export type InlineKeyboard = InlineButton[][]

export interface SendOptions {
  inlineKeyboard?: InlineKeyboard
  parseMode?: 'HTML' | 'MarkdownV2'
}

export interface TgResult {
  ok: boolean
  status: number
  description?: string
}

/** Отправить сообщение. parse_mode = HTML по умолчанию. */
export async function sendMessage(
  chatId: number | bigint,
  text: string,
  opts: SendOptions = {},
): Promise<TgResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId.toString(),
    text,
    parse_mode: opts.parseMode ?? 'HTML',
  }
  if (opts.inlineKeyboard) {
    body.reply_markup = { inline_keyboard: opts.inlineKeyboard }
  }
  return tgRequest('sendMessage', body)
}

/** Отредактировать ранее отправленное сообщение (для убирания кнопок после клика). */
export async function editMessage(
  chatId: number | bigint,
  messageId: number,
  text: string,
  opts: SendOptions = {},
): Promise<TgResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId.toString(),
    message_id: messageId,
    text,
    parse_mode: opts.parseMode ?? 'HTML',
  }
  if (opts.inlineKeyboard) {
    body.reply_markup = { inline_keyboard: opts.inlineKeyboard }
  }
  return tgRequest('editMessageText', body)
}

/**
 * Подтвердить получение callback_query (убирает «крутилку» на кнопке).
 * Telegram требует ответа в течение 30 секунд иначе кнопка зависает.
 */
export async function answerCallback(
  callbackQueryId: string,
  text?: string,
): Promise<TgResult> {
  return tgRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

async function tgRequest(method: string, body: Record<string, unknown>): Promise<TgResult> {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok && json?.ok === true, status: res.status, description: json?.description }
  } catch (err) {
    return { ok: false, status: 0, description: err instanceof Error ? err.message : String(err) }
  }
}

/** Записать в telegram_log результат отправки. Без ретраев — только трассировка. */
export async function logTelegram(
  supabase: SupabaseClient,
  params: { assignee: Assignee | null; kind: string; result: TgResult },
): Promise<void> {
  await supabase.from('telegram_log').insert({
    assignee: params.assignee,
    kind: params.kind,
    ok: params.result.ok,
    error: params.result.ok ? null : (params.result.description ?? `HTTP ${params.result.status}`),
  })
}

/** Человекочитаемое имя пользователя для текста сообщений. */
export function displayName(assignee: Assignee): string {
  return assignee === 'nick' ? 'Никита' : 'Галочка'
}
