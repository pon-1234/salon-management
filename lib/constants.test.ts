import { describe, it, expect } from "vitest";
import * as constants from "./constants";

describe("Constants", () => {
  it("should match the snapshot for all exported constants", () => {
    expect(constants).toMatchSnapshot();
  });
}); 