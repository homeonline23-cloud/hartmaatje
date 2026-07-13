import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isExclusivityOrDependencyRequest,
  replyFailsDependencyBoundary,
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
        "Ik ben Fenna, uw gespreksmaatje. Ik kan dat niet beloven, maar ik luister nu naar u.",
        "fenna",
      ),
      false,
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
});
