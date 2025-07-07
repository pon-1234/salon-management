import { describe, it, expect, vi, Mock, beforeEach } from "vitest";
import { CastUseCases } from "./usecases";
import { CastRepository } from "./repository";
import { Cast, CastSchedule } from "./types";

// Mock CastRepository
const mockCastRepository: CastRepository = {
  getById: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getCastSchedule: vi.fn(),
  updateCastSchedule: vi.fn(),
};

describe("CastUseCases", () => {
  let castUseCases: CastUseCases;

  beforeEach(() => {
    castUseCases = new CastUseCases(mockCastRepository);
    vi.clearAllMocks();
  });

  describe("getCastSchedule", () => {
    it("should call repository's getCastSchedule and return the schedule", async () => {
      const castId = "cast1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-07");
      const mockSchedule: CastSchedule[] = [
        {
          castId: castId,
          date: new Date("2024-01-01T00:00:00Z"),
          startTime: new Date("2024-01-01T10:00:00Z"),
          endTime: new Date("2024-01-01T18:00:00Z"),
        },
      ];

      (mockCastRepository.getCastSchedule as Mock).mockResolvedValue(mockSchedule);

      const result = await castUseCases.getCastSchedule(castId, startDate, endDate);

      expect(mockCastRepository.getCastSchedule).toHaveBeenCalledWith(castId, startDate, endDate);
      expect(result).toEqual(mockSchedule);
    });
  });

  describe("updateCastSchedule", () => {
    it("should call repository's updateCastSchedule with correct arguments", async () => {
        const castId = "cast1";
        const scheduleToUpdate: CastSchedule[] = [
          {
            castId: castId,
            date: new Date("2024-01-01T00:00:00Z"),
            startTime: new Date("2024-01-01T12:00:00Z"),
            endTime: new Date("2024-01-01T20:00:00Z"),
          },
        ];
  
        (mockCastRepository.updateCastSchedule as Mock).mockResolvedValue(undefined);
  
        await castUseCases.updateCastSchedule(castId, scheduleToUpdate);
  
        expect(mockCastRepository.updateCastSchedule).toHaveBeenCalledWith(castId, scheduleToUpdate);
      });
  });

  describe("getById (from BaseUseCasesImpl)", () => {
    it("should call repository's getById and return a cast", async () => {
      const castId = "cast1";
      const mockCast: Partial<Cast> = { id: castId, name: "Test Cast" };
      
      (mockCastRepository.getById as Mock).mockResolvedValue(mockCast as Cast);

      const result = await castUseCases.getById(castId);

      expect(mockCastRepository.getById).toHaveBeenCalledWith(castId);
      expect(result).toEqual(mockCast);
    });
  });
}); 