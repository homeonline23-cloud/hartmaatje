import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CONSENT_KINDS,
  isConsentKind,
} from "./consentKinds";

describe("consentKinds", () => {
  it("accepts all fixed consent kinds", () => {
    for (const kind of CONSENT_KINDS) {
      assert.equal(isConsentKind(kind), true);
    }
  });

  it("rejects free-text variants", () => {
    assert.equal(isConsentKind("privacy"), false);
    assert.equal(isConsentKind("privacy policy"), false);
    assert.equal(isConsentKind("data processing"), false);
  });
});
