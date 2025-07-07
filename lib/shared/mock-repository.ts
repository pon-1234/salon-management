import { BaseEntity, Repository } from './types'
import { generateId } from './utils'

export abstract class MockRepository<T extends BaseEntity> implements Repository<T> {
  protected items: T[] = []

  constructor(initialData: T[] = []) {
    this.items = [...initialData]
  }

  async findAll(): Promise<T[]> {
    return [...this.items]
  }

  async findById(id: string): Promise<T | null> {
    return this.items.find((item) => item.id === id) || null
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date()
    const newEntity = {
      ...entity,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    } as T

    this.items.push(newEntity)
    return newEntity
  }

  async update(
    id: string,
    entity: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T | null> {
    const index = this.items.findIndex((item) => item.id === id)
    if (index === -1) return null

    const updatedEntity = {
      ...this.items[index],
      ...entity,
      updatedAt: new Date(),
    }

    this.items[index] = updatedEntity
    return updatedEntity
  }

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id)
    if (index === -1) return false

    this.items.splice(index, 1)
    return true
  }
}
