import fs from "fs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";
import { createObjectCsvWriter } from "csv-writer";
import { faker } from "@faker-js/faker";

export interface JSONOptions {
  path: string;
  pretty?: boolean;
  data?: Record<string, any>; // optional input JSON
}

export interface PDFOptions {
  path: string;
  title?: string;
  fontSize?: number;
  lines: number;
  texts?: string[]; // optional array of text lines
}

export interface TXTOptions {
  path: string;
  lines: number;
  texts?: string[];
}

export interface DOCXOptions {
  path: string;
  lines: number;
  texts?: string[]; // optional array of lines
}

export interface SlideOptions {
  lines: number;
  texts?: string[];
}
export interface PPTXOptions {
  path: string;
  slides: Record<string, SlideOptions>; // map of slide name -> options
}

export interface SheetOptions {
  rows: number;
  texts?: string[][]; // each row = array of cell values
}
export interface XLSXOptions {
  path: string;
  sheets: Record<string, SheetOptions>; // sheet name -> options
}

export interface CSVOptions {
  path: string;
  rows?: number;              // number of generated rows (only if data not provided)
  data?: Record<string, any>[]; // optional array of records
}

/** ---- Implementations ---- **/

export async function generateJSON(options: JSONOptions): Promise<void> {
  const { path, pretty = true, data } = options;

  // Use provided `data` if available, otherwise generate dummy data
  const finalData = data ?? {
    name: faker.person.fullName(),
    email: faker.internet.email(),
  };

  fs.writeFileSync(
      path,
      JSON.stringify(finalData, null, pretty ? 2 : 0)
  );
}

export async function generatePDF(options: PDFOptions): Promise<void> {
  const {
    path,
    title = "Fake PDF",
    fontSize = 20,
    lines,
    texts = []
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(path);

      doc.pipe(stream);
      doc.fontSize(fontSize).text(title).moveDown();

      // Prepare content lines
      let content: string[] = [];

      if (!texts || texts.length === 0) {
        // Generate faker data if texts not provided
        for (let i = 0; i < lines; i++) {
          content.push(faker.lorem.sentence());
        }
      } else {
        // Fill lines by reusing texts (wraparound)
        for (let i = 0; i < lines; i++) {
          content.push(texts[i % texts.length]);
        }
      }

      // Write content
      content.forEach(line => {
        doc.text(line);
      });

      doc.end();

      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateTXT(options: TXTOptions): Promise<void> {
  const { path, lines, texts = [] } = options;

  let content: string[] = [];

  if (!texts || texts.length === 0) {
    // no texts provided → generate with faker
    for (let i = 0; i < lines; i++) {
      content.push(faker.lorem.sentence());
    }
  } else {
    // loop through provided texts (wraparound)
    for (let i = 0; i < lines; i++) {
      content.push(texts[i % texts.length]);
    }
  }

  // Join with double newlines for readability
  fs.writeFileSync(path, content.join("\n\n"), "utf-8");
}

export async function generateDOCX(options: DOCXOptions): Promise<void> {
  const { path, lines, texts = [] } = options;

  // Prepare content lines
  let content: string[] = [];

  if (!texts || texts.length === 0) {
    // If no texts, generate fake content
    for (let i = 0; i < lines; i++) {
      content.push(faker.lorem.sentence());
    }
  } else {
    // Loop through provided texts
    for (let i = 0; i < lines; i++) {
      content.push(texts[i % texts.length]);
    }
  }

  // Create DOCX structure
  const doc = new Document({
    sections: [
      {
        children: content.map(
            (t) =>
                new Paragraph({
                  children: [new TextRun(t)],
                })
        ),
      },
    ],
  });

  // Write to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path, buffer);
}

export async function generatePPTX(options: PPTXOptions): Promise<void> {
  const { path, slides } = options;

  const pptx = new PptxGenJS();

  // Iterate over each slide entry
  for (const [slideTitle, slideOpts] of Object.entries(slides)) {
    const { lines, texts = [] } = slideOpts;

    // Prepare content
    let content: string[] = [];
    if (!texts || texts.length === 0) {
      for (let i = 0; i < lines; i++) {
        content.push(faker.lorem.sentence());
      }
    } else {
      for (let i = 0; i < lines; i++) {
        content.push(texts[i % texts.length]);
      }
    }

    // Create slide
    const slide = pptx.addSlide();

    // Slide title
    slide.addText(slideTitle, { x: 0.5, y: 0.5, fontSize: 24, bold: true });

    // Add text lines
    slide.addText(content.join("\n"), {
      x: 0.5,
      y: 1.5,
      fontSize: 16,
      color: "363636",
    });
  }

  // Save the file
  await pptx.writeFile({ fileName: path });
}

export async function generateXLSX(options: XLSXOptions): Promise<void> {
  const { path, sheets } = options;

  const workbook = new ExcelJS.Workbook();

  for (const [sheetName, sheetOpts] of Object.entries(sheets)) {
    const { rows, texts = [] } = sheetOpts;
    const worksheet = workbook.addWorksheet(sheetName);

    // Optional header row
    worksheet.addRow(["Name", "Email"]);

    for (let i = 0; i < rows; i++) {
      let rowData: string[];

      if (!texts || texts.length === 0) {
        // Generate fake row with faker
        rowData = [faker.person.fullName(), faker.internet.email()];
      } else {
        // Cycle through provided rows
        rowData = texts[i % texts.length];
      }

      worksheet.addRow(rowData);
    }
  }

  await workbook.xlsx.writeFile(path);
}

export async function generateCSV(options: CSVOptions): Promise<void> {
  const { path, rows = 5, data } = options;

  let records: Record<string, any>[];

  if (data && data.length > 0) {
    // Validate all records have the same keys
    const keys = Object.keys(data[0]);
    for (const record of data) {
      const recordKeys = Object.keys(record);
      if (
          recordKeys.length !== keys.length ||
          !recordKeys.every(k => keys.includes(k))
      ) {
        throw new Error("All records must have the same keys and key count");
      }
    }
    records = data;
  } else {
    // Generate fake records
    records = Array.from({ length: rows }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
    }));
  }

  // Build CSV header dynamically
  const header = Object.keys(records[0]).map(key => ({
    id: key,
    title: key,
  }));

  const writer = createObjectCsvWriter({
    path,
    header,
  });

  await writer.writeRecords(records);
}
