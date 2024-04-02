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
  
    // Initialize or update the session document for the room
    sessionsCollection.updateOne(
      { roomId: room },
      {
        $inc: { userCount: 1 },
        $setOnInsert: { createdAt: new Date(), words: [] },
      },
      { upsert: true }
    ).then(() => {
      // Now, handle the total rooms counter
      sessionsCollection.findOneAndUpdate(
        { counter: "totalRooms" }, // A special document for counting total rooms
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: "after" } // Ensure the document exists
      ).then(result => {
        if(result.ok) {
          console.log(`Total rooms updated, new count: ${result.value.count}`);
        }
      }).catch(error => {
        console.error("Error updating total rooms count", error);
      });
    });
  
    console.log(`User joined room: ${room}`);
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



  //db deletion successful, missing pdf and broadcasting 
  socket.on('delete-word', (data) => {
    console.log(`Attempting to delete word from roomId: ${data.room}`);
    const db = client.db("ordcafe");
    const sessionsCollection = db.collection('sessions');
  
    // removing the word from the 'words' array 
    sessionsCollection.updateOne(
      { roomId: data.room },
      { $pull: { words: { original: data.word } } },
      function(err, result) {
          if (err) {
              console.error("Error removing word from session in MongoDB", err);
              return;
          }

          io.in(data.room).emit('word-deleted', data.word);
      }
    );
  });
  

  

// Handle edit-word event, edits word in the cloud, but needs to work when downloading pdf and in db as well as to clients. Only the word itself should be edited and translation should work well
 socket.on('edit-word', (data) => {
        const { room, oldWord, newWord } = data;


        if (vocabObj[room] && vocabObj[room][oldWord]) {
          
            const wordDetails = vocabObj[room][oldWord];
            delete vocabObj[room][oldWord]; // Remove the old word
            vocabObj[room][newWord] = wordDetails; // Insert the new word with the old details
        }

        const db = client.db("ordcafe");
        const sessionsCollection = db.collection('sessions');
        
        console.log(`Attempting to update word in room: ${room}, from '${oldWord}' to '${newWord}'.`);

sessionsCollection.updateOne(
    { roomId: room, "words.original": oldWord },
    { $set: { "words.$.original": newWord } }
)
.then((result) => {
    if (result.matchedCount === 1) {
        console.log(`Word updated: ${oldWord} to ${newWord} in room: ${room}`);
    } else {
      // happens if the word is updated more than twice, need to find a way to update it unlimited times
        console.log(`No matching word found to update. Result: `, result);
    }
})
.catch((error) => {
    console.error("Error updating word in MongoDB", error);

        });
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
