# File-Fabric

A tiny, pragmatic toolkit written in typescript to generate realistic “dummy” files for demos, tests, CI fixtures, and seeding workflows. It can produce common `document`, `spreadsheet`, `slide`, `image`, `audio`, `video`, and `archive` formats with sensible defaults and optional customization.

## Why file-fabric?

When building SaaS prototypes, demos, or automated tests, it’s often useful to quickly generate a variety of file types with predictable contents and sizes. File-fabric gives simple API's and configuration to generate:

- Documents: JSON, PDF, TXT, DOCX
- Slides & Sheets: PPTX, XLSX, CSV
- Media: JPG/PNG images, WAV/MP3 audio, MP4 video
- Archives: ZIP (RAR optional if installed)

All generators have safe defaults and accept options to control count, text, duration, dimensions, etc.

## Quick start

Prerequisites:
- Node.js 18+ recommended
- For audio/video:
  - ffmpeg is bundled via ffmpeg-static
- For images:
  - Uses sharp (prebuilt binaries are typically installed automatically for common platforms)
- For archives:
  - ZIP works out of the box via archiver
  - RAR requires a system rar binary if you want to use it

Install dependencies in your project and run your script (see examples below).

## Project structure (key files)

- index.ts: Sample script invoking all generators and writing outputs to ./output (see [index.ts](src/index.ts))
- generate.ts: Runs generations from generation spec yaml (see [Config.yaml](Config.yaml)) 
- generators/doc_generators.ts: JSON, PDF, TXT, DOCX, PPTX, XLSX, CSV
- generators/image_generator.ts: Unified image generator plus JPEG/PNG helpers (sharp)
- generators/audio_generator.ts: WAV (pure PCM via wavefile) and MP3 (via ffmpeg)
- generators/video_generator.ts: MP4 video from a color source, optional silent audio (ffmpeg)
- generators/archive_generator.ts: ZIP (archiver) and RAR (external rar CLI)

Note: Your file paths may differ slightly if transpiled to .js.

## Usage

Here’s a minimal end-to-end example similar to index.ts that writes a variety of files into ./output:

```ts
import fs from "fs";
import {
  generateJSON, generatePDF, generateTXT, generateDOCX,
  generatePPTX, generateXLSX, generateCSV
} from "./generators/doc_generators.js";
import { generateMP4 } from "./generators/video_generator.js";
import { generateMP3, generateWAV } from "./generators/audio_generator.js";
import { generateJPG, generatePNG } from "./generators/image_generator.js";
import { generateZIP, /* generateRAR */ } from "./generators/archive_generator.js";

async function main() {
  fs.mkdirSync("output", { recursive: true });

  await generateJSON({
    path: "output/custom.json",
    data: { company: "MyStartup", active: true }
  });

  await generatePDF({
    path: "output/sample.pdf",
    title: "Demo Document",
    fontSize: 16,
    lines: 10,
    texts: ["This is line 1", "This is line 2"]
  });

  await generateTXT({
    path: "output/sample.txt",
    lines: 5,
    texts: ["This is line 1", "This is line 2"]
  });

  await generateDOCX({
    path: "output/sample.docx",
    lines: 10,
    texts: ["This is line 1", "This is line 2"]
  });

  await generatePPTX({
    path: "output/sample.pptx",
    slides: {
      "Intro": { lines: 3, texts: ["Welcome", "Agenda", "Notes"] },
      "Team": { lines: 4 },           // faker-generated filler
      "Summary": { lines: 5, texts: ["Point A", "Point B"] },
    },
  });

  await generateXLSX({
    path: "output/sample.xlsx",
    sheets: {
      "Employees": { rows: 5 }, // faker-generated rows
      "CustomData": {
        rows: 6,
        texts: [
          ["Alice", "alice@example.com"],
          ["Bob", "bob@example.com"],
        ], // values will loop until rows filled
      },
    },
  });

  await generateCSV({
    path: "output/sample.csv",
    data: [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob",   email: "bob@example.com"  },
    ],
  });

  await generateJPG("output/sample.jpg");
  await generatePNG("output/sample.png");

  await generateWAV("output/sample.wav", 1);   // 1s of tone by default
  await generateMP3("output/sample.mp3", 2);   // 2s MP3 via ffmpeg

  await generateMP4("output/sample.mp4");      // 1s 1280x720 black, H.264

  await generateZIP("output/sample.zip", [
    "output/custom.json",
    "output/sample.pdf",
  ]);

  // If you have a `rar` CLI installed on your system, you can enable:
  // await generateRAR("output/sample.rar", [
  //   "output/custom.json",
  //   "output/sample.pdf",
  // ]);

  console.log("All files generated in ./output/");
}

main().catch(console.error);
```

