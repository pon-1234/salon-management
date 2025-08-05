import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storesData, getStoreBySlug, getActiveStores } from './data'

describe('Store Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('storesData', () => {
    it('should export an array of stores', () => {
      expect(Array.isArray(storesData)).toBe(true)
      expect(storesData.length).toBeGreaterThan(0)
    })

    it('should have valid store structure', () => {
      storesData.forEach((store) => {
        expect(store).toHaveProperty('id')
        expect(store).toHaveProperty('slug')
        expect(store).toHaveProperty('name')
        expect(store).toHaveProperty('displayName')
        expect(store).toHaveProperty('address')
        expect(store).toHaveProperty('phone')
        expect(store).toHaveProperty('email')
        expect(store).toHaveProperty('openingHours')
        expect(store).toHaveProperty('location')
        expect(store).toHaveProperty('features')
        expect(store).toHaveProperty('images')
        expect(store).toHaveProperty('theme')
        expect(store).toHaveProperty('seoTitle')
        expect(store).toHaveProperty('seoDescription')
        expect(store).toHaveProperty('isActive')
        expect(store).toHaveProperty('createdAt')
        expect(store).toHaveProperty('updatedAt')
      })
    })

    it('should have valid opening hours structure', () => {
      storesData.forEach((store) => {
        expect(store.openingHours).toHaveProperty('weekday')
        expect(store.openingHours).toHaveProperty('weekend')
        expect(store.openingHours.weekday).toHaveProperty('open')
        expect(store.openingHours.weekday).toHaveProperty('close')
        expect(store.openingHours.weekend).toHaveProperty('open')
        expect(store.openingHours.weekend).toHaveProperty('close')
      })
    })

    it('should have valid location structure', () => {
      storesData.forEach((store) => {
        expect(store.location).toHaveProperty('lat')
        expect(store.location).toHaveProperty('lng')
        expect(typeof store.location.lat).toBe('number')
        expect(typeof store.location.lng).toBe('number')
      })
    })

    it('should have valid images structure', () => {
      storesData.forEach((store) => {
        expect(store.images).toHaveProperty('main')
        expect(store.images).toHaveProperty('gallery')
        expect(Array.isArray(store.images.gallery)).toBe(true)
        expect(store.images.gallery.length).toBeGreaterThan(0)
      })
    })

    it('should have valid theme structure', () => {
      storesData.forEach((store) => {
        if (store.theme) {
          expect(store.theme).toHaveProperty('primaryColor')
          expect(store.theme).toHaveProperty('secondaryColor')
          expect(store.theme.primaryColor).toMatch(/^#[0-9A-F]{6}$/i)
          expect(store.theme.secondaryColor).toMatch(/^#[0-9A-F]{6}$/i)
        }
      })
    })

    it('should have unique store IDs and slugs', () => {
      const ids = storesData.map((store) => store.id)
      const slugs = storesData.map((store) => store.slug)
      const uniqueIds = [...new Set(ids)]
      const uniqueSlugs = [...new Set(slugs)]

      expect(ids.length).toBe(uniqueIds.length)
      expect(slugs.length).toBe(uniqueSlugs.length)
    })

    it('should have valid dates', () => {
      storesData.forEach((store) => {
        expect(store.createdAt).toBeInstanceOf(Date)
        expect(store.updatedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('getStoreBySlug', () => {
    it('should return a store by slug', () => {
      const store = getStoreBySlug('ikebukuro')
      expect(store).toBeDefined()
      expect(store?.slug).toBe('ikebukuro')
      expect(store?.name).toBe('池袋店')
    })

    it('should return undefined for non-existent slug', () => {
      const store = getStoreBySlug('non-existent')
      expect(store).toBeUndefined()
    })

    it('should return correct stores for all known slugs', () => {
      const slugs = ['ikebukuro', 'shinjuku', 'shibuya']
      slugs.forEach((slug) => {
        const store = getStoreBySlug(slug)
        expect(store).toBeDefined()
        expect(store?.slug).toBe(slug)
      })
    })
  })

  describe('getActiveStores', () => {
    it('should return only active stores', () => {
      const activeStores = getActiveStores()

      expect(Array.isArray(activeStores)).toBe(true)
      activeStores.forEach((store) => {
        expect(store.isActive).toBe(true)
      })
    })

    it('should return all stores if all are active', () => {
      const activeStores = getActiveStores()
      const allActiveInData = storesData.every((s) => s.isActive)

      if (allActiveInData) {
        expect(activeStores.length).toBe(storesData.length)
      }
    })
  })
})
