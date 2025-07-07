import { BaseEntity, Repository, UseCases } from './types';

export class BaseUseCasesImpl<T extends BaseEntity> implements UseCases<T> {
  constructor(private repository: Repository<T>) {}

  async getAll(): Promise<T[]> {
    return this.repository.getAll();
  }

  async getById(id: string): Promise<T | null> {
    return this.repository.getById(id);
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return this.repository.create(entity);
  }

  async update(id: string, entity: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T | null> {
    return this.repository.update(id, entity);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}