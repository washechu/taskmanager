'use client'

/**
 * Тонкий ре-экспорт. Сама реализация — в `lib/contexts/TagsContext.tsx`:
 * там один TagsProvider держит подписку, все потребители читают из
 * Context. Прежний хук-имплементация удалена ради экономии каналов
 * Supabase (см. hotfix #61 и историю).
 */
export { useTagsContext as useTags } from '@/lib/contexts/TagsContext'
