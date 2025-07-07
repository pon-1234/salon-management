import { describe, it, expect } from "vitest";
import {
  generateId,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatPercentage,
  formatDuration,
  formatJapaneseDate,
  generateMockData,
} from "./utils";

describe("Shared Utilities", () => {
  describe("generateId", () => {
    it("should generate a unique string ID", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
    });
  });

  describe("formatCurrency", () => {
    it("should format a number into Japanese currency format", () => {
      expect(formatCurrency(1234567)).toBe("1,234,567");
    });

    it("should handle zero", () => {
      expect(formatCurrency(0)).toBe("0");
    });

    it("should handle negative numbers", () => {
      expect(formatCurrency(-500)).toBe("-500");
    });
  });

  describe("formatNumber", () => {
    it("should format a number with commas", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });

  describe("formatDate", () => {
    const testDate = new Date("2024-07-27T10:20:30Z");

    it("should format a date in short format by default", () => {
      expect(formatDate(testDate)).toBe("2024/7/27");
    });

    it("should format a date in long format", () => {
      // Note: The exact string depends on the testing environment's locale data.
      // This test might be brittle.
      expect(formatDate(testDate, "long")).toContain("2024年7月27日");
    });

    it("should format a date to show only time", () => {
      // Adjust for timezone differences in test environment
      const timeString = new Date("2024-07-27T19:20:30+09:00").toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      expect(formatDate(testDate, "time")).toBe(timeString);
    });

    it("should handle string input", () => {
      expect(formatDate("2024-07-27")).toBe("2024/7/27");
    });
  });

  describe("formatDateTime", () => {
    it("should format a date and time from a Date object", () => {
       const testDate = new Date("2024-07-27T19:20:30+09:00");
       const expectedDate = "2024/7/27";
       const expectedTime = "19:20";
      expect(formatDateTime(testDate)).toBe(`${expectedDate} ${expectedTime}`);
    });

    it("should format a date and time from a string", () => {
      const testDateString = "2024-07-27T19:20:30+09:00";
      const expectedDate = "2024/7/27";
      const expectedTime = "19:20";
      expect(formatDateTime(testDateString)).toBe(`${expectedDate} ${expectedTime}`);
    });
  });

  describe("formatPercentage", () => {
    it("should format a number as a percentage with default decimals", () => {
      expect(formatPercentage(85.55)).toBe("85.6%");
    });

    it("should format a number as a percentage with specified decimals", () => {
      expect(formatPercentage(85.55, 2)).toBe("85.55%");
    });
  });

  describe("formatDuration", () => {
    it("should format a number as a duration in hours", () => {
      expect(formatDuration(2.5)).toBe("2.5時間");
    });
  });

  describe("formatJapaneseDate", () => {
    it("should format a date in Japanese month/day(weekday) format", () => {
      const testDate = new Date("2024-07-27"); // This is a Saturday
      expect(formatJapaneseDate(testDate)).toBe("7/27(土)");
    });
  });

  describe("generateMockData", () => {
    it("should generate an array of mock data", () => {
      const generator = (index: number) => ({ name: `item-${index}` });
      const data = generateMockData<{id: string, createdAt: Date, updatedAt: Date, name: string}>(5, generator);

      expect(data).toHaveLength(5);
      expect(data[0].name).toBe("item-0");
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("createdAt");
      expect(data[0]).toHaveProperty("updatedAt");
    });
  });
}); 