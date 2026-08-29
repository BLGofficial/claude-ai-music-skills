function scaleLabel(value, labels) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const idx = v < 34 ? 0 : v < 67 ? 1 : 2;
  return `${labels[idx]} (${v}/100)`;
}

function listOrNone(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(", ") : "(none specified)";
}

/** Build the "## Song / Project Parameters" markdown block from dashboard field values. */
export function buildParameterBlock(fields = {}) {
  const {
    artist,
    project,
    songTitle,
    genre,
    styles,
    lyricsStyle,
    pov,
    tense,
    bpm,
    tempo,
    structure,
    metaTags,
    energy,
    mood,
    complexity,
    explicit,
  } = fields;

  const lines = [
    "## Song / Project Parameters",
    `- Artist: ${artist || "(unspecified)"}`,
    `- Album / Project: ${project || "(unspecified)"}`,
    `- Track Title: ${songTitle || "(unspecified)"}`,
    `- Genre: ${genre || "(unspecified)"}`,
    `- Styles / Sub-genres: ${listOrNone(styles)}`,
    `- Lyrics Style: ${lyricsStyle || "(unspecified)"}`,
    `- POV: ${pov || "(unspecified)"}  |  Tense: ${tense || "(unspecified)"}`,
    `- BPM: ${bpm || "(unspecified)"}  |  Tempo feel: ${tempo || "(unspecified)"}`,
    `- Requested Song Structure: ${listOrNone(structure)}`,
    `- Requested Meta Tags: ${listOrNone(metaTags)}`,
    `- Energy: ${scaleLabel(energy, ["Calm / Sparse", "Mid-Energy", "High-Energy / Intense"])}`,
    `- Mood: ${scaleLabel(mood, ["Light / Uplifting", "Balanced", "Dark / Heavy"])}`,
    `- Vocabulary Complexity: ${scaleLabel(complexity, ["Simple / Plainspoken", "Moderate", "Dense / Literary"])}`,
    `- Explicit Content: ${scaleLabel(explicit, ["Clean", "Mild", "Explicit allowed"])}`,
  ];
  return lines.join("\n");
}

export function buildConceptBlock(concept) {
  return `## Concept / Direction\n${concept && concept.trim() ? concept.trim() : "(no concept notes provided — use the parameters above and your own judgment)"}`;
}

export function buildLyricsBlock(lyrics) {
  return `## Existing Lyrics\n${
    lyrics && lyrics.trim() ? "```\n" + lyrics.trim() + "\n```" : "(none yet)"
  }`;
}

export function buildGenreReferenceBlock(excerpt) {
  if (!excerpt) return null;
  return `## Genre Reference Notes (from the project's genre library, for calibration only)\n${excerpt}`;
}
