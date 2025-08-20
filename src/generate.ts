import fs from "fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import {
    generateJSON,
    generatePDF,
    generateTXT,
    generateDOCX,
    generatePPTX,
    generateXLSX,
    generateCSV,
} from "./generators/doc_generators.js";

import { generateMP4 } from "./generators/video_generator.js";
import { generateMP3, generateWAV } from "./generators/audio_generator.js";
import { generateImage, generateJPG, generatePNG } from "./generators/image_generator.js";
import { generateZIP, generateRAR } from "./generators/archive_generator.js";

// Simple typed helpers
type PlainObject = Record<string, any>;

// Utility: user-friendly error printer
function error(msg: string, cause?: unknown) {
    console.error(`[file-fabric] ERROR: ${msg}`);
    if (cause instanceof Error && cause.stack) {
        // Provide concise cause first, stack after to aid debugging
        console.error(`Cause: ${cause.message}`);
        // Uncomment stack if desired:
        // console.error(cause.stack);
    }
}

// Utility: info logger
function info(msg: string) {
    console.log(`[file-fabric] ${msg}`);
}

// Validate that a value is a non-empty string
function expectString(v: any, where: string): string {
    if (typeof v !== "string" || v.trim() === "") {
        throw new Error(`${where} must be a non-empty string`);
    }
    return v;
}

// Validate that a value is a positive integer
function expectPositiveInt(v: any, where: string): number {
    if (!Number.isFinite(v) || v <= 0 || Math.floor(v) !== v) {
        throw new Error(`${where} must be a positive integer`);
    }
    return v as number;
}

// Validate that value is a non-negative number (for durations where 0 not allowed we use positive int)
function expectPositiveNumber(v: any, where: string): number {
    if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`${where} must be a positive number`);
    }
    return v as number;
}

// Validate boolean
function expectBoolean(v: any, where: string): boolean {
    if (typeof v !== "boolean") throw new Error(`${where} must be a boolean`);
    return v;
}

// Ensure directory exists
function ensureDirFor(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
}

// Load YAML file
function loadYaml(filePath: string): PlainObject {
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const doc = yaml.load(raw);
        if (!doc || typeof doc !== "object") {
            throw new Error("YAML root must be a mapping (object).");
        }
        return doc as PlainObject;
    } catch (e) {
        throw new Error(`Failed to read/parse YAML: ${filePath}. ${e instanceof Error ? e.message : String(e)}`);
    }
}

// Handlers for each top-level key

