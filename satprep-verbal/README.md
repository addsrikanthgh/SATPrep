# SAT Prep Verbal MVP

Local-first Next.js app that reads SAT verbal data from SQLite. The app supports:

- Word study by alphabet and batch size (first 10, 20, 30, etc.)
- Meaning multiple-choice quiz with saved progress
- Passage set APIs with upload and update support

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create and sync database schema:

```bash
npm run db:push
```

3. Seed data from existing workspace JSON files:

```bash
npm run db:seed
```

4. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Data Sources Used by Seed Script

- `../Verbal/words/SATWords.json`
- `../Verbal/questions/work_blanks/Question_work_blanks.json`
- `../Verbal/questions/Question_word_passages/*.json`

## API Endpoints

- `GET /api/words?letter=A&batch=10`
- `GET /api/words/:id`
- `GET /api/quiz/meaning?letter=A&count=10`
- `POST /api/quiz/meaning/submit`
- `GET /api/passage-sets`
- `GET /api/passage-sets/:id`
- `POST /api/passage-sets/upload`
- `PUT /api/passage-sets/:id`

### Passage Upload Payload

Single set:

```json
{
	"id": "question_passage_1",
	"sourceWords": ["abase", "abash"],
	"passage": "...",
	"questions": [
		{
			"questionId": "q1",
			"questionType": "reading_main_idea",
			"question": "Which choice best states...",
			"choices": {
				"A": "...",
				"B": "...",
				"C": "...",
				"D": "..."
			},
			"correctAnswer": "A",
			"explanation": "..."
		}
	]
}
```

Bulk upload:

```json
{
	"passageSets": [
		{
			"id": "question_passage_1",
			"sourceWords": ["abase"],
			"passage": "...",
			"questions": [
				{
					"questionId": "q1",
					"questionType": "reading_main_idea",
					"question": "...",
					"choices": {
						"A": "...",
						"B": "...",
						"C": "...",
						"D": "..."
					},
					"correctAnswer": "A",
					"explanation": "..."
				}
			]
		}
	]
}
```
