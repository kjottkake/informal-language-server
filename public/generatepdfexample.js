//test file that creates a pdf

const wordsArray = ['apple', 'banana', 'cherry'];

const PDFDocument = require('pdfkit');

const fs = require('fs');

const doc = new PDFDocument();

// Pipe its output somewhere, like to a file or HTTP response
doc.pipe(fs.createWriteStream('output.pdf'));

// Add the words to the document
wordsArray.forEach(word => {
  doc.text(word);
});

// Finalize the PDF and end the stream
doc.end();