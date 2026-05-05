import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsDir = path.resolve(__dirname, "../data/backups");
const dataFile = path.resolve(__dirname, "../data/questions.json");

try {
  // ensure backups dir exists
  try {
    await fs.access(backupsDir);
  } catch (accessErr) {
    console.error("No backups directory found at:", backupsDir);
    process.exitCode = 1;
    process.exit(1);
  }

  const files = await fs.readdir(backupsDir);
  const backups = files.filter((f) => f.startsWith("questions-") && f.endsWith(".json")).sort();
  if (backups.length === 0) {
    console.error("No backups found in", backupsDir);
    process.exitCode = 1;
    process.exit(1);
  }

  const latest = backups[backups.length - 1];
  const src = path.resolve(backupsDir, latest);
  await fs.copyFile(src, dataFile);
  console.log(`Restored ${latest} -> ${dataFile}`);
} catch (err) {
  console.error("Error restoring latest backup:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
  process.exit(1);
}
