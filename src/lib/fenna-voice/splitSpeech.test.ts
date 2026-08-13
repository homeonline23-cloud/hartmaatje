import assert from "node:assert/strict";
import test from "node:test";

import {
  FAST_SPEECH_SINGLE_REQUEST_MAX_CHARS,
  splitForFastSpeech,
} from "./splitSpeech.ts";

test("short replies stay in one TTS request", () => {
  const text = "Wat fijn dat u dat deelt.";
  const { first, rest } = splitForFastSpeech(text);
  assert.equal(first, text);
  assert.equal(rest, "");
});

test("longer replies start with the first complete sentence", () => {
  const firstSentence =
    "Wat fijn dat u dat deelt, ik hoor hoe belangrijk dat voor u is en ik blijf daar graag even bij.";
  const restSentence =
    "Dan hoeven we nergens heen, we kunnen rustig verder praten over wat u net zei, zonder haast of extra vragen.";
  const text = `${firstSentence} ${restSentence}`;
  assert.ok(text.length > FAST_SPEECH_SINGLE_REQUEST_MAX_CHARS);

  const { first, rest } = splitForFastSpeech(text);
  assert.equal(first, firstSentence);
  assert.equal(rest, restSentence);
});
