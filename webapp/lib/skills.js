import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");
const VENDOR_DIR = path.join(here, "..", "vendor");

/**
 * Prefer the real monorepo directory (local dev, or a git-linked deploy that
 * checks out the whole repo) and fall back to a bundled copy under
 * webapp/vendor/ (a standalone deploy — e.g. a direct file upload to Vercel —
 * only has what's inside webapp/). See webapp/README.md for how vendor/ is
 * kept in sync.
 */
function resolveDir(primary, vendorName) {
  return fs.existsSync(primary) ? primary : path.join(VENDOR_DIR, vendorName);
}

export const SKILLS_DIR = resolveDir(path.join(REPO_ROOT, "skills"), "skills");
export const GENRES_DIR = resolveDir(path.join(REPO_ROOT, "genres"), "genres");

/**
 * Curated set of bitwize-music skills exposed as dashboard buttons.
 * Each entry points at the real skills/<dir>/SKILL.md so the skill's own
 * craft knowledge drives generation. `task` and `outputContract` adapt the
 * skill (normally invoked by an interactive Claude Code agent with file
 * tools) to a single-shot API call operating on text fields instead.
 */
export const SKILL_CATALOG = [
  {
    id: "lyric-writer",
    dir: "lyric-writer",
    label: "Write Lyrics",
    category: "write",
    icon: "✍️",
    usesLyrics: false,
    outputTarget: "lyrics",
    task: "Write complete, ready-to-record song lyrics based on the concept and parameters below. Apply every craft principle in your instructions: rhyme quality, prosody, POV/tense consistency, hook placement, section pacing, and pronunciation-safe phonetics.",
    outputContract:
      'Output ONLY the finished lyrics, formatted with Suno-style section labels on their own line (e.g. "[Verse 1]", "[Pre-Chorus]", "[Chorus]", "[Verse 2]", "[Bridge]", "[Outro]") matching the requested structure. Do not include any preamble, explanation, or the quality checklist — the response body must be the lyrics block and nothing else.',
  },
  {
    id: "lyric-refiner",
    dir: "lyric-refiner",
    label: "Refine Lyrics",
    category: "write",
    icon: "🪄",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "lyrics",
    task: "Run one multi-pass refinement over the EXISTING LYRICS provided below — tighten weak lines, improve cohesion and prosody, fix lazy rhymes — using the concept/parameters as creative context. Preserve what already works.",
    outputContract:
      "Output ONLY the fully revised lyrics block, in the same section-label format as the input. No commentary, no diff notation, no list of changes — just the final lyrics.",
  },
  {
    id: "lyric-reviewer",
    dir: "lyric-reviewer",
    label: "QC Review",
    category: "check",
    icon: "✅",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "report",
    task: "Run the full quality checklist from your instructions against the EXISTING LYRICS below and report every violation found.",
    outputContract:
      'Output a structured Markdown report: a "PASS" or "NEEDS WORK" verdict per checklist category, then a bullet list of specific issues, each quoting the offending line and a suggested fix. Do not rewrite the lyrics yourself.',
  },
  {
    id: "pronunciation-specialist",
    dir: "pronunciation-specialist",
    label: "Pronunciation Check",
    category: "check",
    icon: "🗣️",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "report",
    task: "Scan the EXISTING LYRICS below for pronunciation risks (homographs, proper nouns, technical terms, non-English words) per your guide.",
    outputContract:
      'Output a Markdown table with columns "Word/Phrase | Line | Risk | Suggested Phonetic Fix", followed by a "### Corrected Lyrics" section containing the lyrics with every safe phonetic fix applied, ready to paste back into the editor.',
  },
  {
    id: "voice-checker",
    dir: "voice-checker",
    label: "Voice / Authenticity Check",
    category: "check",
    icon: "🕵️",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "report",
    task: "Scan the EXISTING LYRICS below for AI-written tells per your pattern classes (abstract noun stacking, over-explained metaphors, cliche escalation, missing idiosyncrasy).",
    outputContract:
      "Output a Markdown report grouped by pattern class. For each finding show its severity (Warning/Info), the offending line quoted, and one concrete rewrite suggestion. This is advisory — do not rewrite the whole lyric.",
  },
  {
    id: "explicit-checker",
    dir: "explicit-checker",
    label: "Explicit Content Check",
    category: "check",
    icon: "🚫",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "report",
    task: "Scan the EXISTING LYRICS below for explicit content per your word list and rules.",
    outputContract:
      'Output a short Markdown report listing each flagged word/phrase with its count, then a final line: "**Explicit: Yes**" or "**Explicit: No**" suitable for a distributor submission.',
  },
  {
    id: "plagiarism-checker",
    dir: "plagiarism-checker",
    label: "Plagiarism Check",
    category: "check",
    icon: "🔍",
    usesLyrics: true,
    requiresLyrics: true,
    outputTarget: "report",
    task: "Using only your own training knowledge (no live web search is available in this tool), flag any phrases in the EXISTING LYRICS below that closely echo well-known existing songs.",
    outputContract:
      'Start the report with a bold line stating this pass is LLM-knowledge-only and a live web search pass (via `/bitwize-music:plagiarism-checker` in Claude Code) is recommended before release. Then a Markdown table: "Phrase | Suspected Source | Confidence (Low/Med/High) | Suggested Rewrite" for anything Medium or higher.',
  },
  {
    id: "suno-engineer",
    dir: "suno-engineer",
    label: "Suno Style Box + Meta Tags",
    category: "prompt",
    icon: "🎛️",
    usesLyrics: true,
    outputTarget: "suno",
    task: "Construct an optimal Suno V5/V5.5 Style Box and meta-tag set for this track, using the concept, genre/style/BPM/mood parameters below, and — if present — the existing lyrics for phrasing and section cues.",
    outputContract:
      'Output exactly two labeled Markdown sections and nothing else: "### Style Box" containing a single paragraph of comma-separated style descriptors under 1000 characters with no blank lines inside it, and "### Meta Tags" containing a bullet list of the recommended structural/production meta tags in the order they should appear in the lyrics box.',
  },
  {
    id: "album-conceptualizer",
    dir: "album-conceptualizer",
    label: "Album / Project Concept",
    category: "plan",
    icon: "🧭",
    usesLyrics: false,
    outputTarget: "report",
    task: "Using the concept notes and parameters below, sketch an album/project concept: a working title, a one-paragraph narrative arc/theme, and a proposed tracklist.",
    outputContract:
      'Output clean Markdown with exactly these headings: "## Title", "## Theme" (one paragraph), and "## Tracklist" (numbered list, each item "**Song Title** — one-line concept"). No other commentary.',
  },
  {
    id: "promo-writer",
    dir: "promo-writer",
    label: "Promo Copy",
    category: "plan",
    icon: "📣",
    usesLyrics: true,
    outputTarget: "report",
    task: "Write social copy for this track/project for Twitter/X, Instagram, TikTok, and YouTube using the concept, parameters, and — if present — lyrics below.",
    outputContract:
      'Output Markdown with one "### Platform" heading per platform (Twitter/X, Instagram, TikTok, YouTube), each containing ready-to-post copy in that platform\'s native voice, length, and hashtag conventions.',
  },
  {
    id: "researcher",
    dir: "researcher",
    label: "Research Notes",
    category: "plan",
    icon: "📚",
    usesLyrics: false,
    outputTarget: "report",
    task: "Using only your own training knowledge (no live web search is available in this tool), produce research notes and fact leads on the concept/topic below, suitable as a starting point for a documentary-style song.",
    outputContract:
      'Start with a bold line stating this is LLM-knowledge only, not verified research, and that `/bitwize-music:researcher` in Claude Code should run the real source-verification pass before writing. Then output Markdown: "## Known Facts" (bullet list; mark anything you are not fully certain of as "[UNVERIFIED]"), "## Suggested Angles", and "## Sources To Verify Manually".',
  },
];

