#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const serverPath = join(projectRoot, "src", "server-stdio.ts");

// Try to use local tsx first, then fall back to npx tsx
const tsxPath = join(projectRoot, "node_modules", ".bin", "tsx");

const child = spawn(
  "node",
  [tsxPath, serverPath],
  {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  }
);

child.on("error", (error) => {
  // Fallback to npx if local tsx not found
  if (error.code === "ENOENT") {
    const npxChild = spawn("npx", ["-y", "tsx", serverPath], {
      stdio: "inherit",
      cwd: projectRoot,
      env: process.env,
    });
    
    npxChild.on("error", (npxError) => {
      console.error("Failed to start server:", npxError);
      process.exit(1);
    });
    
    npxChild.on("exit", (code) => {
      process.exit(code || 0);
    });
  } else {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
});

child.on("exit", (code) => {
  process.exit(code || 0);
});

