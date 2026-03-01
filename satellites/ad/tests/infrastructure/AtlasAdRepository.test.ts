import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { AdStatus } from '../../src/Domain/Entities/Advertisement'
import { AdSchedule } from '../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../src/Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../src/Domain/ValueObjects/SlotSlug'
import { AtlasAdRepository } from '../../src/Infrastructure/Persistence/AtlasAdRepository'
import { createTestAd, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

// -- Mock DB --

interface MockQuery {
  where: ReturnType<typeof mock>
  first: ReturnType<typeof mock>
  get: ReturnType<typeof mock>
  insert: ReturnType<typeof mock>
  update: ReturnType<typeof mock>
  delete: ReturnType<typeof mock>
  exists: ReturnType<typeof mock>
  count: ReturnType<typeof mock>
  limit: ReturnType<typeof mock>
  offset: ReturnType<typeof mock>
  clone: ReturnType<typeof mock>
}

function createMockQuery(): MockQuery {
  const q: MockQuery = {
    where: mock(() => q),
    first: mock(() => Promise.resolve(null)),
    get: mock(() => Promise.resolve([])),
    insert: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    exists: mock(() => Promise.resolve(false)),
    count: mock(() => Promise.resolve(0)),
    limit: mock(() => q),
    offset: mock(() => q),
    clone: mock(() => q),
  }
  return q
}

function createMockDB(queryFn: () => MockQuery) {
  return {
    table: mock((_name: string) => queryFn()),
    transaction: mock(async (fn: (db: { table: (name: string) => MockQuery }) => Promise<void>) => {
      await fn({ table: (_name: string) => queryFn() })
    }),
  }
}

// -- 測試用 DB 行資料 --

function validDbRow() {
  return {
    id: 'ad-001',
    slot_slug: 'HOME_HERO',
    title: '測試廣告',
    image_url: 'https://example.com/image.jpg',
    target_url: 'https://example.com/landing',
    weight: 5,
    status: 'active',
    starts_at: '2025-01-01T00:00:00.000Z',
    ends_at: '2027-12-31T23:59:59.000Z',
    metadata: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-15T12:00:00.000Z',
  }
}

// =====================================================
// AtlasAdRepository
// =====================================================

describe('AtlasAdRepository', () => {
  let mockQuery: MockQuery
  let mockDB: ReturnType<typeof createMockDB>
  let repo: AtlasAdRepository

  beforeEach(() => {
    mockQuery = createMockQuery()
    mockDB = createMockDB(() => mockQuery)
    repo = new AtlasAdRepository(mockDB as any)
  })

  // -- findById --

  describe('findById', () => {
    it('找到廣告時回傳 Advertisement 實體', async () => {
      mockQuery.first = mock(() => Promise.resolve(validDbRow()))

      const ad = await repo.findById('ad-001')

      expect(ad).not.toBeNull()
      expect(ad!.id).toBe('ad-001')
      expect(ad!.slotSlug.value).toBe('HOME_HERO')
      expect(ad!.title).toBe('測試廣告')
      expect(ad!.weight.value).toBe(5)
      expect(ad!.status).toBe(AdStatus.ACTIVE)
    })

    it('找不到廣告時回傳 null', async () => {
      mockQuery.first = mock(() => Promise.resolve(null))

      const ad = await repo.findById('nonexistent')

      expect(ad).toBeNull()
    })
  })

  // -- findBySlot --

  describe('findBySlot', () => {
    it('回傳指定版位的所有廣告', async () => {
      const rows = [validDbRow(), { ...validDbRow(), id: 'ad-002', title: '第二則廣告' }]
      mockQuery.get = mock(() => Promise.resolve(rows))

      const ads = await repo.findBySlot('HOME_HERO')

      expect(ads).toHaveLength(2)
      expect(ads[0].id).toBe('ad-001')
      expect(ads[1].id).toBe('ad-002')
    })

    it('版位無廣告時回傳空陣列', async () => {
      mockQuery.get = mock(() => Promise.resolve([]))

      const ads = await repo.findBySlot('EMPTY_SLOT')

      expect(ads).toHaveLength(0)
    })
  })

  // -- findActiveBySlot --

  describe('findActiveBySlot', () => {
    it('回傳指定版位中可投放的廣告', async () => {
      const rows = [validDbRow(), { ...validDbRow(), id: 'ad-002', status: 'paused' }]
      mockQuery.get = mock(() => Promise.resolve(rows))

      const ads = await repo.findActiveBySlot('HOME_HERO')

      // 只有 active 且在排程內的廣告
      expect(ads.length).toBeGreaterThanOrEqual(1)
      for (const ad of ads) {
        expect(ad.status).toBe(AdStatus.ACTIVE)
      }
    })
  })

  // -- findAll --

  describe('findAll', () => {
    it('回傳全部廣告（含總數）', async () => {
      mockQuery.count = mock(() => Promise.resolve(2))
      mockQuery.get = mock(() => Promise.resolve([validDbRow(), { ...validDbRow(), id: 'ad-002' }]))

      const result = await repo.findAll()

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('支援 status 篩選', async () => {
      mockQuery.count = mock(() => Promise.resolve(1))
      mockQuery.get = mock(() => Promise.resolve([validDbRow()]))

      const result = await repo.findAll({ status: AdStatus.ACTIVE })

      expect(mockQuery.where).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('支援 slotSlug 篩選', async () => {
      mockQuery.count = mock(() => Promise.resolve(1))
      mockQuery.get = mock(() => Promise.resolve([validDbRow()]))

      const result = await repo.findAll({ slotSlug: 'HOME_HERO' })

      expect(mockQuery.where).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('支援分頁（limit + offset）', async () => {
      mockQuery.count = mock(() => Promise.resolve(10))
      mockQuery.get = mock(() => Promise.resolve([validDbRow()]))

      const result = await repo.findAll({ limit: 5, offset: 5 })

      expect(mockQuery.limit).toHaveBeenCalledWith(5)
      expect(mockQuery.offset).toHaveBeenCalledWith(5)
      expect(result.total).toBe(10)
    })
  })

  // -- save --

  describe('save', () => {
    it('新增廣告（不存在時 insert）', async () => {
      const ad = createTestAd()
      // transaction 內的 query mock
      const txQuery = createMockQuery()
      txQuery.first = mock(() => Promise.resolve(null)) // 不存在
      const txDb = { table: mock((_name: string) => txQuery) }
      mockDB.transaction = mock(async (fn: any) => fn(txDb))

      await repo.save(ad)

      expect(mockDB.transaction).toHaveBeenCalled()
      expect(txQuery.insert).toHaveBeenCalled()
    })

    it('更新廣告（已存在時 update）', async () => {
      const ad = createTestAd()
      const txQuery = createMockQuery()
      txQuery.first = mock(() => Promise.resolve(validDbRow())) // 已存在
      const txDb = { table: mock((_name: string) => txQuery) }
      mockDB.transaction = mock(async (fn: any) => fn(txDb))

      await repo.save(ad)

      expect(mockDB.transaction).toHaveBeenCalled()
      expect(txQuery.update).toHaveBeenCalled()
    })

    it('save 時正確展開 Entity 屬性', async () => {
      const ad = createTestAd({ title: '特定標題' })
      const txQuery = createMockQuery()
      txQuery.first = mock(() => Promise.resolve(null))
      let insertedData: Record<string, unknown> = {}
      txQuery.insert = mock((data: Record<string, unknown>) => {
        insertedData = data
        return Promise.resolve()
      })
      const txDb = { table: mock((_name: string) => txQuery) }
      mockDB.transaction = mock(async (fn: any) => fn(txDb))

      await repo.save(ad)

      expect(insertedData.title).toBe('特定標題')
      expect(insertedData.slot_slug).toBe('HOME_HERO')
      expect(typeof insertedData.weight).toBe('number')
      expect(typeof insertedData.status).toBe('string')
    })
  })

  // -- delete --

  describe('delete', () => {
    it('刪除指定 ID 的廣告', async () => {
      await repo.delete('ad-001')

      expect(mockDB.table).toHaveBeenCalledWith('advertisements')
      expect(mockQuery.where).toHaveBeenCalledWith('id', 'ad-001')
      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  // -- exists --

  describe('exists', () => {
    it('廣告存在時回傳 true', async () => {
      mockQuery.exists = mock(() => Promise.resolve(true))

      const result = await repo.exists('ad-001')

      expect(result).toBe(true)
    })

    it('廣告不存在時回傳 false', async () => {
      mockQuery.exists = mock(() => Promise.resolve(false))

      const result = await repo.exists('nonexistent')

      expect(result).toBe(false)
    })
  })
})
