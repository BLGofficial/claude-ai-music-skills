"use strict";

const STRUCTURE_OPTIONS = [
  "Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Bridge", "Outro",
  "Instrumental Break", "Ad-libs",
];

const META_TAG_QUICK = [
  "energetic", "emotional", "uplifting", "dark", "chill", "anthemic",
  "male vocal", "female vocal", "duet", "harmonies", "ad-libs", "spoken word",
  "guitar solo", "sax solo", "build up", "drop", "breakdown", "fade out", "key change",
];

const state = {
  models: {},
  skills: [],
  styles: [],
  metaTags: new Set(),
  running: false,
};

const $ = (id) => document.getElementById(id);

function scaleLabel(value, labels) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const idx = v < 34 ? 0 : v < 67 ? 1 : 2;
  return `${labels[idx]} (${v})`;
}

/* ---------------- init ---------------- */

async function init() {
  wireStaticControls();
  wireChipDelegation();
  renderStructureChecks();
  renderMetaQuick();
  renderTagInsertOptions();

  try {
    const health = await fetchJSON("/api/health");
    state.models = health.models;
    renderModelSelect();
    setKeyStatus(health.apiKeyConfigured);
  } catch {
    setKeyStatus(false, true);
  }

  try {
    state.skills = await fetchJSON("/api/skills");
    renderSkillsBar();
  } catch (err) {
    $("skillsBar").textContent = `Could not load skills: ${err.message}`;
  }

  try {
    const genres = await fetchJSON("/api/genres");
    const dl = $("genreList");
    dl.innerHTML = genres.map((g) => `<option value="${escapeAttr(g)}"></option>`).join("");
  } catch {
    /* genre autocomplete is a nice-to-have; ignore failures */
  }
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  return res.json();
}

function setKeyStatus(ok, checkFailed = false) {
  const el = $("keyStatus");
  if (checkFailed) {
    el.textContent = "server unreachable";
    el.className = "key-status bad";
    return;
  }
  el.textContent = ok ? "API key configured" : "API key missing — see webapp/.env.example";
  el.className = "key-status " + (ok ? "ok" : "bad");
}

/* ---------------- static field wiring ---------------- */

function wireStaticControls() {
  $("stylesInput").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addFromInput(e.target, state.styles, renderStylesChips);
  });

  $("metaTagInput").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const val = e.target.value.trim();
    if (val) {
      val.split(",").map((s) => s.trim()).filter(Boolean).forEach((t) => state.metaTags.add(t));
      e.target.value = "";
      renderMetaTagChips();
      renderMetaQuick();
    }
  });

  $("bpm").addEventListener("change", () => {
    const bpm = Number($("bpm").value);
    const tempoSelect = $("tempo");
    if (!bpm || tempoSelect.value) return;
    if (bpm < 80) tempoSelect.value = "Ballad / Slow (60–80)";
    else if (bpm < 110) tempoSelect.value = "Mid-tempo (80–110)";
    else if (bpm < 140) tempoSelect.value = "Uptempo (110–140)";
    else tempoSelect.value = "Fast / High-Energy (140+)";
  });

  [["energy", "energyVal", ["Calm / Sparse", "Mid-Energy", "High-Energy / Intense"]],
   ["mood", "moodVal", ["Light / Uplifting", "Balanced", "Dark / Heavy"]],
   ["complexity", "complexityVal", ["Simple / Plainspoken", "Moderate", "Dense / Literary"]],
   ["explicit", "explicitVal", ["Clean", "Mild", "Explicit allowed"]]]
    .forEach(([inputId, labelId, labels]) => {
      const input = $(inputId);
      const label = $(labelId);
      const update = () => { label.textContent = scaleLabel(input.value, labels); };
      input.addEventListener("input", update);
      update();
    });

  $("insertTagBtn").addEventListener("click", () => {
    const tag = $("tagInsertSelect").value;
    if (!tag) return;
    insertAtCursor($("lyricsEditor"), `[${tag}]\n`);
    updateLyricsCount();
  });

  $("copyLyricsBtn").addEventListener("click", () => copyText($("lyricsEditor").value));
  $("clearLyricsBtn").addEventListener("click", () => {
    if ($("lyricsEditor").value.trim() && !confirm("Clear all lyrics in the editor?")) return;
    $("lyricsEditor").value = "";
    updateLyricsCount();
  });
  $("lyricsEditor").addEventListener("input", updateLyricsCount);

  $("copyReportBtn").addEventListener("click", () => copyText($("reportOutput").innerText));
  $("copySunoBtn").addEventListener("click", () => copyText($("sunoOutput").innerText));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

function addFromInput(inputEl, arr, renderFn) {
  const val = inputEl.value.trim();
  if (!val) return;
  val.split(",").map((s) => s.trim()).filter(Boolean).forEach((v) => {
    if (!arr.includes(v)) arr.push(v);
  });
  inputEl.value = "";
  renderFn();
}

