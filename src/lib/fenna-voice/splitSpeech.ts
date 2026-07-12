/** Split reply so TTS can start on the first sentence(s) while the rest is generated. */
export function splitForFastSpeech(text: string): { first: string; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { first: "", rest: "" };
  if (trimmed.length <= 200) return { first: trimmed, rest: "" };

  const sentences = trimmed.match(/[^.!?…]+[.!?…]+/g);
  if (sentences?.length) {
    const first = sentences[0]!.trim();
    const rest = trimmed.slice(first.length).trim();
    if (first.length >= 20 && first.length <= 180) {
      return { first, rest };
    }
    if (sentences.length >= 2) {
      const two = `${sentences[0]!.trim()} ${sentences[1]!.trim()}`.trim();
      const restTwo = trimmed.slice(two.length).trim();
      if (two.length <= 200) {
        return { first: two, rest: restTwo };
      }
    }
  }

  const wordCut = trimmed.lastIndexOf(" ", 120);
  const cut = wordCut > 40 ? wordCut : 120;
  return {
    first: trimmed.slice(0, cut).trim(),
    rest: trimmed.slice(cut).trim(),
  };
}