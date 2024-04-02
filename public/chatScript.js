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

socket.on('word-deleted', function(deletedWord) {
  
  const elements = document.querySelectorAll(`span[data-word="${deletedWord}"]`);
  elements.forEach(element => element.remove());
});

function showWord(word, tT, color, size) {
  var wordCloud = document.getElementById('wordCloudBoard');
  var newWordSpan = document.createElement('span');
  var newWordDefSpan = document.createElement('span');
  
newWordSpan.style.color = color;
newWordSpan.style.fontSize = `${size}px`;
newWordSpan.textContent = word + "  ";
newWordDefSpan.textContent = tT;

var popUpForm = document.createElement('div');
popUpForm.className = 'pop-up-form';

var wordInput = document.createElement('input');
wordInput.value = word;
wordInput.style.color = color;
wordInput.style.fontSize = `${size}px`;

var saveButton = document.createElement('button');
saveButton.textContent = 'Edit';
var deleteButton = document.createElement('button');
deleteButton.textContent = 'Delete';

var closeButton = document.createElement('button');
closeButton.textContent = 'X';
closeButton.className = 'close-button';


popUpForm.appendChild(wordInput);
popUpForm.appendChild(saveButton);
popUpForm.appendChild(deleteButton);
popUpForm.appendChild(closeButton)


document.body.appendChild(popUpForm);


newWordSpan.addEventListener('click', function() {
 //form set up in the middle of the page
  popUpForm.style.display = 'flex';
  popUpForm.style.left = '50%';
  popUpForm.style.top = '50%';
  popUpForm.style.transform = 'translate(-50%, -50%)';
  wordInput.focus();
});

//edit button
saveButton.addEventListener('click', function() {
  var newWordValue = wordInput.value;
  socket.emit('edit-word', { oldWord: word, newWord: newWordValue });
  
  newWordSpan.textContent = newWordValue + "  ";
  popUpForm.style.display = 'none';
});

// delete button
deleteButton.addEventListener('click', function(event) {
  event.stopPropagation(); 

  socket.emit('delete-word', { room: roomID, word: word });
  wordCloud.removeChild(newWordSpan);
  if (newWordDefSpan.parentNode === wordCloud) { 
    wordCloud.removeChild(newWordDefSpan);
  }

  //will ensure that the popup is hidden
  popUpForm.style.display = 'none';
});

closeButton.addEventListener('click', function(event){
  event.stopPropagation();
  popUpForm.style.display = 'none';
})


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