async function handleJSON(cfg: any) {
    // Supports single object or array of objects
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `json[${idx}].path`);
            const pretty = item.pretty === undefined ? true : expectBoolean(item.pretty, `json[${idx}].pretty`);
            const data = item.data && typeof item.data === "object" ? item.data : item.data === undefined ? undefined : (() => { throw new Error(`json[${idx}].data must be an object`); })();

            ensureDirFor(outPath);
            await generateJSON({ path: outPath, pretty, data });
            info(`Generated JSON → ${outPath}`);
        } catch (e) {
            error(`JSON generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handlePDF(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `pdf[${idx}].path`);
            const title = item.title === undefined ? undefined : expectString(item.title, `pdf[${idx}].title`);
            const fontSize = item.fontSize === undefined ? undefined : expectPositiveInt(item.fontSize, `pdf[${idx}].fontSize`);
            const lines = expectPositiveInt(item.lines, `pdf[${idx}].lines`);
            const texts = item.texts === undefined ? undefined :
                (Array.isArray(item.texts) && item.texts.every((t: any) => typeof t === "string"))
                    ? item.texts
                    : (() => { throw new Error(`pdf[${idx}].texts must be an array of strings`); })();

            ensureDirFor(outPath);
            await generatePDF({ path: outPath, title, fontSize, lines, texts });
            info(`Generated PDF → ${outPath}`);
        } catch (e) {
            error(`PDF generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handleTXT(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `txt[${idx}].path`);
            const lines = expectPositiveInt(item.lines, `txt[${idx}].lines`);
            const texts = item.texts === undefined ? undefined :
                (Array.isArray(item.texts) && item.texts.every((t: any) => typeof t === "string"))
                    ? item.texts
                    : (() => { throw new Error(`txt[${idx}].texts must be an array of strings`); })();

            ensureDirFor(outPath);
            await generateTXT({ path: outPath, lines, texts });
            info(`Generated TXT → ${outPath}`);
        } catch (e) {
            error(`TXT generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handleDOCX(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `docx[${idx}].path`);
            const lines = expectPositiveInt(item.lines, `docx[${idx}].lines`);
            const texts = item.texts === undefined ? undefined :
                (Array.isArray(item.texts) && item.texts.every((t: any) => typeof t === "string"))
                    ? item.texts
                    : (() => { throw new Error(`docx[${idx}].texts must be an array of strings`); })();

            ensureDirFor(outPath);
            await generateDOCX({ path: outPath, lines, texts });
            info(`Generated DOCX → ${outPath}`);
        } catch (e) {
            error(`DOCX generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handlePPTX(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `pptx[${idx}].path`);
            const slides = item.slides;
            if (!slides || typeof slides !== "object") {
                throw new Error(`pptx[${idx}].slides must be an object of { [slideTitle]: { lines: number; texts?: string[] } }`);
            }
            // Validate each slide
            for (const [key, val] of Object.entries(slides as PlainObject)) {
                if (!val || typeof val !== "object") {
                    throw new Error(`pptx[${idx}].slides["${key}"] must be an object`);
                }
                expectPositiveInt((val as any).lines, `pptx[${idx}].slides["${key}"].lines`);
                const texts = (val as any).texts;
                if (texts !== undefined) {
                    if (!Array.isArray(texts) || !texts.every((t: any) => typeof t === "string")) {
                        throw new Error(`pptx[${idx}].slides["${key}"].texts must be an array of strings`);
                    }
                }
            }

            ensureDirFor(outPath);
            await generatePPTX({ path: outPath, slides });
            info(`Generated PPTX → ${outPath}`);
        } catch (e) {
            error(`PPTX generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handleXLSX(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `xlsx[${idx}].path`);
            const sheets = item.sheets;
            if (!sheets || typeof sheets !== "object") {
                throw new Error(`xlsx[${idx}].sheets must be an object of { [sheetName]: { rows: number; texts?: string[][] } }`);
            }
            for (const [sheetName, sheetOpts] of Object.entries(sheets as PlainObject)) {
                if (!sheetOpts || typeof sheetOpts !== "object") {
                    throw new Error(`xlsx[${idx}].sheets["${sheetName}"] must be an object`);
                }
                expectPositiveInt((sheetOpts as any).rows, `xlsx[${idx}].sheets["${sheetName}"].rows`);
                const texts = (sheetOpts as any).texts;
                if (texts !== undefined) {
                    if (!Array.isArray(texts) || !texts.every((row: any) => Array.isArray(row))) {
                        throw new Error(`xlsx[${idx}].sheets["${sheetName}"].texts must be string[][]`);
                    }
                }
            }

            ensureDirFor(outPath);
            await generateXLSX({ path: outPath, sheets });
            info(`Generated XLSX → ${outPath}`);
        } catch (e) {
            error(`XLSX generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handleCSV(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `csv[${idx}].path`);
            const rows = item.rows === undefined ? undefined : expectPositiveInt(item.rows, `csv[${idx}].rows`);
            const data = item.data === undefined ? undefined : (
                Array.isArray(item.data) && item.data.every((r: any) => r && typeof r === "object")
                    ? item.data
                    : (() => { throw new Error(`csv[${idx}].data must be an array of objects`); })()
            );
            // If both rows and data are provided, prefer data but warn.
            if (rows !== undefined && data !== undefined) {
                info(`csv[${idx}]: 'data' provided, 'rows' will be ignored.`);
            }

            ensureDirFor(outPath);
            await generateCSV({ path: outPath, rows, data });
            info(`Generated CSV → ${outPath}`);
        } catch (e) {
            error(`CSV generation failed at index ${idx}`, e);
            throw e;
        }
    }
}

async function handleImages(cfg: any) {
    // Supports conveniences:
    // - jpg: [{ path }, ...] or { path }
    // - png: [{ path }, ...] or { path }
    // - custom: [{ path, create, output }, ...]
    if (cfg.jpg) {
        const items = Array.isArray(cfg.jpg) ? cfg.jpg : [cfg.jpg];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `images.jpg[${idx}].path`);
                ensureDirFor(outPath);
                await generateJPG(outPath);
                info(`Generated JPG → ${outPath}`);
            } catch (e) {
                error(`JPG generation failed at index ${idx}`, e);
                throw e;
            }
        }
    }
    if (cfg.png) {
        const items = Array.isArray(cfg.png) ? cfg.png : [cfg.png];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `images.png[${idx}].path`);
                ensureDirFor(outPath);
                await generatePNG(outPath);
                info(`Generated PNG → ${outPath}`);
            } catch (e) {
                error(`PNG generation failed at index ${idx}`, e);
                throw e;
            }
        }
    }
    if (cfg.custom) {
        const items = Array.isArray(cfg.custom) ? cfg.custom : [cfg.custom];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `images.custom[${idx}].path`);
                const create = item.create;
                const output = item.output;
                if (!create || typeof create !== "object") throw new Error(`images.custom[${idx}].create must be an object`);
                if (!output || typeof output !== "object") throw new Error(`images.custom[${idx}].output must be an object`);

                expectPositiveInt(create.width, `images.custom[${idx}].create.width`);
                expectPositiveInt(create.height, `images.custom[${idx}].create.height`);
                // channels/background are validated by sharp; we allow pass-through

                const format = output.format;
                if (typeof format !== "string") throw new Error(`images.custom[${idx}].output.format must be a string`);
                const allowed = ["jpeg", "png", "webp", "avif", "tiff", "gif", "heif"];
                if (!allowed.includes(format)) {
                    throw new Error(`images.custom[${idx}].output.format must be one of ${allowed.join(", ")}`);
                }

                ensureDirFor(outPath);
                await generateImage(outPath, create, output);
                info(`Generated image (${format}) → ${outPath}`);
            } catch (e) {
                error(`Custom image generation failed at index ${idx}`, e);
                throw e;
            }
        }
    }
}