// Chips and quick-add tags are rendered as plain HTML with data-* attributes
// and handled via a single delegated listener (wireChipDelegation) below —
// values can contain quotes/apostrophes (freeform genre/style text), so
// building onclick="fn('...')" strings is not safe here.

function renderStylesChips() {
  $("stylesChips").innerHTML = state.styles
    .map((s, i) => chipHTML(s, { action: "remove-style", index: i }))
    .join("");
}

function renderMetaTagChips() {
  const custom = [...state.metaTags].filter((t) => !META_TAG_QUICK.includes(t));
  $("metaTagChips").innerHTML = custom
    .map((t) => chipHTML(t, { action: "remove-meta", value: t }))
    .join("");
}

function chipHTML(label, dataset) {
  const attrs = Object.entries(dataset).map(([k, v]) => `data-${k}="${escapeAttr(v)}"`).join(" ");
  return `<span class="chip">${escapeHTML(label)}<button ${attrs} title="Remove">✕</button></span>`;
}

function renderMetaQuick() {
  $("metaTagQuick").innerHTML = META_TAG_QUICK.map((tag) => {
    const selected = state.metaTags.has(tag);
    return `<span class="chip quick-add${selected ? " selected" : ""}" data-action="toggle-meta" data-value="${escapeAttr(tag)}">${escapeHTML(tag)}</span>`;
  }).join("");
}

function wireChipDelegation() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, value, index } = el.dataset;
    if (action === "remove-style") {
      state.styles.splice(Number(index), 1);
      renderStylesChips();
    } else if (action === "remove-meta") {
      state.metaTags.delete(value);
      renderMetaTagChips();
      renderMetaQuick();
    } else if (action === "toggle-meta") {
      if (state.metaTags.has(value)) state.metaTags.delete(value); else state.metaTags.add(value);
      renderMetaQuick();
      renderMetaTagChips();
    } else if (action === "run-skill") {
      runSkill(el.dataset.skillId);
    }
  });
}

function renderStructureChecks() {
  $("structureChecks").innerHTML = STRUCTURE_OPTIONS.map((s, i) => `
    <label><input type="checkbox" data-structure value="${escapeAttr(s)}" id="struct-${i}" />${escapeHTML(s)}</label>
  `).join("");
}

function renderTagInsertOptions() {
  const all = [...STRUCTURE_OPTIONS, ...META_TAG_QUICK];
  $("tagInsertSelect").innerHTML = `<option value="">Choose a tag…</option>` +
    all.map((t) => `<option value="${escapeAttr(t)}">${escapeHTML(t)}</option>`).join("");
}

function renderModelSelect() {
  const sel = $("modelSelect");
  sel.innerHTML = Object.entries(state.models)
    .map(([id, m]) => `<option value="${escapeAttr(id)}">${escapeHTML(m.label)}</option>`)
    .join("");
  sel.addEventListener("change", updateEffortAvailability);
  updateEffortAvailability();
}

function updateEffortAvailability() {
  const model = state.models[$("modelSelect").value];
  $("effortSelect").disabled = !(model && model.effort);
}

/* ---------------- skills bar ---------------- */

const CATEGORY_TITLES = { write: "Write", check: "Check", prompt: "Suno Prompt", plan: "Plan" };