## YAML-driven generation

- Generate multiple files declaratively via a single YAML config.

- Create a YAML file (e.g., config.yaml, see one in already in this repo) with top-level keys: `json`, `pdf`, `txt`, `docx`, `pptx`, `xlsx`, `csv`, `images`, `audio`, `video`, `archives`. Each section accepts a single object or an array of objects. See examples in this section.

- Run:
  - Directly: `npm run dev:yaml -- config.yaml`
  - Building and then running: `npm run build && node dist/generate.js config.yaml`

- Optional: outputDir at the root ensures that directory exists before processing.

Schema overview

- json: { path, pretty?, data? } | Array

- pdf: { path, title?, fontSize?, lines, texts? } | Array

- txt: { path, lines, texts? } | Array

- docx: { path, lines, texts? } | Array

- pptx: { path, slides: { [title]: { lines, texts? } } } | Array

- xlsx: { path, sheets: { [name]: { rows, texts? (string[][]) } } } | Array

- csv: { path, rows?, data? } | Array (if both present, data wins)

- images:
  - jpg: { path } | Array
  - png: { path } | Array
  - custom: { path, create: { width, height, channels?, background? }, output: { format, options? } } | Array

- audio:
  - wav: { path, lengthSeconds, opts? } | Array
  - mp3: { path, lengthSeconds, opts? } | Array

- video: { path, duration?, resolution?, fps?, background?, crf?, pixelFormat?, preset?, silentAudio? } | Array

- archives:
  - zip: { path, files[] } | Array
  - rar: { path, files[], rarPath? } | Array (requires system rar CLI)

Validation and errors

- The script performs strict validation and prints user-readable errors indicating the failing section/index and field name (e.g., pdf.lines must be a positive integer).

- It creates parent directories automatically.

- It exits with a non-zero code on any failure.

Platform notes

- MP3/MP4 generation needs ffmpeg. The project uses ffmpeg-static to provide a bundled binary on supported platforms; otherwise ensure ffmpeg is in PATH.

- RAR archives require a system rar CLI; set rarPath if not in PATH.

Example

- Include the sample YAML from above.

## API reference

Types below show the shape of options each generator accepts. Many functions auto-generate contents via faker when texts/data are not provided.

### Documents

- generateJSON(options)
  - path: string
  - pretty?: boolean (default true)
  - data?: Record
  - Behavior: If data is omitted, generates a simple object with faker.

- generatePDF(options)
  - path: string
  - title?: string (default "Fake PDF")
  - fontSize?: number (default 20)
  - lines: number
  - texts?: string[]
  - Behavior: Writes title, then lines of text. If texts is omitted/empty, uses faker.

- generateTXT(options)
  - path: string
  - lines: number
  - texts?: string[]
  - Behavior: Writes lines separated by blank lines. Uses faker if texts omitted.

- generateDOCX(options)
  - path: string
  - lines: number
  - texts?: string[]
  - Behavior: Adds paragraphs for each line; faker if texts omitted.

- generatePPTX(options)
  - path: string
  - slides: Record
  - Behavior: One slide per key. Title = key; content from texts or faker.

- generateXLSX(options)
  - path: string
  - sheets: Record
  - Behavior: Adds a header row ["Name","Email"], then either faker rows or cycles provided texts rows.

- generateCSV(options)
  - path: string
  - rows?: number (default 5; only used if data is not provided)
  - data?: Record[]
  - Behavior: If data provided, validates consistent keys and writes as CSV; otherwise generates faker rows with name/email.

