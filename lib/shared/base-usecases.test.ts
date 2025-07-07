import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { BaseUseCasesImpl } from "./base-usecases";
import { Repository, BaseEntity } from "./types";

// Define a concrete entity type for testing purposes
interface TestEntity extends BaseEntity {
  name: string;
}

// Create a mock repository for the TestEntity
const mockRepository: Repository<TestEntity> = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("BaseUseCasesImpl", () => {
  let useCases: BaseUseCasesImpl<TestEntity>;

  beforeEach(() => {
    useCases = new BaseUseCasesImpl<TestEntity>(mockRepository);
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should call repository.getAll and return the result", async () => {
      const mockEntities: TestEntity[] = [{ id: "1", name: "Test 1", createdAt: new Date(), updatedAt: new Date() }];
      (mockRepository.getAll as Mock).mockResolvedValue(mockEntities);
      
      const result = await useCases.getAll();
      
      expect(mockRepository.getAll).toHaveBeenCalled();
      expect(result).toEqual(mockEntities);
    });
  });

  describe("getById", () => {
    it("should call repository.getById and return the result", async () => {
      const entityId = "1";
      const mockEntity: TestEntity = { id: entityId, name: "Test 1", createdAt: new Date(), updatedAt: new Date() };
      (mockRepository.getById as Mock).mockResolvedValue(mockEntity);

      const result = await useCases.getById(entityId);

      expect(mockRepository.getById).toHaveBeenCalledWith(entityId);
      expect(result).toEqual(mockEntity);
    });
  });

  describe("create", () => {
    it("should call repository.create with the entity data and return the created entity", async () => {
      const newEntityData = { name: "New Entity" };
      const createdEntity: TestEntity = { id: "new-id", ...newEntityData, createdAt: new Date(), updatedAt: new Date() };
      (mockRepository.create as Mock).mockResolvedValue(createdEntity);

      const result = await useCases.create(newEntityData);

      expect(mockRepository.create).toHaveBeenCalledWith(newEntityData);
      expect(result).toEqual(createdEntity);
    });
  });

  describe("update", () => {
    it("should call repository.update with the id and entity data and return the updated entity", async () => {
      const entityId = "1";
      const updateData = { name: "Updated Entity" };
      const updatedEntity: TestEntity = { id: entityId, ...updateData, createdAt: new Date(), updatedAt: new Date() };
      (mockRepository.update as Mock).mockResolvedValue(updatedEntity);

      const result = await useCases.update(entityId, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(entityId, updateData);
      expect(result).toEqual(updatedEntity);
    });
  });

  describe("delete", () => {
    it("should call repository.delete with the id and return the result", async () => {
      const entityId = "1";
      (mockRepository.delete as Mock).mockResolvedValue(true);

      const result = await useCases.delete(entityId);

      expect(mockRepository.delete).toHaveBeenCalledWith(entityId);
      expect(result).toBe(true);
    });
  });
}); 