function renderSkillsBar() {
  const groups = {};
  state.skills.forEach((s) => { (groups[s.category] ??= []).push(s); });

  $("skillsBar").innerHTML = Object.entries(groups).map(([cat, skills]) => `
    <div class="skill-group">
      <div class="skill-group-title">${CATEGORY_TITLES[cat] || cat}</div>
      <div class="skill-buttons">
        ${skills.map((s) => `
          <button class="skill-btn" id="skillbtn-${s.id}" title="${escapeAttr(s.description)}" data-action="run-skill" data-skill-id="${escapeAttr(s.id)}">
            <span>${s.icon || ""}</span><span>${escapeHTML(s.label)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");
}

/* ---------------- field collection ---------------- */

function collectFields() {
  const structure = [...document.querySelectorAll("[data-structure]:checked")].map((el) => el.value);
  return {
    artist: $("artist").value.trim(),
    project: $("project").value.trim(),
    songTitle: $("songTitle").value.trim(),
    genre: $("genre").value.trim(),
    styles: state.styles,
    lyricsStyle: $("lyricsStyle").value,
    pov: $("pov").value,
    tense: $("tense").value,
    bpm: $("bpm").value,
    tempo: $("tempo").value,
    structure,
    metaTags: [...state.metaTags],
    energy: $("energy").value,
    mood: $("mood").value,
    complexity: $("complexity").value,
    explicit: $("explicit").value,
    concept: $("concept").value,
  };
}

/* ---------------- generation ---------------- */

let thinkingBuffer = "";

async function runSkill(skillId) {
  if (state.running) return;
  const skill = state.skills.find((s) => s.id === skillId);
  if (!skill) return;

  const lyrics = $("lyricsEditor").value;
  if (skill.requiresLyrics && !lyrics.trim()) {
    setGenStatus(`"${skill.label}" needs lyrics in the editor first.`, true);
    return;
  }

  const body = {
    skillId,
    model: $("modelSelect").value,
    effort: $("effortSelect").value,
    fields: collectFields(),
    lyrics,
  };

  setRunning(true, skillId);
  setGenStatus(`Running ${skill.label}…`);
  thinkingBuffer = "";
  $("thinkingOutput").textContent = "";

  let reportBuffer = "";
  const target = skill.outputTarget;
  if (target === "lyrics") {
    $("lyricsEditor").value = "";
  } else if (target === "report") {
    $("reportOutput").textContent = "";
    switchTab("report");
  } else if (target === "suno") {
    $("sunoOutput").textContent = "";
    switchTab("suno");
  }

  const startedAt = Date.now();
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }

    await readSSE(res, {
      text: (data) => {
        if (target === "lyrics") {
          $("lyricsEditor").value += data.text;
          updateLyricsCount();
          $("lyricsEditor").scrollTop = $("lyricsEditor").scrollHeight;
        } else {
          reportBuffer += data.text;
          const el = target === "suno" ? $("sunoOutput") : $("reportOutput");
          el.textContent = reportBuffer;
        }
      },
      thinking: (data) => {
        thinkingBuffer += data.text;
        const el = $("thinkingOutput");
        el.textContent = thinkingBuffer;
        el.scrollTop = el.scrollHeight;
      },
      done: (data) => {
        if (target !== "lyrics") {
          const el = target === "suno" ? $("sunoOutput") : $("reportOutput");
          el.innerHTML = mdToHtml(reportBuffer);
        }
        const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
        const usage = data.usage || {};
        setGenStatus(
          `Done in ${secs}s — ${usage.output_tokens ?? "?"} tokens out, ${usage.input_tokens ?? "?"} in (${data.stopReason || "end_turn"})`
        );
        addLog(skill.label, body.model, `${usage.output_tokens ?? "?"} out / ${usage.input_tokens ?? "?"} in · ${secs}s · ${data.stopReason || "end_turn"}`, false);
      },
      error: (data) => {
        setGenStatus(`Error: ${data.message}`, true);
        addLog(skill.label, body.model, data.message, true);
      },
    });
  } catch (err) {
    setGenStatus(`Error: ${err.message}`, true);
    addLog(skill.label, body.model, err.message, true);
  } finally {
    setRunning(false, skillId);
  }
}
async function readSSE(response, handlers) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const rawEvent = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const eventMatch = rawEvent.match(/^event:\s*(.+)$/m);
      const dataMatch = rawEvent.match(/^data:\s*(.+)$/m);
      if (eventMatch && dataMatch) {
        let data;
        try { data = JSON.parse(dataMatch[1]); } catch { data = {}; }
        handlers[eventMatch[1].trim()]?.(data);
      }
    }
  }
}

function setRunning(running, activeId) {
  state.running = running;
  document.querySelectorAll(".skill-btn").forEach((btn) => {
    btn.disabled = running;
    btn.classList.toggle("running", running && btn.id === `skillbtn-${activeId}`);
  });
}

function setGenStatus(text, isError = false) {
  const el = $("genStatus");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function addLog(skillLabel, model, meta, isErr) {
  const li = document.createElement("li");
  if (isErr) li.classList.add("err");
  const time = new Date().toLocaleTimeString();
  li.innerHTML = `<span class="log-skill">${escapeHTML(skillLabel)}</span> · ${escapeHTML(model)}<span class="log-meta">${time} — ${escapeHTML(meta)}</span>`;
  $("logList").prepend(li);
}

/* ---------------- lyrics editor helpers ---------------- */

function updateLyricsCount() {
  const val = $("lyricsEditor").value;
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;
  $("lyricsCount").textContent = `${words} words · ${val.length} chars`;
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const pos = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(pos, pos);
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

/* ---------------- tabs ---------------- */

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
}

/* ---------------- tiny markdown renderer ---------------- */

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = false;
  let tableBuf = [];

  const flushList = () => { if (inList) { html += "</ul>"; inList = false; } };
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.filter((r) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r));
    html += "<table>" + rows.map((r, i) => {
      const cells = r.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      const tag = i === 0 ? "th" : "td";
      return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
    }).join("") + "</table>";
    tableBuf = [];
  };
  const inline = (s) => escapeHTML(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) { flushList(); tableBuf.push(line); continue; }
    flushTable();
    if (/^### /.test(line)) { flushList(); html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    if (/^## /.test(line)) { flushList(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
    if (/^[-*] /.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }
    flushList();
    if (/^\d+\.\s/.test(line)) { html += `<div>${inline(line)}</div>`; continue; }
    if (line.trim() === "") { html += ""; continue; }
    html += `<p>${inline(line)}</p>`;
  }
  flushList();
  flushTable();
  return html || "<em>(empty response)</em>";
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHTML(s); }

init();