async function handleAudio(cfg: any) {
    if (cfg.wav) {
        const items = Array.isArray(cfg.wav) ? cfg.wav : [cfg.wav];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `audio.wav[${idx}].path`);
                const lengthSeconds = expectPositiveNumber(item.lengthSeconds, `audio.wav[${idx}].lengthSeconds`);
                const opts = item.opts && typeof item.opts === "object" ? item.opts : undefined;
                ensureDirFor(outPath);
                await generateWAV(outPath, lengthSeconds, opts);
                info(`Generated WAV → ${outPath}`);
            } catch (e) {
                error(`WAV generation failed at index ${idx}`, e);
                throw e;
            }
        }
    }
    if (cfg.mp3) {
        const items = Array.isArray(cfg.mp3) ? cfg.mp3 : [cfg.mp3];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `audio.mp3[${idx}].path`);
                const lengthSeconds = expectPositiveNumber(item.lengthSeconds, `audio.mp3[${idx}].lengthSeconds`);
                const opts = item.opts && typeof item.opts === "object" ? item.opts : undefined;
                ensureDirFor(outPath);
                await generateMP3(outPath, lengthSeconds, opts);
                info(`Generated MP3 → ${outPath}`);
            } catch (e) {
                error(`MP3 generation failed at index ${idx}`, e);
                error(`Hint: MP3 requires ffmpeg (provided via ffmpeg-static on supported platforms).`);
                throw e;
            }
        }
    }
}

async function handleVideo(cfg: any) {
    const items = Array.isArray(cfg) ? cfg : [cfg];
    for (const [idx, item] of items.entries()) {
        try {
            const outPath = expectString(item.path, `video[${idx}].path`);
            const opts: any = {};
            if (item.duration !== undefined) opts.duration = expectPositiveNumber(item.duration, `video[${idx}].duration`);
            if (item.resolution !== undefined) {
                const res = expectString(item.resolution, `video[${idx}].resolution`);
                if (!/^\d+x\d+$/.test(res)) throw new Error(`video[${idx}].resolution must be "WIDTHxHEIGHT"`);
                opts.resolution = res;
            }
            if (item.fps !== undefined) opts.fps = expectPositiveNumber(item.fps, `video[${idx}].fps`);
            if (item.background !== undefined) opts.background = expectString(item.background, `video[${idx}].background`);
            if (item.crf !== undefined) {
                const crf = expectPositiveNumber(item.crf, `video[${idx}].crf`);
                if (crf < 0 || crf > 51) throw new Error(`video[${idx}].crf must be within [0,51]`);
                opts.crf = crf;
            }
            if (item.pixelFormat !== undefined) {
                const pf = expectString(item.pixelFormat, `video[${idx}].pixelFormat`);
                const allowed = ["yuv420p", "yuv422p", "yuv444p"];
                if (!allowed.includes(pf)) throw new Error(`video[${idx}].pixelFormat must be one of ${allowed.join(", ")}`);
                opts.pixelFormat = pf;
            }
            if (item.preset !== undefined) {
                const preset = expectString(item.preset, `video[${idx}].preset`);
                const allowed = ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"];
                if (!allowed.includes(preset)) throw new Error(`video[${idx}].preset must be one of ${allowed.join(", ")}`);
                opts.preset = preset;
            }
            if (item.silentAudio !== undefined) opts.silentAudio = expectBoolean(item.silentAudio, `video[${idx}].silentAudio`);

            ensureDirFor(outPath);
            await generateMP4(outPath, opts);
            info(`Generated MP4 → ${outPath}`);
        } catch (e) {
            error(`Video generation failed at index ${idx}`, e);
            error(`Hint: MP4 requires ffmpeg (provided via ffmpeg-static on supported platforms).`);
            throw e;
        }
    }
}

