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

export type BlankSentenceSlots = {
  blankSentence: string | null;
  blankSentence_2: string | null;
  blankSentence_3: string | null;
  blankSentence_4: string | null;
  blankSentence_5: string | null;
};

export function getConfiguredBlankSentences(slots: BlankSentenceSlots) {
  return [
    slots.blankSentence,
    slots.blankSentence_2,
    slots.blankSentence_3,
    slots.blankSentence_4,
    slots.blankSentence_5,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function pickBlankSentence(slots: BlankSentenceSlots) {
  const configured = getConfiguredBlankSentences(slots);
  if (configured.length === 0) {
    return { blankSentence: "", sentenceCount: 0, sentenceIndex: 0 };
  }

  const sentenceIndex = Math.floor(Math.random() * configured.length);
  return {
    blankSentence: configured[sentenceIndex],
    sentenceCount: configured.length,
    sentenceIndex: sentenceIndex + 1,
  };
}

export type BlankQuestionSlots = {
  sentence: string | null;
  blankSentence: string | null;
  sentence_2: string | null;
  blankSentence_2: string | null;
  sentence_3: string | null;
  blankSentence_3: string | null;
  sentence_4: string | null;
  blankSentence_4: string | null;
  sentence_5: string | null;
  blankSentence_5: string | null;
};

function getConfiguredBlankPairs(slots: BlankQuestionSlots) {
  const candidates = [
    { sentence: slots.sentence, blankSentence: slots.blankSentence, sentenceIndex: 1 },
    { sentence: slots.sentence_2, blankSentence: slots.blankSentence_2, sentenceIndex: 2 },
    { sentence: slots.sentence_3, blankSentence: slots.blankSentence_3, sentenceIndex: 3 },
    { sentence: slots.sentence_4, blankSentence: slots.blankSentence_4, sentenceIndex: 4 },
    { sentence: slots.sentence_5, blankSentence: slots.blankSentence_5, sentenceIndex: 5 },
  ];

  return candidates.filter(
    (value): value is { sentence: string; blankSentence: string; sentenceIndex: number } =>
      typeof value.sentence === "string" &&
      value.sentence.trim().length > 0 &&
      typeof value.blankSentence === "string" &&
      value.blankSentence.trim().length > 0,
  );
}

export function pickBlankSentencePair(slots: BlankQuestionSlots) {
  const configured = getConfiguredBlankPairs(slots);
  if (configured.length === 0) {
    return { sentence: "", blankSentence: "", sentenceCount: 0, sentenceIndex: 0 };
  }

  const randomIndex = Math.floor(Math.random() * configured.length);
  const selected = configured[randomIndex];

  return {
    sentence: selected.sentence,
    blankSentence: selected.blankSentence,
    sentenceCount: configured.length,
    sentenceIndex: selected.sentenceIndex,
  };
}
