export type WordSentenceSlots = {
  sentence_1: string | null;
  sentence_2: string | null;
  sentence_3: string | null;
  sentence_4: string | null;
  sentence_5: string | null;
};

export function getConfiguredSentences(slots: WordSentenceSlots) {
  return [slots.sentence_1, slots.sentence_2, slots.sentence_3, slots.sentence_4, slots.sentence_5].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
}

export function pickSentence(slots: WordSentenceSlots) {
  const configured = getConfiguredSentences(slots);
  if (configured.length === 0) {
    return { sentence: "", sentenceCount: 0, sentenceIndex: 0 };
  }

  const sentenceIndex = Math.floor(Math.random() * configured.length);
  return {
    sentence: configured[sentenceIndex],
    sentenceCount: configured.length,
    sentenceIndex: sentenceIndex + 1,
  };
}
