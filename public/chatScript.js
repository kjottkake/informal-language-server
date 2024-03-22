const params = new URLSearchParams(window.location.search);
const roomID = params.get('namespace');


var socket = io('http://localhost:3002');


socket.emit('join-room', roomID); //join room

socket.on('word-added', function(data) {
  if(data.room === roomID) {
      showWord(data.word, data.translation, data.color, data.size);
  }
});

function showWord(word, tT, color, size) {
  var wordCloud = document.getElementById('wordCloudBoard');
  var newWordSpan = document.createElement('span');
  var newWordDefSpan = document.createElement('span');
  
  newWordSpan.style.color = color;
  newWordSpan.style.fontSize = `${size}px`; // Use server-provided size
  newWordSpan.textContent = word + "  "; // Add space after word
  newWordDefSpan.textContent = tT;

  wordCloud.appendChild(newWordSpan);
  wordCloud.appendChild(newWordDefSpan);
}

document.getElementById('wordForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way
    const wordInput = document.getElementById('wordInput');
    const word = wordInput.value;
    console.log(word);
    fetch('/translateWord', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }), // Send the word as JSON
    })
    .then(response => response.json())
    .then(data => {
        let translatedText = data.translatedText + " "; //adds space
        // Add the word to the cloud and emit to the server
        submitWord(word, translatedText);
        wordInput.value = ''; // clears form
    })
    .catch(error => {
        console.error('Error during translation:', error);
        document.getElementById('translationResult').textContent = 'Translation failed.';
    });
});

function submitWord(word, tT) {
    // Add the word to the cloud locally
    // showWord(word, tT);

    // Emit the event with the word and translation to the server
    socket.emit('add-word', { word: word, translation: tT, room: roomID});
}

//new client for new download
document.querySelector('.download').addEventListener('click', function() {
  const roomId = params.get('namespace'); // Retrieve room ID like before
    fetch(`/generate-pdf?room=${encodeURIComponent(roomId)}`, {
      method: 'GET',
    })
  .then(response => response.blob())
  .then(blob => {
    // Process the response as before
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "vocabList.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  })
  .catch(error => console.error('Error:', error));
});
