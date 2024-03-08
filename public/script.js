
const socket = io('http://localhost:3002');
// const socket = io;

// Listen for 'word-added' event emitted by the server
socket.on('word-added', function(data) {
    addWordToCloud(data.word, data.translation);
});


//here on submission of word, we request the translation from the translation api
document.getElementById('wordForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const word = document.getElementById('wordInput').value;
    // console.log(word)
    fetch('/translateWord', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }), // Send the word as JSON
    })
    .then(response => response.json())
    .then(data => {
        // Display the translation result
        document.getElementById('translationResult').textContent = `Translation: ${data.translatedText}`;
        let translatedText = data.translatedText + " " //adds space
        addWordToCloud(word, translatedText);
        // socket.emit('add-word', { word: word, translation: translatedText });
        // socket.emit('add-word', { word: word, translation: tT });
        this.reset(); // clears form
    })
    .catch(error => {
        console.error('Error during translation:', error);
        document.getElementById('translationResult').textContent = 'Translation failed.';
        // this.reset();
    });
});


document.querySelector('.download').addEventListener('click', function() {
    fetch('/generate-pdf', {
      method: 'GET', // Changed to a GET request since no data is being sent
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

function getRandomColor() {
    const randomColor = Math.floor(Math.random()*16777215).toString(16);
    return `#${randomColor}`;
}

function getRandomSize() {
    // Define the range for your font sizes, e.g., between 12px and 36px
    const minSize = 64;
    const maxSize = 128;
    return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}

function addWordToCloud(word, tT) {
    // socket.on('chat message', function(data){

    // This function would add the word to the visual word cloud
    // For the purposes of this example, we'll just append it to the div
    var wordCloud = document.getElementById('wordCloudBoard');
    
    // socket.on('chat message', function(data){

    var newWordSpan = document.createElement('span');
    var newWordDefSpan = document.createElement('span');
    
    newWordSpan.style.color = getRandomColor();
    newWordSpan.style.fontSize = `${getRandomSize()}px`;
    newWordSpan.textContent = word + "  "; // Add space after word
    newWordDefSpan.textContent = tT
    
    //my code
    // newWordSpan.textContent = data.word + " ";
    // newWordDefSpan.textContent = data.translation;

    // tT = data; //word cloud data

    wordCloud.appendChild(newWordSpan);
    wordCloud.appendChild(newWordDefSpan);

      // Emit the event with the word and translation to the server
      socket.emit('add-word', { word: word, translation: tT });
    // });
  }
  