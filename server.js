const express = require('express'); //server operations
const bodyParser = require('body-parser'); //parses body for stuff
const axios = require('axios'); //requests
const PDFDocument = require('pdfkit'); //library to generate pdfs
const fs = require('fs'); //gets file input
const pdf = new PDFDocument(); //our document


const app = express();
const PORT = 3000;

const vocabObj = {};


// //function for adding word to individual list
// function addWord(original, translation){
//     words[original] = translation;
// }


app.use(bodyParser.json());

// Your words storage logic remains the same
app.use(express.static('public'));

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
