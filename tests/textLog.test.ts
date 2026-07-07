import { describe, expect, it } from "vitest";
import { appendTextLog } from "../src/lib/textLog";

describe("text log buffering", () => {
  it("skips blank-only text", () => {
    const items = ["Hello"];

    expect(appendTextLog(items, "   \n\t  ", 100)).toBe(items);
  });

  it("preserves display whitespace", () => {
    expect(appendTextLog([], "  Hello   world  ", 100)).toEqual(["  Hello   world  "]);
  });

  it("dedupes by normalized text", () => {
    const items = ["Hello world"];

    expect(appendTextLog(items, "  Hello   world  ", 100)).toBe(items);
  });

  it("keeps the newest entries within the limit", () => {
    expect(appendTextLog(["one", "two"], "three", 2)).toEqual(["two", "three"]);
  });
});
