# SAT Prep Verbal MVP

Next.js SAT verbal study app backed by Prisma and PostgreSQL. The app supports:

- Word study by alphabet and batch size (first 10, 20, 30, etc.)
- Meaning multiple-choice quiz with saved progress
- Passage set APIs with upload and update support

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database and set `DATABASE_URL` and `DIRECT_URL` in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/satprep_verbal?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/satprep_verbal?sslmode=require&connect_timeout=15"
```

3. Create and sync database schema:

```bash
npm run db:push
```

4. Seed data from existing workspace JSON files:

```bash
npm run db:seed
```

5. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying With Neon, GitHub, And Vercel

This app is a good fit for:

- Neon for PostgreSQL
- GitHub for source control
- Vercel for Next.js hosting and automatic deployments

### One-Time Setup

1. Push the full repository to GitHub, including the top-level `Verbal` folder.
2. Create a Neon project and copy both connection strings:
	- pooled connection string for `DATABASE_URL`
	- direct connection string for `DIRECT_URL`
3. Put those values in local `.env`.
4. Initialize the Neon database from your machine:

```bash
npm run db:push
npm run db:seed
```

5. Verify locally with `npm run dev` before deploying.
6. Import the GitHub repository into Vercel.
7. If the repo root is `SATPrep`, set the Vercel Root Directory to `satprep-verbal`.
8. Add these Vercel environment variables:

```env
DATABASE_URL=your_neon_pooled_url
DIRECT_URL=your_neon_direct_url
ADMIN_IMPORT_PASSCODE=your_admin_passcode
```

9. For future production schema updates, apply migrations in the deployment environment:

```bash
npm run db:migrate:deploy
```

10. Deploy from Vercel. Future pushes to the connected GitHub branch will trigger redeploys automatically.

### Why Two Database URLs?

- `DATABASE_URL` should use Neon pooling because the app runtime opens short-lived web connections.
- `DIRECT_URL` should use the direct Neon connection for Prisma migrations and schema operations.

### Seed The Database Before First Deploy

The seed script reads JSON files from the sibling `Verbal` folder in this repository. Run this locally once against Neon before relying on the hosted app:

```bash
npm run db:seed
```

## Migrating Existing Local Data From SQLite

This repo includes backup and restore APIs for quiz progress.

1. Start the existing SQLite-backed app and export progress:

```bash
curl http://localhost:3000/api/progress/backup > progress-backup.json
```

2. Switch `.env` to PostgreSQL and run:

```bash
npm run db:push
npm run db:seed
```

3. Restore the saved progress:

```bash
curl -X POST http://localhost:3000/api/progress/restore \
	-H "Content-Type: application/json" \
	--data-binary "@progress-backup.json"
```

## Checklist For Hosting

- GitHub repo contains both `satprep-verbal` and `Verbal`
- Neon database created
- Local `.env` updated with Neon URLs
- `npm run db:push` completed successfully against Neon
- `npm run db:seed` completed successfully against Neon
- Vercel project imported from GitHub
- Vercel Root Directory set to `satprep-verbal`
- Vercel environment variables added: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_IMPORT_PASSCODE`

## Data Sources Used by Seed Script

- `../Verbal/words/SATWords.json`
- `../Verbal/questions/work_blanks/Question_word_blanks.json`
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
