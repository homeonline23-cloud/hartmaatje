import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getProductionCharacter,
  getProductionConfig,
  getProductionConversationFlowBlock,
  getProductionIntroLine,
  getProductionMemoryRulesBlock,
  getProductionPromptBlocks,
  getProductionResponseStyleBlock,
  getProductionSafetyBlock,
} from "./productionConfig";

describe("productionConfig v2", () => {
  it("loads version 2.0 with conversation flow rules", () => {
    const { version, conversation_flow_rules, characters } = getProductionConfig();
    assert.equal(version, "2.0");
    assert.equal(conversation_flow_rules.length, 8);
    assert.equal(characters.length, 4);
  });

  it("uses fixed Dutch intro lines", () => {
    assert.equal(getProductionIntroLine("fenna", "nl"), "Hallo, ik ben Fenna.");
    assert.equal(getProductionIntroLine("peter", "nl"), "Hallo, ik ben Peter.");
  });

  it("includes v2 style, memory, flow and safety blocks", () => {
    const fenna = getProductionCharacter("fenna");
    assert.equal(fenna.response_style_rules.length, 8);
    assert.equal(fenna.memory_rules.length, 8);
    assert.match(fenna.memory_rules[2], /Wie bent u/);

    const style = getProductionResponseStyleBlock("colette", "nl");
    assert.match(style, /ANTWOORDSTIJL/);
    assert.match(style, /zachte zinnen/);

    const memory = getProductionMemoryRulesBlock("maarten", "nl");
    assert.match(memory, /GEHEUGENREGELS/);
    assert.match(memory, /Identity memory/);

    const flow = getProductionConversationFlowBlock("nl");
    assert.match(flow, /GESPREKSVERLOOP/);
    assert.match(flow, /direct de vraag/);

    const safety = getProductionSafetyBlock("peter", "nl");
    assert.match(safety, /VEILIGHEIDSREGELS/);
    assert.match(safety, /Peter/);
  });

  it("builds full production prompt stack", () => {
    const blocks = getProductionPromptBlocks("fenna", "nl");
    assert.equal(blocks.length, 5);
    assert.match(blocks.join("\n"), /Je bent Fenna/);
    assert.match(blocks.join("\n"), /ANTWOORDSTIJL/);
    assert.match(blocks.join("\n"), /GEHEUGENREGELS/);
    assert.match(blocks.join("\n"), /GESPREKSVERLOOP/);
    assert.match(blocks.join("\n"), /VEILIGHEIDSREGELS/);
  });
});
