document.getElementById('saveBtn').addEventListener('click', () => {
    let note = document.getElementById('note').value;
    let url = '';
    let timestamp = new Date().toLocaleString();

    // Change title attributes (tooltips) for buttons
    document.getElementById('saveBtn').title = 'Save note';
    document.getElementById('exportBtn').title = 'Export notes as CSV';
    document.getElementById('uploadBtn').title = 'Upload a CSV file';

    // Change button color on click
    let saveBtn = document.getElementById('saveBtn');
    saveBtn.style.backgroundColor = '#4fd9a4';  // Change to desired color
    let originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved'; // Change text to "saved"

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let tab = tabs[0];
        let fullUrl = new URL(tabs[0].url);
        url = fullUrl.origin + fullUrl.pathname;  // Get the base URL without query parameters
        let title = tab.title;  // Get the title of the current tab

        if (note.trim() === "") {
            // Remove data if note is blank
            chrome.storage.sync.remove(url, () => {
                console.log('Note removed for:', url);
                document.getElementById('lastUpdated').textContent = 'Note removed';  // Update the timestamp display
                saveBtn.style.backgroundColor = '';  // Revert to original color
                saveBtn.textContent = originalText;  // Revert to original text
            });
        } else {
            let data = {};
            data[url] = { note: note, title: title, timestamp: timestamp };
            chrome.storage.sync.set(data, () => {
                console.log('Note saved for:', url);
                document.getElementById('lastUpdated').textContent = 'Last updated: ' + timestamp;
                // Optionally revert the color back after a delay
                setTimeout(() => {
                    saveBtn.style.backgroundColor = '';  // Revert to original color
                    saveBtn.textContent = originalText;  // Revert to original text
                }, 1500);  // Delay in milliseconds
            });
        }
    });
});

document.getElementById('exportBtn').addEventListener('click', () => {
    chrome.storage.sync.get(null, (items) => {
        let csvContent = "data:text/csv;charset=utf-8,URL,Title,Note,Timestamp\n";
        for (let url in items) {
            if (items.hasOwnProperty(url)) {
                let noteData = items[url];
                if (noteData) {  // Check if noteData is defined
                    let title = noteData.title ? noteData.title.replace(/(\r\n|\n|\r)/gm, " ") : "No Title";
                    let note = noteData.note ? noteData.note.replace(/(\r\n|\n|\r)/gm, " ") : "No Note";
                    let timestamp = noteData.timestamp ? noteData.timestamp : "No Timestamp";
                    csvContent += `"${url}","${title}","${note}","${timestamp}"\n`;  // Replace newlines in notes with spaces for CSV format
                } else {
                    console.warn('Undefined noteData for URL:', url);
                }
            }
        }

        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "notes_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    let file = event.target.files[0];
    if (!file) {
        alert('Please select a CSV file to upload.');
        return;
    }

    let reader = new FileReader();
    reader.onload = (event) => {
        let csvContent = event.target.result;
        let rows = csvContent.split('\n');

        // Check headers
        let headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
        let expectedHeaders = ["URL", "Title", "Note", "Timestamp"];
        if (headers.length !== expectedHeaders.length || !expectedHeaders.every((header, index) => header === headers[index])) {
            alert('Invalid CSV format. Please make sure the CSV file has the correct headers: URL, Title, Note, Timestamp.');
            return;
        }

        for (let i = 1; i < rows.length; i++) {  // Skip header row
            let cols = rows[i].split(',');
            if (cols.length >= 4) {
                let url = cols[0].replace(/"/g, '').trim();
                let title = cols[1].replace(/"/g, '').trim();
                let note = cols[2].replace(/"/g, '').trim();
                let timestamp = cols[3].replace(/"/g, '').trim();

                if (url) {
                    let data = {};
                    data[url] = { note: note, timestamp: timestamp, title: title };
                    chrome.storage.sync.set(data, () => {
                        console.log('Data imported for:', url);
                    });
                }
            }
        }
        alert('CSV data uploaded successfully.');
    };
    reader.readAsText(file);
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let fullUrl = new URL(tabs[0].url);
        let url = fullUrl.origin + fullUrl.pathname;  // Get the base URL without query parameters
        let title = tabs[0].title;  // Get the title of the current tab
        document.getElementById('pageTitle').textContent = 'Page Title: ' + title;  // Display the title
        chrome.storage.sync.get([url], (result) => {
            if (result[url]) {
                document.getElementById('note').value = result[url].note;
                document.getElementById('lastUpdated').textContent = 'Last updated: ' + result[url].timestamp;  // Display the saved timestamp
            }
        });
    });
});
