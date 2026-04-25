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
  sourceWords: z.array(z.string().min(1)).min(1),
  passage: z.string().min(1),
  version: z.number().int().positive().optional(),
  questions: z.array(passageQuestionSchema).min(1),
});

export const uploadPayloadSchema = z.union([
  passageSetSchema,
  z.object({ passageSets: z.array(passageSetSchema).min(1) }),
]);

export type PassageSetInput = z.infer<typeof passageSetSchema>;
