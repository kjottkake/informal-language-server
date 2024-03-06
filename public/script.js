document.getElementById('wordForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const word = document.getElementById('wordInput').value;
    console.log(word)
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
        // document.getElementById('translationResult').textContent = `Translation: ${data.translatedText}`;
        let translatedText = data.translatedText + " " //adds space
        addWordToCloud(word, translatedText);
        this.reset(); // clears form
    })
    .catch(error => {
        console.error('Error during translation:', error);
        document.getElementById('translationResult').textContent = 'Translation failed.';
        // this.reset();
    });
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
    // This function would add the word to the visual word cloud
    // For the purposes of this example, we'll just append it to the div
    var wordCloud = document.getElementById('wordCloudBoard');
    var newWordSpan = document.createElement('span');

    var newWordDefSpan = document.createElement('span');
    
    newWordSpan.style.color = getRandomColor();
    newWordSpan.style.fontSize = `${getRandomSize()}px`;
    newWordSpan.textContent = word + "  "; // Add space after word

    newWordDefSpan.textContent = tT

    wordCloud.appendChild(newWordSpan);
    wordCloud.appendChild(newWordDefSpan);
    
  }
  