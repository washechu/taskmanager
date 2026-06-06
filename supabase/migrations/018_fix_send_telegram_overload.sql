-- м.018 — фикс регрессии м.016: убираем устаревшую 4-арную перегрузку _send_telegram.
--
-- В м.016 я добавил 5-й параметр `p_reply_markup jsonb default null`. CREATE OR
-- REPLACE FUNCTION с другой арностью не заменяет, а создаёт перегруз. В итоге
-- в БД одновременно живут:
--   _send_telegram(bigint, text, text, text)        — из м.013
--   _send_telegram(bigint, text, text, text, jsonb) — из м.016
--
-- При 4-арном вызове Postgres не может выбрать кандидата (5-арная подходит
-- через default) и падает с 42725 «function is not unique». Это положило:
--   • send_evening_digest()  → cron 21:00 МСК
--   • _notify_new_comment()  → пуш по комментариям
--   • любой другой 4-арный вызов
--
-- Лечится дропом старой 4-арной сигнатуры. 5-арная остаётся, 4-арные вызовы
-- резолвятся на неё с дефолтным reply_markup = null.

drop function if exists _send_telegram(bigint, text, text, text);
