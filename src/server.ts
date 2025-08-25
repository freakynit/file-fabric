import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

import {
    generateJSON, generatePDF, generateTXT, generateDOCX,
    generatePPTX, generateXLSX, generateCSV
} from "./generators/doc_generators.js";
import { generateImage, generateJPG, generatePNG } from "./generators/image_generator.js";
import { generateWAV, generateMP3 } from "./generators/audio_generator.js";
import { generateMP4 } from "./generators/video_generator.js";
import { generateZIP, generateRAR } from "./generators/archive_generator.js";

const base = "/api/v1";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "file-fabric"));

type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "tiff" | "gif" | "heif";
const mimeTypes: Record<ImageFormat, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    tiff: "image/tiff",
    gif: "image/gif",
    heif: "image/heif",
};

const app = express();
app.use(express.json({ limit: "2mb" }));

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}


function tmpFile(ext: string): string {
    return path.join(tempDir, `${crypto.randomUUID()}.${ext}`);
}

function sendFileAndCleanup(res: Response, filePath: string, downloadName: string, next: NextFunction) {
    const filename = downloadName ?? path.basename(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.sendFile(filePath, (err) => {
        // cleanup
        try {
            fs.unlinkSync(filePath);
        } catch {
            // ignore cleanup errors
        }

        if (err) {
            // If headers are already sent, delegate, so express can terminate properly. Don’t write more bytes.
            if (res.headersSent) {
                return next(err);
            } else {
                return next(err); // else, let it fallback to our central error handler
            }
        }
    });
}

// ==== Validation helpers ====
function expectString(v: any, where: string): string {
    if (typeof v !== "string" || v.trim() === "") throw badRequest(`${where} must be a non-empty string`);
    return v;
}
function expectPositiveInt(v: any, where: string): number {
    if (!Number.isFinite(v) || v <= 0 || Math.floor(v) !== v) throw badRequest(`${where} must be a positive integer`);
    return v as number;
}
function expectPositiveNumber(v: any, where: string): number {
    if (!Number.isFinite(v) || v <= 0) throw badRequest(`${where} must be a positive number`);
    return v as number;
}
function expectBoolean(v: any, where: string): boolean {
    if (typeof v !== "boolean") throw badRequest(`${where} must be a boolean`);
    return v;
}
function badRequest(message: string) {
    const err: any = new Error(message);
    err.status = 400;
    return err;
}

// ================ ROUTES ================

// Documents
app.post(`${base}/json`, asyncHandler(async (req, res, next) => {
    const pretty = req.body.pretty === undefined ? true : expectBoolean(req.body.pretty, "pretty");
    const data = req.body.data && typeof req.body.data === "object"
        ? req.body.data
        : req.body.data === undefined ? undefined : (() => { throw badRequest("data must be an object"); })();
    const out = tmpFile("json");
    await generateJSON({ path: out, pretty, data });
    res.type("application/json");
    sendFileAndCleanup(res, out, "file.json", next);
}));

app.post(`${base}/pdf`, asyncHandler(async (req, res, next) => {
    const title = req.body.title === undefined ? undefined : expectString(req.body.title, "title");
    const fontSize = req.body.fontSize === undefined ? undefined : expectPositiveInt(req.body.fontSize, "fontSize");
    const lines = expectPositiveInt(req.body.lines, "lines");
    const texts = req.body.texts === undefined ? undefined :
        (Array.isArray(req.body.texts) && req.body.texts.every((t: any) => typeof t === "string")) ? req.body.texts :
            (() => { throw badRequest("texts must be an array of strings"); })();
    const out = tmpFile("pdf");
    await generatePDF({ path: out, title, fontSize, lines, texts });
    res.type("application/pdf");
    sendFileAndCleanup(res, out, "file.pdf", next);
}));

app.post(`${base}/txt`, asyncHandler(async (req, res, next) => {
    const lines = expectPositiveInt(req.body.lines, "lines");
    const texts = req.body.texts === undefined ? undefined :
        (Array.isArray(req.body.texts) && req.body.texts.every((t: any) => typeof t === "string")) ? req.body.texts :
            (() => { throw badRequest("texts must be an array of strings"); })();
    const out = tmpFile("txt");
    await generateTXT({ path: out, lines, texts });
    res.type("text/plain; charset=utf-8");
    sendFileAndCleanup(res, out, "file.txt", next);
}));

app.post(`${base}/docx`, asyncHandler(async (req, res, next) => {
    const lines = expectPositiveInt(req.body.lines, "lines");
    const texts = req.body.texts === undefined ? undefined :
        (Array.isArray(req.body.texts) && req.body.texts.every((t: any) => typeof t === "string")) ? req.body.texts :
            (() => { throw badRequest("texts must be an array of strings"); })();
    const out = tmpFile("docx");
    await generateDOCX({ path: out, lines, texts });
    res.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    sendFileAndCleanup(res, out, "file.docx", next);
}));

app.post(`${base}/pptx`, asyncHandler(async (req, res, next) => {
    const slides = req.body.slides;
    if (!slides || typeof slides !== "object") throw badRequest("slides must be an object of { [title]: { lines, texts? } }");
    for (const [title, val] of Object.entries(slides)) {
        if (!val || typeof val !== "object") throw badRequest(`slides["${title}"] must be an object`);
        expectPositiveInt((val as any).lines, `slides["${title}"].lines`);
        const t = (val as any).texts;
        if (t !== undefined) {
            if (!Array.isArray(t) || !t.every((x: any) => typeof x === "string")) throw badRequest(`slides["${title}"].texts must be an array of strings`);
        }
    }
    const out = tmpFile("pptx");
    await generatePPTX({ path: out, slides });
    res.type("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    sendFileAndCleanup(res, out, "file.pptx", next);
}));

app.post(`${base}/xlsx`, asyncHandler(async (req, res, next) => {
    const sheets = req.body.sheets;
    if (!sheets || typeof sheets !== "object") throw badRequest("sheets must be an object of { [name]: { rows, texts? } }");
    for (const [name, opts] of Object.entries(sheets)) {
        if (!opts || typeof opts !== "object") throw badRequest(`sheets["${name}"] must be an object`);
        expectPositiveInt((opts as any).rows, `sheets["${name}"].rows`);
        const texts = (opts as any).texts;
        if (texts !== undefined) {
            if (!Array.isArray(texts) || !texts.every((row: any) => Array.isArray(row))) {
                throw badRequest(`sheets["${name}"].texts must be string[][]`);
            }
        }
    }
    const out = tmpFile("xlsx");
    await generateXLSX({ path: out, sheets });
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    sendFileAndCleanup(res, out, "file.xlsx", next);
}));

app.post(`${base}/csv`, asyncHandler(async (req, res, next) => {
    const rows = req.body.rows === undefined ? undefined : expectPositiveInt(req.body.rows, "rows");
    const data = req.body.data === undefined ? undefined :
        (Array.isArray(req.body.data) && req.body.data.every((r: any) => r && typeof r === "object")) ? req.body.data :
            (() => { throw badRequest("data must be an array of objects"); })();
    const out = tmpFile("csv");
    await generateCSV({ path: out, rows, data });
    res.type("text/csv; charset=utf-8");
    sendFileAndCleanup(res, out, "file.csv", next);
}));

// Images
app.post(`${base}/images/jpg`, asyncHandler(async (_req, res, next) => {
    const out = tmpFile("jpg");
    await generateJPG(out);
    res.type("image/jpeg");
    sendFileAndCleanup(res, out, "image.jpg", next);
}));

app.post(`${base}/images/png`, asyncHandler(async (_req, res, next) => {
    const out = tmpFile("png");
    await generatePNG(out);
    res.type("image/png");
    sendFileAndCleanup(res, out, "image.png", next);
}));

app.post(`${base}/images/custom`, asyncHandler(async (req, res, next) => {
    const create = req.body.create;
    const output = req.body.output;
    if (!create || typeof create !== "object") throw badRequest("create must be an object { width, height, channels?, background? }");
    if (!output || typeof output !== "object") throw badRequest("output must be an object { format, options? }");
    expectPositiveInt(create.width, "create.width");
    expectPositiveInt(create.height, "create.height");
    if (typeof output.format !== "string") throw badRequest("output.format must be a string");
    const allowed = ["jpeg","png","webp","avif","tiff","gif","heif"];
    if (!allowed.includes(output.format)) throw badRequest(`output.format must be one of ${allowed.join(", ")}`);
    const ext = output.format === "jpeg" ? "jpg" : output.format;
    const out = tmpFile(ext);
    await generateImage(out, create, output);
    res.type(mimeTypes[output.format as ImageFormat] || "application/octet-stream");
    sendFileAndCleanup(res, out, `image.${ext}`, next);
}));

// Audio
app.post(`${base}/audio/wav`, asyncHandler(async (req, res, next) => {
    const lengthSeconds = expectPositiveNumber(req.body.lengthSeconds, "lengthSeconds");
    const opts = req.body.opts && typeof req.body.opts === "object" ? req.body.opts : undefined;
    const out = tmpFile("wav");
    await generateWAV(out, lengthSeconds, opts);
    res.type("audio/wav");
    sendFileAndCleanup(res, out, "audio.wav", next);
}));

app.post(`${base}/audio/mp3`, asyncHandler(async (req, res, next) => {
    const lengthSeconds = expectPositiveNumber(req.body.lengthSeconds, "lengthSeconds");
    const opts = req.body.opts && typeof req.body.opts === "object" ? req.body.opts : undefined;
    const out = tmpFile("mp3");
    await generateMP3(out, lengthSeconds, opts);
    res.type("audio/mpeg");
    sendFileAndCleanup(res, out, "audio.mp3", next);
}));

// Video
app.post(`${base}/video/mp4`, asyncHandler(async (req, res, next) => {
    const opts: any = {};
    if (req.body.duration !== undefined) opts.duration = expectPositiveNumber(req.body.duration, "duration");
    if (req.body.resolution !== undefined) {
        const reso = expectString(req.body.resolution, "resolution");
        if (!/^\d+x\d+$/.test(reso)) throw badRequest('resolution must be "WIDTHxHEIGHT"');
        opts.resolution = reso;
    }
    if (req.body.fps !== undefined) opts.fps = expectPositiveNumber(req.body.fps, "fps");
    if (req.body.background !== undefined) opts.background = expectString(req.body.background, "background");
    if (req.body.crf !== undefined) {
        const crf = expectPositiveNumber(req.body.crf, "crf");
        if (crf < 0 || crf > 51) throw badRequest("crf must be within [0,51]");
        opts.crf = crf;
    }
    if (req.body.pixelFormat !== undefined) {
        const pf = expectString(req.body.pixelFormat, "pixelFormat");
        const allowed = ["yuv420p","yuv422p","yuv444p"];
        if (!allowed.includes(pf)) throw badRequest(`pixelFormat must be one of ${allowed.join(", ")}`);
        opts.pixelFormat = pf;
    }
    if (req.body.preset !== undefined) {
        const preset = expectString(req.body.preset, "preset");
        const allowed = ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"];
        if (!allowed.includes(preset)) throw badRequest(`preset must be one of ${allowed.join(", ")}`);
        opts.preset = preset;
    }
    if (req.body.silentAudio !== undefined) opts.silentAudio = expectBoolean(req.body.silentAudio, "silentAudio");
    const out = tmpFile("mp4");
    await generateMP4(out, opts);
    res.type("video/mp4");
    sendFileAndCleanup(res, out, "video.mp4", next);
}));

// Archives
app.post(`${base}/archives/zip`, asyncHandler(async (req, res, next) => {
    const files = Array.isArray(req.body.files) && req.body.files.every((f: any) => typeof f === "string")
        ? req.body.files : (() => { throw badRequest("files must be an array of file paths"); })();
    for (const f of files) {
        if (!fs.existsSync(f)) throw badRequest(`file not found: ${f}`);
    }
    const out = tmpFile("zip");
    await generateZIP(out, files);
    res.type("application/zip");
    sendFileAndCleanup(res, out, "files.zip", next);
}));

app.post(`${base}/archives/rar`, asyncHandler(async (req, res, next) => {
    const files = Array.isArray(req.body.files) && req.body.files.every((f: any) => typeof f === "string")
        ? req.body.files : (() => { throw badRequest("files must be an array of file paths"); })();
    for (const f of files) {
        if (!fs.existsSync(f)) throw badRequest(`file not found: ${f}`);
    }
    console.log(`Just after error thrown in /rar`);
    const rarPath = req.body.rarPath === undefined ? "rar" : expectString(req.body.rarPath, "rarPath");
    const out = tmpFile("rar");
    await generateRAR(out, files, rarPath);
    res.type("application/vnd.rar");
    sendFileAndCleanup(res, out, "files.rar", next);
}));

// Health
app.get(`${base}/health`, (_req, res) => {
    res.json({ status: "ok" });
});

// Central Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.log(`Central error handler`, err);

    const status = Number.isInteger(err.status) ? err.status : 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) {
        res.status(status).json({ error: message, status });
    }
});

// Start
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
    console.log(`[file-fabric] API listening on http://localhost:${port}${base}`);
});