async function handleArchives(cfg: any) {
    if (cfg.zip) {
        const items = Array.isArray(cfg.zip) ? cfg.zip : [cfg.zip];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `archives.zip[${idx}].path`);
                const files = Array.isArray(item.files) && item.files.every((f: any) => typeof f === "string")
                    ? item.files
                    : (() => { throw new Error(`archives.zip[${idx}].files must be an array of file paths`); })();
                ensureDirFor(outPath);
                await generateZIP(outPath, files);
                info(`Generated ZIP → ${outPath}`);
            } catch (e) {
                error(`ZIP generation failed at index ${idx}`, e);
                throw e;
            }
        }
    }
    if (cfg.rar) {
        const items = Array.isArray(cfg.rar) ? cfg.rar : [cfg.rar];
        for (const [idx, item] of items.entries()) {
            try {
                const outPath = expectString(item.path, `archives.rar[${idx}].path`);
                const files = Array.isArray(item.files) && item.files.every((f: any) => typeof f === "string")
                    ? item.files
                    : (() => { throw new Error(`archives.rar[${idx}].files must be an array of file paths`); })();
                const rarPath = item.rarPath === undefined ? "rar" : expectString(item.rarPath, `archives.rar[${idx}].rarPath`);
                ensureDirFor(outPath);
                await generateRAR(outPath, files, rarPath);
                info(`Generated RAR → ${outPath}`);
            } catch (e) {
                error(`RAR generation failed at index ${idx}`, e);
                error(`Hint: RAR requires a system 'rar' CLI installed and accessible in PATH or via 'rarPath'.`);
                throw e;
            }
        }
    }
}

// Orchestrator
async function runFromConfig(configPath: string) {
    const cfg = loadYaml(configPath);

    // Process each known top-level key if present.
    // Top-level keys:
    // json, pdf, txt, docx, pptx, xlsx, csv, images, audio, video, archives
    try {
        if (cfg.outputDir && typeof cfg.outputDir === "string" && cfg.outputDir.trim() !== "") {
            fs.mkdirSync(cfg.outputDir, { recursive: true });
            info(`Ensured outputDir: ${cfg.outputDir}`);
        }

        if (cfg.json) await handleJSON(cfg.json);
        if (cfg.pdf) await handlePDF(cfg.pdf);
        if (cfg.txt) await handleTXT(cfg.txt);
        if (cfg.docx) await handleDOCX(cfg.docx);
        if (cfg.pptx) await handlePPTX(cfg.pptx);
        if (cfg.xlsx) await handleXLSX(cfg.xlsx);
        if (cfg.csv) await handleCSV(cfg.csv);

        if (cfg.images) await handleImages(cfg.images);
        if (cfg.audio) await handleAudio(cfg.audio);
        if (cfg.video) await handleVideo(cfg.video);
        if (cfg.archives) await handleArchives(cfg.archives);

        info("Done.");
    } catch (e) {
        // Errors are already logged; just rethrow to set exit code
        throw e;
    }
}

// Entry point
(async function main() {
    try {
        const arg = process.argv[2];
        if (!arg) {
            console.error("Usage: ts-node generator_from_yaml.ts path/to/config.yml");
            console.error("   or: node dist/generator_from_yaml.js path/to/config.yml");
            process.exit(2);
        }
        const configPath = path.resolve(process.cwd(), arg);
        if (!fs.existsSync(configPath)) {
            error(`Config file not found: ${configPath}`);
            process.exit(2);
        }
        await runFromConfig(configPath);
    } catch (e) {
        // Final guard: return non-zero code
        process.exit(1);
    }
})();
