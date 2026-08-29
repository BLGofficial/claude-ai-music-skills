# Lyrics Dashboard

A local web dashboard for writing Suno-ready lyrics using the `bitwize-music` skills — as buttons, sliders, and fields instead of a chat session. It calls the Claude API directly (no Claude Code required to run it), streaming generations live into the editor.

This is a companion tool to the plugin, not part of it. It lives in this repo for convenience but runs as its own local server.

## What it does

- Every field on the left (artist, album/project, track title, genre, styles, lyrics style, POV/tense, BPM/tempo, song structure, meta tags, and four creative sliders — energy, mood, vocabulary complexity, explicit content) feeds directly into the prompt sent to Claude.
- Each button under the lyrics editor is wired to one real skill file from `../skills/<name>/SKILL.md` — its actual craft rules and standards are sent to the model as the system prompt, adapted for a single API call (no filesystem/MCP access, so those parts of each skill's instructions are skipped).
- Generation streams live via Server-Sent Events, including Claude's extended-thinking summary (visible in the "Thinking" tab) when the selected model supports it.
- Reports from the Check/Plan skills render in the "Report" tab; Suno Style Box + meta tags render in the "Suno Prompt" tab; lyric-writing/refining streams straight into the lyrics editor.

## Setup

```bash
cd webapp
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
npm start
```

Open `http://localhost:4173`.

Get a key at https://console.anthropic.com/settings/keys. The key stays server-side (`.env`, gitignored) — it is never sent to the browser.

## Skills wired in

| Button | Skill | Targets |
|---|---|---|
| Write Lyrics | `lyric-writer` | Lyrics editor |
| Refine Lyrics | `lyric-refiner` | Lyrics editor (needs existing lyrics) |
| QC Review | `lyric-reviewer` | Report tab |
| Pronunciation Check | `pronunciation-specialist` | Report tab |
| Voice / Authenticity Check | `voice-checker` | Report tab |
| Explicit Content Check | `explicit-checker` | Report tab |
| Plagiarism Check | `plagiarism-checker` | Report tab (LLM knowledge only — no live web search from this tool) |
| Suno Style Box + Meta Tags | `suno-engineer` | Suno Prompt tab |
| Album / Project Concept | `album-conceptualizer` | Report tab |
| Promo Copy | `promo-writer` | Report tab |
| Research Notes | `researcher` | Report tab (LLM knowledge only) |

Skills that operate on real audio files or the album directory structure (mastering, mixing, cloud uploads, imports, release management) aren't included here — this dashboard is a text/lyrics workspace. Use Claude Code with the full plugin for those.

## Deploying (Vercel)

This app also runs as a Vercel serverless function (`api/index.js` wraps the same Express app; `vercel.json` routes everything through it and serves `public/` as static assets).

1. In the Vercel project settings, set **Root Directory** to `webapp` (this lives in a subdirectory of the repo).
2. Add the `ANTHROPIC_API_KEY` environment variable in the Vercel project settings — it is never committed and must be set there directly.
3. Deploy. No build command is needed; Vercel installs `webapp/package.json`'s dependencies and runs the function directly.

**Hobby plan note:** serverless function duration is capped (`vercel.json` requests the max 60s Hobby allows). A long lyric generation at high effort can exceed that and get cut off mid-stream — if that happens, lower the effort level or use Sonnet 5/Haiku 4.5 for deployed use, or run this locally via `npm start` instead, which has no such limit.

## Notes

- Model choice (Opus 5 / Sonnet 5 / Haiku 4.5) and effort level are set in the top bar and apply to every generation.
- The genre field autocompletes from this repo's `genres/` library; when a typed genre matches a folder there, a short excerpt of that genre's reference notes is sent along as extra context.
- Nothing here writes to the repo's `artists/`/album directories or touches the MCP server/state cache — it's a separate scratch space for drafting before you bring lyrics into the real Claude Code workflow.
