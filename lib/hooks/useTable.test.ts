// @vitest-environment jsdom

/**
 * Тесты на useTable<T>. Хук — инфра-слой для CRUD+realtime, и за один день
 * он дважды ронял прод:
 *   PR #61 — коллизия имён каналов supabase ("cannot add postgres_changes
 *            callbacks after subscribe()") когда useTags вызывался из десятков
 *            компонентов с одинаковым каналом 'tags-changes'.
 *   PR #63 — inline-object-literal в options пересоздавался каждый рендер →
 *            useEffect ре-подписывался каждый рендер → реалтайм-события
 *            терялись в окне unsub/sub, fetchAll гонялся с оптимистичными
 *            правками («создал — не появилось», «удалил — вернулось»).
 *
 * Оба бага в проде были невидимы до пользователя. Эти тесты — регрессионная
 * сетка: оба сценария здесь явно покрыты («подписка стабильна между
 * перерендерами с новым literal options» и «канал per-mount уникален»).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// vi.mock хойстится в начало файла, поэтому фабрика читает «текущий» mock
// supabase через замыкание, который мы пересоздаём в beforeEach.
let currentSupa: ReturnType<typeof makeMockSupabase>
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => currentSupa,
}))

// eslint-disable-next-line import/first
import { useTable } from './useTable'

interface Row { id: string; name?: string; status?: string }

interface FromCallLog {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  // Аргументы соответствующего метода (insert payload / update patch / select cols).
  arg?: unknown
  // После insert: id, переданный в payload. Удобно проверять, что useTable
  // подложил optimistic.id в payload (защита от задвоения realtime INSERT).
  payloadId?: string
}

function makeMockSupabase() {
  // Управляемые тестом ответы. Тест меняет их ДО соответствующей операции.
  const state = {
    selectRows: [] as Row[],
    selectError: null as unknown,
    insertResult: { data: null as Row | null, error: null as unknown },
    updateError: null as unknown,
    deleteError: null as unknown,
  }

  const fromCalls: FromCallLog[] = []
  const channelNames: string[] = []
  // Кэллбек postgres_changes от ПОСЛЕДНЕГО смонтированного канала. Тесты
  // CRUD/realtime монтируют один хук, так что этого хватает.
  let realtimeCb: ((payload: unknown) => void) | null = null
  let subscribeCallCount = 0
  let removedChannels = 0

  function makeBuilder(table: string, op: FromCallLog['op'], arg?: unknown) {
    const result =
      op === 'select' ? { data: state.selectRows, error: state.selectError } :
      op === 'insert' ? state.insertResult :
      op === 'update' ? { error: state.updateError } :
                        { error: state.deleteError }
    // Снимок ответа фиксируется в момент создания builder'а — это и в проде так
    // (await q после .from() уже не догонит будущие изменения данных).
    const snapshot = result
    const promise = Promise.resolve(snapshot)

    const builder: {
      eq: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      select: ReturnType<typeof vi.fn>
      single: ReturnType<typeof vi.fn>
      then: Promise<unknown>['then']
    } = {
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      // select после insert/update/delete — для .select().single() в insert.
      select: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve(snapshot)),
      then: promise.then.bind(promise),
    }
    // Помечаем call для удобной проверки в тесте.
    const call: FromCallLog = { table, op, arg }
    if (op === 'insert' && arg && typeof arg === 'object' && 'id' in (arg as object)) {
      call.payloadId = (arg as { id: string }).id
    }
    fromCalls.push(call)
    return builder
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn((cols?: string) => makeBuilder(table, 'select', cols)),
    insert: vi.fn((payload: unknown) => makeBuilder(table, 'insert', payload)),
    update: vi.fn((patch: unknown) => makeBuilder(table, 'update', patch)),
    delete: vi.fn(() => makeBuilder(table, 'delete')),
  }))

  function makeChannel() {
    const ch = {
      on: vi.fn((_event: string, _cfg: unknown, cb: (payload: unknown) => void) => {
        realtimeCb = cb
        return ch
      }),
      subscribe: vi.fn(() => {
        subscribeCallCount += 1
        return ch
      }),
    }
    return ch
  }

  const channel = vi.fn((name: string) => {
    channelNames.push(name)
    return makeChannel()
  })

  const removeChannel = vi.fn(() => {
    removedChannels += 1
  })

  return {
    // Сам мок-клиент:
    from,
    channel,
    removeChannel,
    // Test API:
    state,
    fromCalls,
    channelNames,
    triggerRealtime: (payload: unknown) => {
      if (!realtimeCb) throw new Error('realtime callback not registered yet')
      realtimeCb(payload)
    },
    get subscribeCallCount() { return subscribeCallCount },
    get removedChannels() { return removedChannels },
  }
}

beforeEach(() => {
  currentSupa = makeMockSupabase()
})

describe('useTable: загрузка и фильтры', () => {
  it('делает select(*) при монтировании и кладёт данные в items', async () => {
    currentSupa.state.selectRows = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    const { result } = renderHook(() => useTable<Row>('tasks'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ])
    // from('tasks') вызван (как минимум) на mount-fetch.
    expect(currentSupa.fromCalls[0]).toMatchObject({ table: 'tasks', op: 'select' })
  })

  it('применяет filter как .eq(column, value) и в realtime-фильтре', async () => {
    const { result } = renderHook(() =>
      useTable<Row>('tasks', { filter: { column: 'project_id', value: 'p1' } }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Проверяем, что .on('postgres_changes', {... filter: 'project_id=eq.p1'}, ...)
    const channelCalls = currentSupa.channel.mock.calls
    expect(channelCalls.length).toBe(1)
    const ch = currentSupa.channel.mock.results[0].value
    expect(ch.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*', schema: 'public', table: 'tasks',
        filter: 'project_id=eq.p1',
      }),
      expect.any(Function),
    )
  })

  it('применяет orderBy через .order(col, { ascending })', async () => {
    const { result } = renderHook(() =>
      useTable<Row>('tasks', { orderBy: { column: 'name', ascending: false } }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Достаём конкретный builder, который был создан при mount-fetch:
    //   from('tasks') → { select, ... }
    //   .select('*')  → builder
    // и убеждаемся, что .order был вызван именно на нём с нужными аргументами.
    const fromCall = currentSupa.from.mock.results[0].value
    const selectBuilder = fromCall.select.mock.results[0].value
    expect(selectBuilder.order).toHaveBeenCalledWith('name', { ascending: false })
  })

  it('orderBy по умолчанию ascending=true, если флаг не задан', async () => {
    const { result } = renderHook(() =>
      useTable<Row>('tasks', { orderBy: { column: 'name' } }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    const fromCall = currentSupa.from.mock.results[0].value
    const selectBuilder = fromCall.select.mock.results[0].value
    expect(selectBuilder.order).toHaveBeenCalledWith('name', { ascending: true })
  })
})

describe('useTable: оптимистический insert', () => {
  it('добавляет в начало по умолчанию, потом патчит ответом сервера', async () => {
    currentSupa.state.selectRows = [{ id: 'old', name: 'Old' }]
    const serverRow: Row = { id: 'opt-1', name: 'Server' }
    currentSupa.state.insertResult = { data: serverRow, error: null }

    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const optimistic: Row = { id: 'opt-1', name: 'Optimistic' }
    let res: { data: Row | null; error: unknown } | undefined
    await act(async () => {
      res = await result.current.insert({ name: 'Optimistic' }, optimistic)
    })

    expect(res?.error).toBe(null)
    expect(res?.data).toEqual(serverRow)
    // После завершения — серверная строка вместо optimistic, и она в начале списка.
    expect(result.current.items[0]).toEqual(serverRow)
    expect(result.current.items).toHaveLength(2)

    // КЛЮЧЕВОЕ: optimistic.id подложен в payload, чтобы DB-row имел тот же id —
    // тогда realtime INSERT дедупится по id.
    const insertCall = currentSupa.fromCalls.find(c => c.op === 'insert')
    expect(insertCall?.payloadId).toBe('opt-1')
  })

  it('place=end вставляет в конец', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }]
    currentSupa.state.insertResult = { data: { id: 'opt-1', name: 'New' }, error: null }
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.insert({ name: 'New' }, { id: 'opt-1' }, 'end')
    })
    expect(result.current.items.map(r => r.id)).toEqual(['a', 'opt-1'])
  })

  it('defaultInsertPosition=end из опций применяется к insert', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }]
    currentSupa.state.insertResult = { data: { id: 'opt-1' }, error: null }
    const { result } = renderHook(() =>
      useTable<Row>('tasks', { defaultInsertPosition: 'end' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.insert({}, { id: 'opt-1' })
    })
    expect(result.current.items.map(r => r.id)).toEqual(['a', 'opt-1'])
  })

  it('на ошибке откатывает optimistic-строку', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }]
    currentSupa.state.insertResult = { data: null, error: new Error('boom') }
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { data: Row | null; error: unknown } | undefined
    await act(async () => {
      res = await result.current.insert({}, { id: 'opt-1' })
    })
    expect(res?.error).toBeInstanceOf(Error)
    expect(res?.data).toBe(null)
    // optimistic-строки больше нет — откат.
    expect(result.current.items.map(r => r.id)).toEqual(['a'])
  })
})

describe('useTable: оптимистический update', () => {
  it('патчит существующую строку', async () => {
    currentSupa.state.selectRows = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.update('a', { name: 'A2' })
    })
    expect(result.current.items.find(r => r.id === 'a')?.name).toBe('A2')
    expect(result.current.items.find(r => r.id === 'b')?.name).toBe('B')
  })

  it('на ошибке вызывает fetchAll для отката', async () => {
    currentSupa.state.selectRows = [{ id: 'a', name: 'A' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const fromCallsBefore = currentSupa.fromCalls.length

    currentSupa.state.updateError = new Error('nope')
    // Сервер для отката возвращает «истинное» состояние без правки.
    currentSupa.state.selectRows = [{ id: 'a', name: 'A' }]

    await act(async () => {
      await result.current.update('a', { name: 'A2' })
    })
    // Был хотя бы один дополнительный select для отката.
    const selectCallsAfter = currentSupa.fromCalls
      .slice(fromCallsBefore)
      .filter(c => c.op === 'select').length
    expect(selectCallsAfter).toBeGreaterThanOrEqual(1)
    // Имя откатилось к серверному.
    expect(result.current.items[0].name).toBe('A')
  })
})

describe('useTable: оптимистический remove', () => {
  it('убирает строку из items', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }, { id: 'b' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('a')
    })
    expect(result.current.items.map(r => r.id)).toEqual(['b'])
  })

  it('на ошибке вызывает fetchAll', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }, { id: 'b' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const fromCallsBefore = currentSupa.fromCalls.length

    currentSupa.state.deleteError = new Error('nope')
    currentSupa.state.selectRows = [{ id: 'a' }, { id: 'b' }]   // правда — оба живы

    await act(async () => {
      await result.current.remove('a')
    })
    const selectCallsAfter = currentSupa.fromCalls
      .slice(fromCallsBefore)
      .filter(c => c.op === 'select').length
    expect(selectCallsAfter).toBeGreaterThanOrEqual(1)
    expect(result.current.items.map(r => r.id)).toEqual(['a', 'b'])
  })
})

describe('useTable: realtime', () => {
  it('INSERT добавляет строку (по умолчанию в начало)', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      currentSupa.triggerRealtime({
        eventType: 'INSERT',
        new: { id: 'rt', name: 'Remote' },
      })
    })
    expect(result.current.items.map(r => r.id)).toEqual(['rt', 'a'])
  })

  it('INSERT дедупится по id (optimistic + realtime для одного id)', async () => {
    currentSupa.state.selectRows = []
    currentSupa.state.insertResult = { data: { id: 'opt-1', name: 'Srv' }, error: null }
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.insert({}, { id: 'opt-1', name: 'Optimistic' })
    })
    // Сейчас в items одна строка (серверная). Теперь realtime прилетает с тем же id.
    act(() => {
      currentSupa.triggerRealtime({
        eventType: 'INSERT',
        new: { id: 'opt-1', name: 'Realtime echo' },
      })
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('opt-1')
  })

  it('UPDATE патчит строку по id', async () => {
    currentSupa.state.selectRows = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      currentSupa.triggerRealtime({
        eventType: 'UPDATE',
        new: { id: 'a', name: 'A-edited' },
      })
    })
    expect(result.current.items.find(r => r.id === 'a')?.name).toBe('A-edited')
    expect(result.current.items.find(r => r.id === 'b')?.name).toBe('B')
  })

  it('DELETE убирает строку по payload.old.id', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }, { id: 'b' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      currentSupa.triggerRealtime({
        eventType: 'DELETE',
        old: { id: 'a' },
      })
    })
    expect(result.current.items.map(r => r.id)).toEqual(['b'])
  })

  it('DELETE без id в payload.old — no-op (защита от половинной row)', async () => {
    currentSupa.state.selectRows = [{ id: 'a' }, { id: 'b' }]
    const { result } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      currentSupa.triggerRealtime({ eventType: 'DELETE', old: {} })
    })
    expect(result.current.items).toHaveLength(2)
  })
})

describe('useTable: стабильность подписки (регрессия PR #63)', () => {
  it('НЕ переподписывается при перерендере с новым literal-объектом options', async () => {
    // ЭТО ТОТ САМЫЙ БАГ: вызывающий код передаёт inline-литерал
    //   useTable<Tag>('tags', { orderBy: { column: 'name', ascending: true } })
    // На каждый рендер options — НОВЫЙ объект. До PR #63 это пересоздавало
    // fetchAll-callback и useEffect ре-подписывался каждый рендер. Реалтайм
    // терял события в окне unsub/sub. После — options развёрнут в примитивы.
    const { result, rerender } = renderHook(
      ({ ascending }: { ascending: boolean }) =>
        useTable<Row>('tasks', { orderBy: { column: 'name', ascending } }),
      { initialProps: { ascending: true } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(currentSupa.subscribeCallCount).toBe(1)

    // 5 перерендеров с тем же значением ascending=true, но КАЖДЫЙ РАЗ
    // — новый литерал orderBy. Если useEffect deps завязан на ссылку options
    // — будет 6 подписок. Если на примитивы — останется одна.
    for (let i = 0; i < 5; i += 1) {
      rerender({ ascending: true })
    }
    expect(currentSupa.subscribeCallCount).toBe(1)
    expect(currentSupa.removedChannels).toBe(0)
  })

  it('переподписывается при смене значащего поля (filter/orderBy/table)', async () => {
    // Контр-проверка: если действительно меняется примитив, переподписка должна
    // случиться (иначе хук не сможет переключиться на другую WHERE).
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useTable<Row>('tasks', { filter: { column: 'project_id', value } }),
      { initialProps: { value: 'p1' } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(currentSupa.subscribeCallCount).toBe(1)

    rerender({ value: 'p2' })
    await waitFor(() => expect(currentSupa.subscribeCallCount).toBe(2))
    // Старый канал снят.
    expect(currentSupa.removedChannels).toBe(1)
  })
})

describe('useTable: коллизия имён каналов (регрессия PR #61)', () => {
  it('два инстанса хука на одну таблицу получают РАЗНЫЕ имена каналов', async () => {
    // ЭТО ТОТ САМЫЙ БАГ: useTags() вызывался в десятках компонентов параллельно;
    // все шли в канал 'tags-changes' → supabase JS бросал «cannot add
    // postgres_changes callbacks after subscribe()». Лечение — random suffix
    // в имени канала per-mount.
    const { result: r1 } = renderHook(() => useTable<Row>('tasks'))
    const { result: r2 } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(r1.current.loading).toBe(false))
    await waitFor(() => expect(r2.current.loading).toBe(false))

    expect(currentSupa.channelNames).toHaveLength(2)
    expect(currentSupa.channelNames[0]).not.toBe(currentSupa.channelNames[1])
    // Оба начинаются с 'tasks-changes' (дефолт), но имеют разный suffix.
    expect(currentSupa.channelNames[0]).toMatch(/^tasks-changes-/)
    expect(currentSupa.channelNames[1]).toMatch(/^tasks-changes-/)
  })

  it('опция channel задаёт префикс, но всё равно с random-суффиксом', async () => {
    const { result } = renderHook(() =>
      useTable<Row>('tasks', { channel: 'my-custom' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(currentSupa.channelNames[0]).toMatch(/^my-custom-/)
    expect(currentSupa.channelNames[0]).not.toBe('my-custom')
  })
})

describe('useTable: очистка при размонтировании', () => {
  it('removeChannel вызван при unmount', async () => {
    const { result, unmount } = renderHook(() => useTable<Row>('tasks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(currentSupa.removedChannels).toBe(0)

    unmount()
    expect(currentSupa.removedChannels).toBe(1)
  })
})
