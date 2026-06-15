'use client'

import { Section } from '@/components/ui/Section'
import { TagChip } from '@/components/ui/TagChip'
import type { Tag } from '@/lib/types'

interface TopTagsSectionProps {
  topTags: { name: string; count: number }[]
  allTags: Tag[]
}

export function TopTagsSection({ topTags, allTags }: TopTagsSectionProps) {
  return (
    <Section title="Топ тегов">
      {topTags.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Теги не использовались</p>
      ) : (
        <ul className="space-y-2">
          {topTags.map(({ name, count }) => {
            const max = topTags[0].count
            return (
              <li key={name} className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0">
                  <TagChip name={name} tags={allTags} />
                </div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-medium text-gray-400 dark:text-gray-500">{count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
