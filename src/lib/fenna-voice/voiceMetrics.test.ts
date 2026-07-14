import assert from "node:assert/strict";
import test from "node:test";

import {
  beginVoiceTurn,
  completeVoiceTurn,
  failVoiceTurn,
  markBackendCompleted,
  markTtsFirstAudio,
  recoverVoiceTurn,
  recordVoiceInterrupt,
  resetVoiceMetrics,
  snapshotVoiceMetrics,
} from "./voiceMetrics.ts";

test("voice metrics track turn lifecycle", () => {
  resetVoiceMetrics();
  const id = beginVoiceTurn();
  markBackendCompleted(id, { stt: 120 });
  markTtsFirstAudio(id);
  completeVoiceTurn(id);

  const snap = snapshotVoiceMetrics();
  assert.equal(snap.counters.turns_started, 1);
  assert.equal(snap.counters.turns_completed, 1);
  assert.equal(snap.recent[0]?.vadEndToFirstAudioMs !== undefined, true);
});

test("voice metrics track failure and recovery", () => {
  resetVoiceMetrics();
  const id = beginVoiceTurn();
  recoverVoiceTurn(id);
  recordVoiceInterrupt();

  const snap = snapshotVoiceMetrics();
  assert.equal(snap.counters.turns_recovered, 1);
  assert.equal(snap.counters.interruptions, 1);

  const failId = beginVoiceTurn();
  failVoiceTurn(failId, "network");
  assert.equal(snapshotVoiceMetrics().counters.turns_failed, 1);
});
