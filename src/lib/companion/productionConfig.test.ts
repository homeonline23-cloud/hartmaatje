import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getProductionCharacter,
  getProductionConfig,
  getProductionIntroLine,
  getProductionSafetyBlock,
} from "./productionConfig";

describe("productionConfig", () => {
  it("loads all four production characters", () => {
    const { characters, version } = getProductionConfig();
    assert.equal(version, "1.0");
    assert.equal(characters.length, 4);
    assert.deepEqual(
      characters.map((c) => c.id),
      ["fenna", "maarten", "peter", "colette"],
    );
  });

  it("uses fixed Dutch intro lines", () => {
    assert.equal(getProductionIntroLine("fenna", "nl"), "Hallo, ik ben Fenna.");
    assert.equal(getProductionIntroLine("colette", "nl"), "Hallo, ik ben Colette.");
  });

  it("includes identity and safety in prompts", () => {
    const fenna = getProductionCharacter("fenna");
    assert.match(fenna.identity_prompt, /Je bent Fenna/);
    assert.match(fenna.identity_prompt, /grabbelton/);
    assert.equal(fenna.safety_rules.length, 8);
    assert.equal(fenna.forbidden_behaviors.length, 7);

    const block = getProductionSafetyBlock("peter", "nl");
    assert.match(block, /VEILIGHEIDSREGELS/);
    assert.match(block, /VERBODEN GEDRAG/);
    assert.match(block, /Peter/);
  });
});
