import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getProductionCharacter,
  getProductionConfig,
  getProductionConversationFlowBlock,
  getProductionIdentityPrompt,
  getProductionIntroLine,
  getProductionMemoryRulesBlock,
  getProductionPromptBlocks,
  getProductionResponseStyleBlock,
  getProductionSafetyBlock,
  validateProductionConfig,
} from "./productionConfig";

describe("productionConfig v2.1", () => {
  it("passes schema validation", () => {
    assert.deepEqual(validateProductionConfig(), []);
  });

  it("loads version 2.1 with four complete characters", () => {
    const { version, characters } = getProductionConfig();
    assert.equal(version, "2.1");
    assert.equal(characters.length, 4);
    for (const id of ["fenna", "maarten", "peter", "colette"] as const) {
      const c = getProductionCharacter(id);
      assert.equal(c.name.length > 0, true);
      assert.equal(c.voice_style.length > 0, true);
      assert.equal(c.response_style_rules.length, 16);
      assert.equal(c.memory_rules.length, 8);
      assert.equal(c.safety_rules.length, 8);
      assert.equal(c.forbidden_behaviors.length, 7);
    }
  });

  it("uses fixed Dutch intro lines", () => {
    assert.equal(getProductionIntroLine("fenna", "nl"), "Hallo, ik ben Fenna.");
    assert.equal(getProductionIntroLine("colette", "nl"), "Hallo, ik ben Colette.");
  });

  it("includes conversation guidance in identity prompt", () => {
    const fenna = getProductionIdentityPrompt("fenna", "nl");
    assert.match(fenna, /natuurlijke conversatie/);
    assert.match(fenna, /niet steeds vragen terug/);

    const en = getProductionIdentityPrompt("peter", "en");
    assert.match(en, /natural, pleasant conversation/i);
  });

  it("merges style and flow in response_style_rules", () => {
    const style = getProductionResponseStyleBlock("maarten", "nl");
    assert.match(style, /ANTWOORDSTIJL/);
    assert.match(style, /korte en duidelijke zinnen/);
    assert.match(style, /direct de vraag/);

    const flow = getProductionConversationFlowBlock("maarten", "nl");
    assert.match(flow, /GESPREKSVERLOOP/);
    assert.equal(flow.split("\n- ").length - 1, 8);
  });

  it("builds four-block production prompt stack", () => {
    const blocks = getProductionPromptBlocks("colette", "nl");
    assert.equal(blocks.length, 4);
    const joined = blocks.join("\n");
    assert.match(joined, /Je bent Colette/);
    assert.match(joined, /ANTWOORDSTIJL/);
    assert.match(joined, /GEHEUGENREGELS/);
    assert.match(joined, /VEILIGHEIDSREGELS/);
    assert.doesNotMatch(joined, /GESPREKSVERLOOP/);
  });

  it("includes memory and safety blocks", () => {
    const memory = getProductionMemoryRulesBlock("peter", "nl");
    assert.match(memory, /Identity memory/);
    const safety = getProductionSafetyBlock("fenna", "nl");
    assert.match(safety, /112 of 113/);
  });
});
