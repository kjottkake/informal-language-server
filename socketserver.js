//SERVER CODE
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
const path = require('path');

const PORT = 3002;
const vocabObj = {};
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (room) => { //establishing connection with room
    socket.join(room);  //estbalishing connection with room
  });   //establishing connection with room
  
  socket.on('add-word', (data) => {
    console.log('Word received from socket: ', data);
    addWord(data.room, data.word, data.translation);
    // Retrieve the word, its translation, color, and size from vocabObj
    const { translation, color, size } = vocabObj[data.room][data.word];
    // Emit the event with all data, ensuring consistency across clients
    io.in(data.room).emit('word-added', { word: data.word, translation, color, size, room: data.room });
  });


  socket.on('disconnect', ()=> { //when a user disconnects, do this. 
    console.log('User disconnected');
  })

});

app.get('/create-namespace', (req, res) => {
  const namespaceId = Math.random().toString(36).substring(2, 7);
  const namespace = `/namespace-${namespaceId}`;
  const nsp = io.of(namespace);
  nsp.on('connection', (socket) => {
    console.log(`someone connected to ${namespace}`);
    socket.emit('message', `Room code: ${namespace}`);
  });
  // Respond with the simpler URL format
  res.json({ namespaceUrl: `http://localhost:3002/room/${namespaceId}` });
});



app.get('/room/:namespace', (req, res) => {
  const namespace = req.params.namespace; // Extract the namespace from the URL path
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});


app.get('/generate-pdf', (req, res) => {
  const roomId = req.query.room; // Assume that the room ID is passed as a query parameter
  const pdf = new PDFDocument();
  let filename = 'vocabularylist';

  filename = encodeURIComponent(filename) + '.pdf';
  res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Content-type', 'application/pdf');
  
  const wordsList = vocabObj[roomId] || {}; // Get words for the specific room or an empty object if none
  
  pdf.fontSize(12);
  for (const original in wordsList) {
      const translation = wordsList[original].translation;
      pdf.text(`${original} - ${translation}`, {
        paragraphGap: 5,
        indent: 20,
        align: 'left',
        continued: false,
      }).moveDown(0.5);
  }
  pdf.pipe(res);
  pdf.end();
});


app.post('/translateWord', async (req, res) => {
  const word = req.body.word;
  const roomId = req.body.roomId; // Get roomId from the request body

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
      
      addWord(roomId, word, translatedText); // Pass roomId to addWord
      console.log("words object: ", vocabObj);
      // Respond to the client
      res.json({ message: "Word translated and added.", roomId, word, translatedText });

  } catch (error) {
      console.error('Error during translation:', error);
      res.status(500).send('Translation failed.');
  }
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

function addWord(roomId, original, translation) {
  if (!vocabObj[roomId]) {
    vocabObj[roomId] = {}; // Initialize the object for the room if it doesn't exist
  }
  if (!vocabObj[roomId][original]) { // Check if the word is already added
    const color = getRandomColor();
    const size = getRandomSize();
    vocabObj[roomId][original] = { translation, color, size }; // Store translation, color, and size
  }
}


function getRandomColor() {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return `#${randomColor}`;
}

function getRandomSize() {
  const minSize = 64;
  const maxSize = 128;
  return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}
