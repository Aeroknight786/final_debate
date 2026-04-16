# Final Debate About Smoking

A chat-first smoking cessation app built on Allen Carr's method. Next.js 14 + Prisma + SQLite.

## Quick start (for Claude Code or any agent)

```bash
cd app
npm install
npx prisma generate
npx prisma migrate deploy
cp .env.example .env
```

Then edit `app/.env` to select a provider:

| Provider | `.env` setting | Prerequisites |
|---|---|---|
| Claude CLI (no API key) | `LLM_PROVIDER="claude-cli"` | `claude` CLI logged in (`claude auth login`) |
| Codex CLI (no API key) | `LLM_PROVIDER="codex-cli"` | `npm i -g @openai/codex && codex login` |
| Anthropic API | `LLM_PROVIDER="anthropic"` | Set `ANTHROPIC_API_KEY` |
| OpenAI API | `LLM_PROVIDER="openai"` | Set `OPENAI_API_KEY` |

Start the dev server:

```bash
cd app && npm run dev
```

The app runs at `http://localhost:3000`. Open it in a browser and start the debate.

## Kickoff script

For a fully automated setup, run:

```bash
bash scripts/setup.sh
```

This installs deps, runs migrations, configures `claude-cli` as the default provider (if the `claude` CLI is available), and starts the dev server.

## Architecture

- **LLM dispatcher** (`src/lib/llm.ts`): All LLM calls route through `chatCompletion()` and `jsonCompletion()`. Provider is selected at boot via `LLM_PROVIDER` env var. Callers never touch the provider directly.
- **Prompt layers** (`src/lib/prompts/`): Global system prompt with debate discipline, per-module prompts with derivative tests and target beliefs, memory injection from beliefs + learnings.
- **Stage governor** (`src/lib/services/stage-governor.ts`): Rules-first readiness gate. Progression requires target beliefs confronted, derivative tests deployed, no hanging unresolved beliefs. LLM judgment only consulted after rules pass.
- **Belief tracker** (`src/lib/services/belief-tracker.ts`): Three-bucket lifecycle: Under examination (active/under_challenge/weakened) -> Deferred (parked for a later module) -> Cracked (resolved). Deferred beliefs cannot skip to weakened without re-entering under_challenge.
- **9-module roadmap**: module_0 (The Challenge) through module_8 (Freedom), with module_7 as the ritual gate. Each module has target beliefs and derivative tests defined in `src/lib/modules/definitions.ts`.

## Key surfaces

- `/chat` - The debate interface
- `/beliefs` - Three-bucket belief tracker (Under examination / Deferred / Cracked)
- `/learnings` - Four-part learning cards (original belief -> contradiction -> corrected frame -> linked beliefs)
- `/roadmap` - Module progression with readiness blockers
- `/ritual` - Final ritual gate (locked until all modules pass)

## Database

SQLite via Prisma. Schema at `app/prisma/schema.prisma`. Migrations in `app/prisma/migrations/`.

```bash
cd app
npx prisma migrate deploy   # apply migrations
npx prisma studio            # visual DB browser
```

## Testing

```bash
cd app
npm run build                    # typecheck + production build
npx tsx tests/modules.test.ts    # module definition invariants
```

## CLI provider notes

The `claude-cli` and `codex-cli` providers shell out to the local CLI as a subprocess. Each LLM call takes 20-60 seconds (CLI startup overhead). This is for testing the flow and prompts, not production use. Multi-turn history is rendered as a single `User:/Assistant:` prompt string since CLI tools take one argument.
