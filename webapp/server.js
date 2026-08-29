import app from "./app.js";

const PORT = process.env.PORT || 4173;

app.listen(PORT, () => {
  console.log(`bitwize-music lyrics dashboard running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY is not set — generation endpoints will return an error until it is configured (see .env.example).");
  }
});
