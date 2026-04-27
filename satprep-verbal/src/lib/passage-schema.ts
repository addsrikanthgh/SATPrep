import { z } from "zod";

const choicesSchema = z.object({
  A: z.string().min(1),
  B: z.string().min(1),
  C: z.string().min(1),
  D: z.string().min(1),
});

const passageQuestionSchema = z.object({
  questionId: z.string().min(1),
  questionType: z.string().min(1),
  question: z.string().min(1),
  choices: choicesSchema,
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(1),
});

export const passageSetSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  domain: z.string().min(1).optional(),
  skill: z.string().min(1).optional(),
  difficulty: z.string().min(1).optional(),
  sourceWords: z.array(z.string().min(1)).default([]),
  passage: z.string().min(1),
  version: z.number().int().positive().optional(),
  questions: z.array(passageQuestionSchema).min(1),
});

export const qPassageFileSchema = z.object({
  id: z.string().regex(/^q_\d+$/i),
  domain: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.string().min(1),
  passage: z.string().min(1),
  question: z.string().min(1),
  choices: choicesSchema,
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(1),
});

export const uploadPayloadSchema = z.union([
  passageSetSchema,
  z.object({ passageSets: z.array(passageSetSchema).min(1) }),
]);

export type PassageSetInput = z.infer<typeof passageSetSchema>;
export type QPassageFileInput = z.infer<typeof qPassageFileSchema>;