const SKILL_MAP = new Map(SKILL_CATALOG.map((s) => [s.id, s]));

const frontmatterCache = new Map();

/** Strip the leading YAML frontmatter block, return { meta, body }. */
function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return { meta, body: raw.slice(match[0].length) };
}

/** Load and cache a skill's SKILL.md body (frontmatter stripped). */
export function loadSkillBody(skillDir) {
  if (frontmatterCache.has(skillDir)) return frontmatterCache.get(skillDir);
  const file = path.join(SKILLS_DIR, skillDir, "SKILL.md");
  const raw = fs.readFileSync(file, "utf8");
  const { meta, body } = splitFrontmatter(raw);
  const result = { meta, body: body.trim() };
  frontmatterCache.set(skillDir, result);
  return result;
}

export function getSkill(id) {
  return SKILL_MAP.get(id);
}

export function listSkillsForClient() {
  return SKILL_CATALOG.map((s) => {
    let description = "";
    try {
      description = loadSkillBody(s.dir).meta.description || "";
    } catch {
      // skill file missing on disk; button still renders, generation will 404 clearly
    }
    return {
      id: s.id,
      label: s.label,
      category: s.category,
      icon: s.icon,
      usesLyrics: !!s.usesLyrics,
      requiresLyrics: !!s.requiresLyrics,
      outputTarget: s.outputTarget,
      description,
    };
  });
}

export function listGenres() {
  try {
    return fs
      .readdirSync(GENRES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    // Standalone deploy: no per-genre folders bundled, just a flat name list
    // for autocomplete (getGenreExcerpt will have nothing to read either way).
    try {
      const listFile = path.join(VENDOR_DIR, "genres-list.json");
      return JSON.parse(fs.readFileSync(listFile, "utf8"));
    } catch {
      return [];
    }
  }
}

/** Return a short excerpt of a genre's reference README, if it exists. */
export function getGenreExcerpt(genreName, maxChars = 2200) {
  if (!genreName) return null;
  const slug = genreName.trim().toLowerCase().replace(/\s+/g, "-");
  const file = path.join(GENRES_DIR, slug, "README.md");
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  return raw.length > maxChars ? raw.slice(0, maxChars) + "\n…(truncated)" : raw;
}
