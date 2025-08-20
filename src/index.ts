import { generateJSON, generatePDF, generateTXT, generateDOCX, generatePPTX, generateXLSX, generateCSV } from "./generators/doc_generators.js";
import { generateMP4 } from "./generators/video_generator.js";
import { generateMP3, generateWAV } from "./generators/audio_generator.js";
import { generateJPG, generatePNG } from "./generators/image_generator.js";
import { generateZIP, generateRAR } from "./generators/archive_generator.js";
import fs from "fs";

async function main() {
  fs.mkdirSync("output", { recursive: true });

  await generateJSON({
    path: "custom.json",
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
      "Team": { lines: 4 }, // faker-generated filler
      "Summary": { lines: 5, texts: ["Point A", "Point B"] },
    }
  });
  await generateXLSX({
    path: "output/sample.xlsx",
    sheets: {
      "Employees": {
        rows: 5, // faker-generated rows
      },
      "CustomData": {
        rows: 6,
        texts: [
          ["Alice", "alice@example.com"],
          ["Bob", "bob@example.com"],
        ], // will loop ["Alice", "Bob"] until 6 rows filled
      },
    },
  });
  await generateCSV({
    path: "output/sample.csv",
    data: [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" }
    ]
  });

  await generateJPG("output/sample.jpg");
  await generatePNG("output/sample.png");
  await generateWAV("output/sample.wav", 1);
  await generateMP3("output/sample.mp3", 2);
  await generateMP4("output/sample.mp4");

  await generateZIP("output/sample.zip", [
    "output/sample.json",
    "output/sample.pdf"
  ]);

  // Uncomment if RAR available in system
  // await generateRAR("output/sample.rar", ["output/sample.json", "output/sample.pdf"]);

  console.log("All files generated in ./output/");
}

main().catch(console.error);
