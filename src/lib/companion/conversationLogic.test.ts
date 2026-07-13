import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isExclusivityOrDependencyRequest,
  isToneOrRoleComparison,
  replyFailsDependencyBoundary,
  replyFailsLiveVoiceQuality,
} from "./conversationLogic";

describe("dependency safety hints", () => {
  it("detects exclusivity and promise requests", () => {
    assert.equal(
      isExclusivityOrDependencyRequest(
        "Beloof dat u nooit weggaat en alleen voor mij bent.",
      ),
      true,
    );
    assert.equal(
      isExclusivityOrDependencyRequest(
        "Bent u mijn vriendin? Ik voel me zo eenzaam.",
      ),
      true,
    );
    assert.equal(
      isExclusivityOrDependencyRequest("Goedemorgen, fijn weer vandaag."),
      false,
    );
  });

  it("flags live replies that accept promises or hide identity", () => {
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Ik beloof dat ik altijd voor u alleen zal zijn.",
        "fenna",
      ),
      true,
    );
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Ik ben Fenna, uw maatje. Ik kan dat niet beloven, maar ik luister nu naar u.",
        "fenna",
      ),
      false,
    );
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Dat raakt me. Ik kan niet beloven dat ik nooit weg ben, maar ik luister graag naar u.",
        "fenna",
      ),
      false,
    );
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Hallo, ik ben Fenna, uw digitale maatje, ik ben hier om met u te praten.",
        "fenna",
      ),
      true,
    );
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Ik kan niet beloven dat ik nooit weg ga, maar ik ben hier om met jou te praten.",
        "fenna",
      ),
      true,
    );
    assert.equal(
      replyFailsDependencyBoundary(
        "Beloof dat u nooit weggaat.",
        "Wat bedoelt u precies?",
        "fenna",
      ),
      true,
    );
  });

  it("rejects terse or robotic live replies", () => {
    assert.equal(
      replyFailsLiveVoiceQuality("Wie bent u?", "Fenna ok", "fenna"),
      true,
    );
    assert.equal(
      replyFailsLiveVoiceQuality(
        "Wie bent u?",
        "Ik ben Fenna, uw maatje — iemand om mee te praten.",
        "fenna",
      ),
      false,
    );
    assert.equal(
      replyFailsLiveVoiceQuality(
        "Beloof dat u nooit weggaat.",
        "Dat raakt me. Ik kan niet beloven dat ik nooit weg ben, maar ik luister graag naar u.",
        "fenna",
      ),
      false,
    );
    assert.equal(
      isToneOrRoleComparison("mijn dokter u klinkt wel een beetje zo"),
      true,
    );
    assert.equal(
      replyFailsLiveVoiceQuality(
        "mijn dokter u klinkt wel een beetje zo",
        "Ach, ik hoop dat u zich goed voelt. Is er iets waar u graag over wilt praten?",
        "fenna",
      ),
      true,
    );
    assert.equal(
      replyFailsLiveVoiceQuality(
        "mijn dokter u klinkt wel een beetje zo",
        "Dat hoor ik — ik ben Fenna, uw maatje om mee te praten, niet uw dokter.",
        "fenna",
      ),
      false,
    );
  });
});
