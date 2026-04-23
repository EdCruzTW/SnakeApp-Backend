const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const defaultDbPath = path.join(rootDir, "db", "snake.db");
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : defaultDbPath;

const backupDir = process.env.DB_BACKUP_DIR
  ? path.resolve(process.env.DB_BACKUP_DIR)
  : path.join(rootDir, "backups");

if (!fs.existsSync(dbPath)) {
  console.error("❌ No existe la base de datos en:", dbPath);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date()
  .toISOString()
  .replace(/:/g, "-")
  .replace(/\.\d{3}Z$/, "Z");

const backupPath = path.join(backupDir, `snake-${timestamp}.db`);
fs.copyFileSync(dbPath, backupPath);

console.log("✅ Backup creado:", backupPath);
