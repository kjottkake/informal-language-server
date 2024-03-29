// Extract roomID from the URL path instead of query parameters
const roomID = window.location.pathname.split('/').pop();

var socket = io('http://localhost:3002');

// Join room with the new roomID
socket.emit('join-room', roomID); 

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
  newWordSpan.style.fontSize = `${size}px`;
  newWordSpan.textContent = word + "  ";
  newWordDefSpan.textContent = tT;

   //event listener for deleting a word 
   newWordSpan.addEventListener('dblclick', function(){
    socket.emit('delete-word', {word: word}); //emits event to delete the word
    wordCloud.removeChild(newWordSpan); //removes the word span from the cloud
    wordCloud.removeChild(newWordDefSpan); //removes the definition span as well
})

// function for editing the words. oops, it also forces you to edit the translated word..
  newWordSpan.addEventListener('click', function() {
    var action = prompt("Would you like to edit or delete this word? Enter 'edit' or 'delete':", "edit");
    if (action.toLowerCase() === 'edit') {
        var newWord = prompt("Enter new word:", word);
        if (newWord !== null && newWord !== '') {
            var newTranslation = prompt("Enter new translation:", tT);
            if (newTranslation !== null && newTranslation !== '') {
                socket.emit('edit-word', { oldWord: word, newWord: newWord, newTranslation: newTranslation });
                
                newWordSpan.textContent = newWord + "  ";
                newWordDefSpan.textContent = newTranslation;
            }
        }
    } else if (action.toLowerCase() === 'delete') {
        socket.emit('delete-word', { word: word });
        wordCloud.removeChild(newWordSpan);
        wordCloud.removeChild(newWordDefSpan);
    }
});

  wordCloud.appendChild(newWordSpan);
  wordCloud.appendChild(newWordDefSpan);
}

document.getElementById('wordForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting traditionally
    const wordInput = document.getElementById('wordInput');
    const word = wordInput.value;

    fetch('/translateWord', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word, roomId: roomID }), // Include roomId in the request body
    })
    .then(response => response.json())
    .then(data => {
        submitWord(word, data.translatedText);
        wordInput.value = ''; // Clear form
    })
    .catch(error => {
        console.error('Error during translation:', error);
        document.getElementById('translationResult').textContent = 'Translation failed.';
    });
});

function submitWord(word, tT) {
    // Emit the event with the word, translation, and room ID to the server
    socket.emit('add-word', { word: word, translation: tT, room: roomID });
}

// Adjust the fetch call for downloading the PDF to use the roomID from the URL path
document.querySelector('.download').addEventListener('click', function() {
    fetch(`/generate-pdf?room=${encodeURIComponent(roomID)}`, {
      method: 'GET',
    })
  .then(response => response.blob())
  .then(blob => {
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
