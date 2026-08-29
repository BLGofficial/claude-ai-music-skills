import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import {
  getSkill,
  loadSkillBody,
  listSkillsForClient,
  listGenres,
  getGenreExcerpt,
} from "./lib/skills.js";
import {
  buildParameterBlock,
  buildConceptBlock,
  buildLyricsBlock,
  buildGenreReferenceBlock,
} from "./lib/context.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(here, "public")));

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// Model tiers exposed in the UI, mapped to their API capabilities.
// `claude-opus-5` / `claude-sonnet-5` run adaptive thinking + effort control;
// `claude-haiku-4-5` is an older-tier model that doesn't accept either param.
const MODELS = {
  "claude-opus-5": { label: "Opus 5 (best quality)", thinking: true, effort: true, maxTokens: 64000 },
  "claude-sonnet-5": { label: "Sonnet 5 (balanced)", thinking: true, effort: true, maxTokens: 64000 },
  "claude-haiku-4-5": { label: "Haiku 4.5 (fast/cheap)", thinking: false, effort: false, maxTokens: 8192 },
};

app.get("/api/health", (_req, res) => {
  res.json({ apiKeyConfigured: !!client, models: MODELS });
});

app.get("/api/skills", (_req, res) => {
  res.json(listSkillsForClient());
});

app.get("/api/genres", (_req, res) => {
  res.json(listGenres());
});

function sseSend(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

app.post("/api/generate", async (req, res) => {
  if (!client) {
    return res.status(400).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. Copy webapp/.env.example to webapp/.env, add your key, and restart (or set it as an environment variable on your deployment).",
    });
  }

  const { skillId, model, effort, fields = {}, lyrics = "" } = req.body || {};
  const skill = getSkill(skillId);
  if (!skill) {
    return res.status(400).json({ error: `Unknown skill "${skillId}".` });
  }
  const modelConfig = MODELS[model];
  if (!modelConfig) {
    return res.status(400).json({ error: `Unknown model "${model}".` });
  }
  if (skill.requiresLyrics && !lyrics.trim()) {
    return res.status(400).json({ error: `"${skill.label}" needs lyrics in the editor first.` });
  }

  let skillBody;
  try {
    skillBody = loadSkillBody(skill.dir).body;
  } catch (err) {
    return res.status(500).json({ error: `Could not load skill file for "${skill.label}": ${err.message}` });
  }

  const genreExcerpt = getGenreExcerpt(fields.genre);
  const userMessageParts = [
    `# Task\n${skill.task}`,
    buildParameterBlock(fields),
    buildConceptBlock(fields.concept),
    buildGenreReferenceBlock(genreExcerpt),
    skill.usesLyrics ? buildLyricsBlock(lyrics) : null,
    `# Response Format\n${skill.outputContract}`,
  ].filter(Boolean);

  const systemPrompt = [
    "You are being called directly through the Claude API as the engine behind a local song-lyrics dashboard for the bitwize-music Suno workflow. There is NO file system, NO MCP server, and NO tool access in this call — you are operating in single-shot text mode.",
    "Below is the full skill guide this dashboard button is wired to. Apply its craft knowledge, standards, and judgment calls exactly as written, but IGNORE any instructions in it about reading/editing/writing files, running MCP tools, checking track frontmatter, or other filesystem workflow steps — none of that exists here. Treat all the information you need as provided directly in the user message that follows.",
    "---",
    skillBody,
  ].join("\n\n");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const params = {
    model,
    max_tokens: modelConfig.maxTokens,
    system: [{ type: "text", text: systemPrompt }],
    messages: [{ role: "user", content: userMessageParts.join("\n\n") }],
  };
  if (modelConfig.thinking) {
    params.thinking = { type: "adaptive", display: "summarized" };
  }
  if (modelConfig.effort) {
    params.output_config = { effort: effort || "high" };
  }

  let stream;
  try {
    stream = client.messages.stream(params);
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          sseSend(res, "text", { text: event.delta.text });
        } else if (event.delta.type === "thinking_delta") {
          sseSend(res, "thinking", { text: event.delta.thinking });
        }
      }
    }
    const final = await stream.finalMessage();
    sseSend(res, "done", {
      stopReason: final.stop_reason,
      usage: final.usage,
    });
  } catch (err) {
    sseSend(res, "error", { message: err?.message || String(err) });
  } finally {
    res.end();
  }
});

export default app;
