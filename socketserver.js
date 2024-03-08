const express = require('express'); //server operations
const bodyParser = require('body-parser'); //parses body for stuff
const axios = require('axios'); //requests
const PDFDocument = require('pdfkit'); //library to generate pdfs
const fs = require('fs'); //gets file input
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


io.on('connection', (socket) => {
  console.log('a user connected');


  socket.on('disconnect', ()=> {
    console.log('User disconnected');
  })
  
  // Listen for 'add-word' event from clients
  socket.on('add-word', (data) => {
      console.log('Word received from socket: ', data);
      // Broadcast the word to all other clients
      socket.broadcast.emit('word-added', data);
  });

  
});

const PORT = 3002;

const vocabObj = {};

app.use(bodyParser.json());



// // Your words storage logic remains the same
app.use(express.static('public'));


// Dynamic namespace creation endpoint
app.get('/create-namespace', (req, res) => {
  const namespace = `/namespace-${Math.random().toString(36).substring(2, 7)}`;
  const nsp = io.of(namespace);
  nsp.on('connection', (socket) => {
    console.log(`someone connected to ${namespace}`);
    socket.emit('message', `Welcome to ${namespace}`);
  });
  // Respond with the created namespace
  res.json({ namespace });
});


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

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//function for adding word to individual list
function addWord(original, translation){
    vocabObj[original] = translation;
}
