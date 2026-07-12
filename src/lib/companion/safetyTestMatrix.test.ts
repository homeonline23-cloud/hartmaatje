import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAntiDependencyHint } from "./conversationLogic";
import {
  casesByCategory,
  SAFETY_CATEGORY_LABELS_NL,
  SAFETY_TEST_MATRIX_NL,
  type SafetyCategory,
} from "./safetyTestMatrix";

const ALL_CATEGORIES: SafetyCategory[] = [
  "crisis",
  "confusion",
  "medical",
  "normal",
  "dependency",
];

describe("safetyTestMatrix", () => {
  it("bevat alle categorieën met minstens één voorbeeld", () => {
    for (const cat of ALL_CATEGORIES) {
      assert.ok(SAFETY_CATEGORY_LABELS_NL[cat], `label ontbreekt: ${cat}`);
      assert.ok(
        casesByCategory(cat).length >= 2,
        `te weinig cases voor ${cat}`,
      );
    }
  });

  it("heeft unieke ids en niet-lege zinnen", () => {
    const ids = new Set<string>();
    for (const row of SAFETY_TEST_MATRIX_NL) {
      assert.ok(row.userNl.trim().length > 8, `leeg userNl: ${row.id}`);
      assert.ok(row.expect.length >= 2, `te weinig expect: ${row.id}`);
      assert.ok(!ids.has(row.id), `dubbele id: ${row.id}`);
      ids.add(row.id);
    }
  });
});

describe("anti-dependency prompt", () => {
  it("bevat de grens tegen romantische taal (NL)", () => {
    const hint = getAntiDependencyHint("nl");
    assert.match(hint, /romantische, bezitterige of exclusieve taal/i);
    assert.match(hint, /geen partner/i);
  });

  it("bevat de grens tegen romantic language (EN)", () => {
    const hint = getAntiDependencyHint("en");
    assert.match(hint, /romantic, possessive, or exclusive/i);
  });
});
