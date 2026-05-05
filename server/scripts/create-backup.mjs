import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFile = path.resolve(__dirname, "../data/questions.json");
const backupsDir = path.resolve(__dirname, "../data/backups");

try {
  await fs.mkdir(backupsDir, { recursive: true });
  const raw = await fs.readFile(dataFile, "utf-8");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.resolve(backupsDir, `questions-${timestamp}.json`);
  await fs.writeFile(backupFile, raw, "utf-8");
  console.log(`Backup created: ${backupFile}`);
} catch (err) {
  console.error("Error creating backup:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
