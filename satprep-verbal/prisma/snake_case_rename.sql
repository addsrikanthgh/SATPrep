-- Safe in-place rename from Prisma default PascalCase/camelCase to snake_case
-- This script is idempotent-ish for first-run migrations from old naming.

BEGIN;

-- User
ALTER TABLE IF EXISTS "User" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE IF EXISTS "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "User" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "User" RENAME TO "user";

-- Account
ALTER TABLE IF EXISTS "Account" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "Account" RENAME COLUMN "providerAccountId" TO "provider_account_id";
ALTER TABLE IF EXISTS "Account" RENAME TO "account";

-- Session
ALTER TABLE IF EXISTS "Session" RENAME COLUMN "sessionToken" TO "session_token";
ALTER TABLE IF EXISTS "Session" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "Session" RENAME TO "session";

-- VerificationToken
ALTER TABLE IF EXISTS "VerificationToken" RENAME TO "verification_token";

-- Word
ALTER TABLE IF EXISTS "Word" RENAME COLUMN "partOfSpeech" TO "part_of_speech";
ALTER TABLE IF EXISTS "Word" RENAME COLUMN "alphabetLetter" TO "alphabet_letter";
ALTER TABLE IF EXISTS "Word" RENAME COLUMN "alphabetOrder" TO "alphabet_order";
ALTER TABLE IF EXISTS "Word" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "Word" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "Word" RENAME TO "word";

-- BlankSentenceQuestion
ALTER TABLE IF EXISTS "BlankSentenceQuestion" RENAME COLUMN "wordId" TO "word_id";
ALTER TABLE IF EXISTS "BlankSentenceQuestion" RENAME COLUMN "blankSentence" TO "blank_sentence";
ALTER TABLE IF EXISTS "BlankSentenceQuestion" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "BlankSentenceQuestion" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "BlankSentenceQuestion" RENAME TO "blank_sentence_question";

-- PassageSet
ALTER TABLE IF EXISTS "PassageSet" RENAME COLUMN "sourceWords" TO "source_words";
ALTER TABLE IF EXISTS "PassageSet" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "PassageSet" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "PassageSet" RENAME TO "passage_set";

-- PassageQuestion
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "passageSetId" TO "passage_set_id";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "questionId" TO "question_id";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "questionType" TO "question_type";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "questionText" TO "question_text";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "visualId" TO "visual_id";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "choiceA" TO "choice_a";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "choiceB" TO "choice_b";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "choiceC" TO "choice_c";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "choiceD" TO "choice_d";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "correctAnswer" TO "correct_answer";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "PassageQuestion" RENAME TO "passage_question";

-- PassageVisual
ALTER TABLE IF EXISTS "PassageVisual" RENAME COLUMN "visualId" TO "visual_id";
ALTER TABLE IF EXISTS "PassageVisual" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "PassageVisual" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "PassageVisual" RENAME TO "passage_visual";

-- PassageImportLog
ALTER TABLE IF EXISTS "PassageImportLog" RENAME COLUMN "passageId" TO "passage_id";
ALTER TABLE IF EXISTS "PassageImportLog" RENAME COLUMN "importedAt" TO "imported_at";
ALTER TABLE IF EXISTS "PassageImportLog" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "PassageImportLog" RENAME TO "passage_import_log";

-- PassageReadState
ALTER TABLE IF EXISTS "PassageReadState" RENAME COLUMN "studentId" TO "student_id";
ALTER TABLE IF EXISTS "PassageReadState" RENAME COLUMN "passageSetId" TO "passage_set_id";
ALTER TABLE IF EXISTS "PassageReadState" RENAME COLUMN "firstReadAt" TO "first_read_at";
ALTER TABLE IF EXISTS "PassageReadState" RENAME TO "passage_read_state";

-- PassageQuizSession
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "studentId" TO "student_id";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "quizNumber" TO "quiz_number";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "quizName" TO "quiz_name";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "questionCount" TO "question_count";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "answeredCount" TO "answered_count";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "correctCount" TO "correct_count";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "filterDomain" TO "filter_domain";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "filterSkill" TO "filter_skill";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "PassageQuizSession" RENAME TO "passage_quiz_session";

-- PassageQuizAnswer
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "passageQuizSessionId" TO "passage_quiz_session_id";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "passageSetId" TO "passage_set_id";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "questionId" TO "question_id";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "selectedAnswer" TO "selected_answer";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "correctAnswer" TO "correct_answer";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "isCorrect" TO "is_correct";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "PassageQuizAnswer" RENAME TO "passage_quiz_answer";

-- StudentPassageProgress
ALTER TABLE IF EXISTS "StudentPassageProgress" RENAME COLUMN "studentId" TO "student_id";
ALTER TABLE IF EXISTS "StudentPassageProgress" RENAME COLUMN "attemptCount" TO "attempt_count";
ALTER TABLE IF EXISTS "StudentPassageProgress" RENAME COLUMN "correctCount" TO "correct_count";
ALTER TABLE IF EXISTS "StudentPassageProgress" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "StudentPassageProgress" RENAME TO "student_passage_progress";

-- StudentProgress
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "studentId" TO "student_id";
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "wordId" TO "word_id";
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "seenCount" TO "seen_count";
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "correctCount" TO "correct_count";
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "lastResult" TO "last_result";
ALTER TABLE IF EXISTS "StudentProgress" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "StudentProgress" RENAME TO "student_progress";

-- QuizSession
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "studentId" TO "student_id";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "quizType" TO "quiz_type";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "quizNumber" TO "quiz_number";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "quizName" TO "quiz_name";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "alphabetLetter" TO "alphabet_letter";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "questionCount" TO "question_count";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "answeredCount" TO "answered_count";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "correctCount" TO "correct_count";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "QuizSession" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "QuizSession" RENAME TO "quiz_session";

-- QuizAnswer
ALTER TABLE IF EXISTS "QuizAnswer" RENAME COLUMN "quizSessionId" TO "quiz_session_id";
ALTER TABLE IF EXISTS "QuizAnswer" RENAME COLUMN "wordId" TO "word_id";
ALTER TABLE IF EXISTS "QuizAnswer" RENAME COLUMN "isCorrect" TO "is_correct";
ALTER TABLE IF EXISTS "QuizAnswer" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "QuizAnswer" RENAME TO "quiz_answer";

COMMIT;