### Images

- generateImage(path, create, output)
  - create: { width: number; height: number; channels?: 1|2|3|4; background?: sharp.Color }
  - output: { format: "jpeg"|"png"|"webp"|"avif"|"tiff"|"gif"|"heif"; options?: sharp.Options }
  - Behavior: Uses sharp create to write a flat color image.

- generateJPG(path)
  - 300x200 red JPEG convenience wrapper.

- generatePNG(path)
  - 300x200 green PNG convenience wrapper.

### Audio

- generateWAV(path, lengthSeconds, opts?)
  - opts: {
    sampleRate?: number (default 44100)
    bitDepth?: 16|24|32 (default 16)
    toneHz?: number (default 440Hz if noise not set)
    noise?: "white" (overrides tone when set)
    amplitude?: number (0..1, default 0.9)
    }
  - Behavior: Generates mono PCM; either sine tone or white noise. Writes synchronously.

- generateMP3(path, lengthSeconds, opts?)
  - Same opts as WAV; first renders WAV, then transcodes to MP3 via ffmpeg.

Notes:
- Input validation ensures positive lengthSeconds.
- For WAV tone generation, phase is managed for numerical stability.

### Video

- generateMP4(path, opts?)
  - opts: {
    duration?: number (default 1)
    resolution?: string "WIDTHxHEIGHT" (default "1280x720")
    fps?: number (default 30)
    background?: string (ffmpeg color e.g., "black", "white", "red", "0xRRGGBB")
    crf?: number 0..51 (default 23; lower is higher quality)
    pixelFormat?: "yuv420p"|"yuv422p"|"yuv444p" (default "yuv420p")
    preset?: "ultrafast"|"superfast"|"veryfast"|"faster"|"fast"|"medium"|"slow"|"slower"|"veryslow" (default "medium")
    silentAudio?: boolean (default true)
    }
  - Behavior: Uses ffmpeg color source; adds silent AAC audio when silentAudio is true to maximize player compatibility; writes H.264 MP4 with +faststart.

### Archives

- generateZIP(outPath, files)
  - files: string[]
  - Behavior: Adds each provided file by base name to a ZIP with compression level 9.

- generateRAR(outPath, files, rarPath = "rar")
  - Requires system rar CLI.
  - Behavior: Spawns rar a outPath ...files; rejects if exit code != 0.

## Common recipes

- Bigger files for load tests:
  - PDF/TXT: increase lines
  - DOCX/PPTX/XLSX: increase lines/rows
  - Audio/Video: increase lengthSeconds/duration
  - Images: increase width/height
- Deterministic content:
  - Pass explicit texts/data instead of relying on faker
- Silent video with audio track:
  - Leave silentAudio: true in generateMP4 to avoid playback quirks

## Error handling and caveats

- Most generators validate critical inputs (e.g., positive durations).
- Some filesystem writes are synchronous (e.g., WAV); if needed, adapt to async for high-throughput scenarios.
- RAR generation depends on an external rar binary; not bundled.
- PNG/JPEG creation requires sharp; ensure installation succeeds on the target OS/arch.
- ffmpeg path is configured from ffmpeg-static; if undefined for your platform, ensure ffmpeg is in PATH.

## Development

- TypeScript sources under generators/*.ts
- Uses:
  - pdfkit for PDF
  - docx for DOCX
  - pptxgenjs for PPTX
  - exceljs for XLSX
  - csv-writer for CSV
  - sharp for images
  - wavefile for WAV
  - fluent-ffmpeg + ffmpeg-static for MP3/MP4
  - archiver for ZIP

## Contributing

Issues and PRs are welcome. Please:
- Keep APIs minimal and consistent with existing option shapes
- Add/extend input validation where appropriate
- Include small, focused examples and notes for cross-platform behavior

## License

MIT — see [LICENSE](LICENSE)

## Acknowledgements

This project stands on the shoulders of fantastic OSS libraries: pdfkit, docx, pptxgenjs, exceljs, csv-writer, sharp, wavefile, fluent-ffmpeg, ffmpeg-static, and archiver.
