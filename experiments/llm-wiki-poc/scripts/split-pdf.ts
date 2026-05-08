/**
 * Split a PDF: extract a page range into a new PDF.
 *
 * Usage:
 *   npx tsx scripts/split-pdf.ts sources-raw/big.pdf 1 15 sources-raw/big-pages-1-15.pdf
 */

import '../lib/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: npx tsx scripts/split-pdf.ts <input.pdf> <fromPage> <toPage> <output.pdf>');
  process.exit(1);
}

const inputPath = path.resolve(args[0]!);
const from = Number(args[1]);
const to = Number(args[2]);
const outputPath = path.resolve(args[3]!);

if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
  console.error('页码非法：from / to 必须为正整数且 from <= to');
  process.exit(1);
}

main().catch((err) => {
  console.error('[split-pdf] 失败：', err.message);
  process.exit(1);
});

async function main() {
  console.log(`[split-pdf] in:  ${inputPath}`);
  console.log(`[split-pdf] out: ${outputPath} (pages ${from}-${to})`);

  const inputBytes = await fs.readFile(inputPath);
  const inputDoc = await PDFDocument.load(inputBytes);
  const totalPages = inputDoc.getPageCount();
  console.log(`[split-pdf] 输入：${totalPages} 页`);

  if (to > totalPages) {
    throw new Error(`to=${to} 超出 PDF 总页数 ${totalPages}`);
  }

  const outDoc = await PDFDocument.create();
  const indices = [];
  for (let i = from - 1; i <= to - 1; i++) {
    indices.push(i);
  }
  const copied = await outDoc.copyPages(inputDoc, indices);
  for (const p of copied) outDoc.addPage(p);

  const outBytes = await outDoc.save();
  await fs.writeFile(outputPath, outBytes);
  const sizeMB = outBytes.byteLength / (1024 * 1024);
  console.log(`[split-pdf] 完成：${indices.length} 页, ${sizeMB.toFixed(2)} MB`);
}
