import fs from "fs";
import path from "node:path";
import archiver from "archiver";
import { spawn } from "node:child_process";

export async function generateZIP(outPath: string, files: string[]) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", reject);

    archive.pipe(output);

    for (const f of files) {
      // Use the base filename in the archive; customize "name" if you want folders
      archive.file(f, { name: path.basename(f) });
    }

    archive.finalize().catch(reject);
  });
}

export async function generateRAR(outPath: string, files: string[], rarPath = "rar") {
  return new Promise<void>((resolve, reject) => {
    // args: a = add; -ep1 preserve relative paths; -r recurse (optional)
    const args = ["a", outPath, ...files];
    const child = spawn(rarPath, args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`rar exited with code ${code}`));
    });
  });
}
