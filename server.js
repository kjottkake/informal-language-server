const express = require('express'); //server operations
const bodyParser = require('body-parser'); //parses body for stuff
const axios = require('axios'); //requests
const PDFDocument = require('pdfkit'); //library to generate pdfs
const fs = require('fs'); //gets file input



const app = express();
const PORT = 3000;

const vocabObj = {};

app.use(bodyParser.json());

// Your words storage logic remains the same
app.use(express.static('public'));

// Route to generate PDF
app.get('/generate-pdf', (req, res) => {
    const pdf = new PDFDocument();
    let filename = 'vocabularylist';
    // Setting response to stream back the pdf
    filename = encodeURIComponent(filename) + '.pdf';
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');
    
    const wordsList = req.body.words; // Assuming words are sent in the request body
    
    pdf.fontSize(12);
    for (const original in vocabObj) {
      if (vocabObj.hasOwnProperty(original)) {
        const translation = vocabObj[original];
        // Format: "Original word - Translation"
        pdf.text(`${original} - ${translation}`, {
          paragraphGap: 5,
          indent: 20,
          align: 'left',
          continued: false,
        }).moveDown(0.5);
      }
    }
  
    pdf.pipe(res);
    pdf.end();
  });

app.post('/translateWord', async (req, res) => {
    const word = req.body.word;

    try {
        const response = await axios.post("http://localhost:5000/translate", {
            q: word,
            source: "nb",
            target: "en",
            format: "text",
            api_key: ""
        }, {
            headers: { "Content-Type": "application/json" }
        });

        const translatedText = response.data.translatedText + " "; // Adds space
        
        // Add to object and array logic remains the same
        addWord(word, translatedText);
        console.log("words object: ", vocabObj);
        // Respond to the client
        res.json({ message: "Word translated and added.", word, translatedText });

    } catch (error) {
        console.error('Error during translation:', error);
        res.status(500).send('Translation failed.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//function for adding word to individual list
function addWord(original, translation){
    vocabObj[original] = translation;
}
