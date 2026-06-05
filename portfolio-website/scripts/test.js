import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
console.log("pdfParseModule type:", typeof pdfParseModule);
console.log("pdfParseModule properties:", Object.keys(pdfParseModule));
console.log("pdfParseModule:", pdfParseModule);
