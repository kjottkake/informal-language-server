//SERVER CODE
const express = require('express'); //server operations
require('dotenv').config();
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

const { MongoClient } = require('mongodb');
const mongoURI = process.env.MONGO_URI
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
  }
}

connectDB();


// data for adding a roomcounter in the db when a room is created. Needs some work
const db = client.db("ordcafe");
const roomsCountCollection = db.collection('roomsCount');
roomsCountCollection.insertOne({ totalRooms: 0 });



io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (room) => {
    socket.join(room);
    const db = client.db("ordcafe");
    const sessionsCollection = db.collection('sessions');
    const roomsCountCollection = db.collection('roomsCount')

    //updates the room whenever a new user is in
    sessionsCollection.updateOne(
      { roomId: room },
      {
        $inc: { userCount: 1 },
        $setOnInsert: { createdAt: new Date(), words: [] },
      },
      { upsert: true }
    );

    // create a roomCounter here!

    roomsCountCollection.updateOne(
      {},
      { $inc: { totalRooms: 1 } },
      { upsert: true } 
    );



    console.log(`User joined room: ${room}`);
  });  //establishing connection with room


  // needs work, when user disconnects, the userCount should be decremented by 1
  socket.on('leave-room', (room) => {
    socket.leave(room);
    const db = client.db("ordcafe");
    const sessionsCollection = db.collection('sessions');

    sessionsCollection.updateOne(
      { roomId: room },
      { $inc: { userCount: -1 } }
    );

    //need to make this to user disconnects
    console.log(`User left room: ${room}`);
  });
  
  //works as it should
  socket.on('add-word', (data) => {
    console.log(`Attempting to add word to roomId: ${data.room}`);
    const db = client.db("ordcafe");
    const sessionsCollection = db.collection('sessions');

    sessionsCollection.updateOne(
      { roomId: data.room },
      { $push: { words: { original: data.word, translation: data.translation } } },
      { upsert: true }
    );

    console.log(`Word added: ${data.word} in room: ${data.room}`);
    io.in(data.room).emit('word-added', data);
  });

  //needs some work to delete the word from db and to be broadcasted to all clients
  socket.on('delete-word', (data) => {
    console.log('Word to delete: ', data.word);
    delete vocabObj[data.word];
    socket.broadcast.emit('word-deleted', data.word);
});

// Handle edit-word event, edits word in the cloud, but needs to work when downloading pdf and in db as well as to clients. Only the word itself should be edited and translation should work well
socket.on('edit-word', (data) => {
  console.log(`Editing word: ${data.oldWord} to ${data.newWord}`);
  // Update the vocabObj with the new word and translation
  if (vocabObj.hasOwnProperty(data.oldWord)) {
      delete vocabObj[data.oldWord]; // Remove old word
  }
  vocabObj[data.newWord] = data.newTranslation;

  // Broadcast the update to all clients.. only on one client so far
  socket.broadcast.emit('word-edited', { oldWord: data.oldWord, newWord: data.newWord, newTranslation: data.newTranslation });  
});


  socket.on('disconnect', ()=> { //when a user disconnects, do this. 
    console.log('User disconnected');
  })

});

// Dynamic namespace creation endpoint
app.get('/create-namespace', (req, res) => {
  const namespace = `/namespace-${Math.random().toString(36).substring(2, 7)}`;
  const nsp = io.of(namespace);
  nsp.on('connection', (socket) => {
    console.log(`someone connected to ${namespace}`);
    socket.emit('message', `Room code: ${namespace}`);
  });
  // Respond with the created namespace
  res.json({ namespace });
});

app.get('/room', (req, res) => {
  // Serve the room HTML, which includes logic to connect to the room's namespace based on the URL's query parameter
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




function addWord(roomId, original, translation) {
  if (!vocabObj[roomId]) {
    vocabObj[roomId] = {}; // Initialize the object for the room if it doesn't exist
  }
  if (!vocabObj[roomId][original]) { // Check if the word is already added
    const color = getRandomColor();
    const size = getRandomSize();
    vocabObj[roomId][original] = { translation, color, size }; 
  }

  const db = client.db("ordcafe"); 
  const sessionsCollection = db.collection('sessions');

  //look into this
  const wordInfo = { original: original, translation: translation, color: vocabObj[roomId][original].color, size: vocabObj[roomId][original].size };

  
  sessionsCollection.updateOne(
    { roomId: roomId },
    { $push: { words: wordInfo } },
    { upsert: true },
    (err, result) => {
      if (err) {
        console.error("Error adding word to session in MongoDB", err);
      } else {
        console.log("Added word successfully to session in MongoDB");
      }
    }
  );
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
