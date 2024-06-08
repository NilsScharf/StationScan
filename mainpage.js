var map = L.map('map').setView([51.1833, 7.2167], 14);
var markers = [];
var placeNames = [];
var linesMap = {};
var editingMarker = null;
var lineColors = JSON.parse(localStorage.getItem('lineColors')) || {};
var lineGroupId = 1; // Variable zum Zählen der line-group IDs
var questionGroupId = 1; // Variable to count the question-group IDs

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

fetch('remscheid.geojson')
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(function(data) {
        L.geoJSON(data).addTo(map);
    })
    .catch(function(error) {
        console.log('Fehler beim Laden der GeoJSON-Daten:', error);
        L.geoJSON(dummyGeoJson).addTo(map); // Load dummy data if fetching fails
    });

window.onload = async function() {
    const response = await fetch('http://localhost:3000/api/markers');
    const savedMarkers = await response.json();
    if (savedMarkers) {
        savedMarkers.forEach(function(savedMarker) {
            if (savedMarker.latlng && savedMarker.name) {
                addMarker(savedMarker.latlng, savedMarker.name, savedMarker.zone, savedMarker.epon, savedMarker.streetviewLink, savedMarker.linien, savedMarker.fragen, false);
            }
        });
        drawLines(); // Draw lines when markers are loaded
    }

    const userRole = localStorage.getItem('userRole');
    if (userRole === 'editor' || userRole === 'admin') {
        map.on('contextmenu', function(e) {
            onMapRightClick(e);
        });
    }
};

function onMapRightClick(e) {
    resetModal(); // Modal zurücksetzen
    editingMarker = null;

    var modal = document.getElementById("addStopModal");
    var span = document.getElementsByClassName("close")[0];
    var addButton = document.getElementById("addStopButton");

    modal.style.display = "flex";
    addButton.textContent = 'Hinzufügen';

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    addButton.onclick = function() {
        var name = document.getElementById("stopName").value;
        var zone = document.getElementById("zone").value;
        var epon = document.getElementById("epon").value;
        var streetviewLink = document.getElementById("streetviewLink").value;
        var lineGroups = document.getElementsByClassName("line-group");
        var lines = [];

        for (var i = 0; i < lineGroups.length; i++) {
            var lineName = lineGroups[i].querySelector(".line-name").value;
            var direction = lineGroups[i].querySelector(".direction").value;
            var prevStop = lineGroups[i].querySelector(".prev-stop").value;
            var nextStop = lineGroups[i].querySelector(".next-stop").value;
            var lineColor = lineGroups[i].querySelector(".line-color").value;

            if (lineName && prevStop && nextStop) {
                lines.push({
                    linie: lineName,
                    richtung: direction,
                    vorherigeHaltestelle: prevStop,
                    nachfolgendeHaltestelle: nextStop,
                    farbe: lineColor
                });
                lineColors[lineName] = lineColor; // Save the color for the line
            }
        }

        var questionGroups = document.getElementsByClassName("question-group");
        var questions = [];

        for (var i = 0; i < questionGroups.length; i++) {
            var questionText = questionGroups[i].querySelector(".question").value;
            var answerText = questionGroups[i].querySelector(".answer").value;
            var applyTo = questionGroups[i].querySelector(".apply").value;

            if (questionText) {
                questions.push({
                    frage: questionText,
                    antwort: answerText,
                    anwendenAuf: applyTo
                });
            }
        }

        console.log('Lines:', lines); // Debugging

        if (name !== "") {
            if (editingMarker) {
                // Update existing marker
                editingMarker.name = name;
                editingMarker.zone = zone;
                editingMarker.epon = epon;
                editingMarker.streetviewLink = streetviewLink;
                editingMarker.linien = lines;
                editingMarker.fragen = questions; // Add questions to the marker
                updateMarkerPopup(editingMarker);
            } else {
                // Add new marker
                addMarker(e.latlng, name, zone, epon, streetviewLink, lines, questions, true);
            }
            updatePlaceList();
            saveMarkers();
            drawLines(); // Draw lines after adding marker
            modal.style.display = "none";
        } else {
            alert('Bitte geben Sie einen Namen für die Haltestelle ein.');
        }
    }
}

function resetModal() {
    document.getElementById("stopName").value = "";
    document.getElementById("zone").value = "";
    document.getElementById("epon").value = "";
    document.getElementById("streetviewLink").value = "";

    var linesContainer = document.getElementById("linesContainer");
    linesContainer.innerHTML = `
        <div class="line-group">
          <label for="lineName${lineGroupId}">Linienname:</label>
          <input type="text" class="line-name" name="line-name" id="lineName${lineGroupId}">
          
          <label for="direction${lineGroupId}">Richtung der Linie:</label>
          <select class="direction" name="direction" id="direction${lineGroupId}">
              <option value="outbound">Hinfahrt</option>
              <option value="inbound">Rückfahrt</option>
          </select>
    
          <label for="prevStop${lineGroupId}">Vorherige Haltestelle:</label>
          <input type="text" class="prev-stop" name="prev-stop" id="prevStop${lineGroupId}">
    
          <label for="nextStop${lineGroupId}">Nachfolgende Haltestelle:</label>
          <input type="text" class="next-stop" name="next-stop" id="nextStop${lineGroupId}">
          
          <label for="lineColor${lineGroupId}">Linienfarbe:</label>
          <input type="color" class="line-color" name="line-color" id="lineColor${lineGroupId}" value="#000000">
        </div>
    `;
    lineGroupId++; // Increment the line group ID for unique IDs

    // Reset questions
    var questionsContainer = document.getElementById("questionsContainer");
    questionsContainer.innerHTML = '';
    questionGroupId = 1; // Reset questionGroupId for editing

    // Add event listener for line name input
    document.querySelector('.line-name').addEventListener('input', function() {
        var lineName = this.value;
        if (lineColors[lineName]) {
            document.getElementById(`lineColor${lineGroupId - 1}`).value = lineColors[lineName];
        }
    });
}

function updateMarkerPopup(marker) {
    const userRole = localStorage.getItem('userRole');
    var popupContent = "<h3>" + marker.name + "</h3>" +
        "<b>Wabe:</b> " + marker.zone + "<br>" +
        "<b>EPON-Nr:</b> " + marker.epon + "<br>" +
        "<b>Google Streetview:</b> <a href='" + marker.streetviewLink + "' target='_blank'>Link</a><br>";

    popupContent += "<b>Linien:</b><br>";
    marker.linien.forEach(function(line) {
        popupContent += `<a href='#' onclick='searchLine("${line.linie}", "${line.richtung}")'>${line.linie}</a><br>`;
    });

    if (marker.fragen && marker.fragen.length > 0) {
        marker.fragen.forEach(function(question) {
            popupContent += `<b>Frage:</b> ${question.frage}<br><b>Antwort:</b> ${question.antwort}<br>`;
        });
    }

    if (userRole === 'editor' || userRole === 'admin') {
        popupContent += "<div class='popup-buttons'><button onclick='editMarker(" + markers.indexOf(marker) + ")'>Bearbeiten</button>";
        popupContent += "<button class='delete-button' onclick='deleteMarker(" + markers.indexOf(marker) + ")'>Marker löschen</button></div>";
    }

    marker.bindPopup(popupContent, { autoPan: false });
}

function searchLine(lineName, direction = 'outbound') {
    var query = lineName.trim();
    if (query !== '') {
        var isLineSearch = markers.some(marker => marker.linien.some(line => line.linie === query && line.richtung === direction));
        if (isLineSearch) {
            // Show only markers and lines for the queried line
            var stops = [];
            markers.forEach(marker => {
                var hasLine = marker.linien.some(line => line.linie === query && line.richtung === direction);
                if (hasLine) {
                    marker.addTo(map);
                    stops.push(marker.name);
                } else {
                    map.removeLayer(marker);
                }
            });
            drawLines(query, direction);
            showSidebar(query, direction);
        } else {
            alert('Linie nicht gefunden');
            hideSidebar();
        }
    }
}

function addLineGroup() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'editor' && userRole !== 'admin') {
        alert('Sie haben keine Berechtigung, Linien hinzuzufügen.');
        return;
    }

    var linesContainer = document.getElementById("linesContainer");
    var lineGroup = document.createElement("div");
    lineGroup.className = "line-group";

    var lineNameLabel = document.createElement("label");
    lineNameLabel.setAttribute("for", "lineName" + lineGroupId);
    lineNameLabel.textContent = "Linienname:";
    lineGroup.appendChild(lineNameLabel);

    var lineNameInput = document.createElement("input");
    lineNameInput.type = "text";
    lineNameInput.className = "line-name";
    lineNameInput.id = "lineName" + lineGroupId;
    lineGroup.appendChild(lineNameInput);

    var directionLabel = document.createElement("label");
    directionLabel.setAttribute("for", "direction" + lineGroupId);
    directionLabel.textContent = "Richtung der Linie:";
    lineGroup.appendChild(directionLabel);

    var directionSelect = document.createElement("select");
    directionSelect.className = "direction";
    directionSelect.name = "direction";
    directionSelect.id = "direction" + lineGroupId;
    directionSelect.innerHTML = `
        <option value="outbound">Hinfahrt</option>
        <option value="inbound">Rückfahrt</option>
    `;
    lineGroup.appendChild(directionSelect);

    var prevStopLabel = document.createElement("label");
    prevStopLabel.setAttribute("for", "prevStop" + lineGroupId);
    prevStopLabel.textContent = "Vorherige Haltestelle:";
    lineGroup.appendChild(prevStopLabel);

    var prevStopInput = document.createElement("input");
    prevStopInput.type = "text";
    prevStopInput.className = "prev-stop";
    prevStopInput.id = "prevStop" + lineGroupId;
    lineGroup.appendChild(prevStopInput);

    var nextStopLabel = document.createElement("label");
    nextStopLabel.setAttribute("for", "nextStop" + lineGroupId);
    nextStopLabel.textContent = "Nachfolgende Haltestelle:";
    lineGroup.appendChild(nextStopLabel);

    var nextStopInput = document.createElement("input");
    nextStopInput.type = "text";
    nextStopInput.className = "next-stop";
    nextStopInput.id = "nextStop" + lineGroupId;
    lineGroup.appendChild(nextStopInput);

    var lineColorLabel = document.createElement("label");
    lineColorLabel.setAttribute("for", "lineColor" + lineGroupId);
    lineColorLabel.textContent = "Linienfarbe:";
    lineGroup.appendChild(lineColorLabel);

    var lineColorInput = document.createElement("input");
    lineColorInput.type = "color";
    lineColorInput.className = "line-color";
    lineColorInput.id = "lineColor" + lineGroupId;
    lineColorInput.value = "#000000";
    lineGroup.appendChild(lineColorInput);

    var removeButton = document.createElement("button");
    removeButton.textContent = "Entfernen";
    removeButton.className = "remove-line";
    removeButton.onclick = function() {
        linesContainer.removeChild(lineGroup);
    };
    lineGroup.appendChild(removeButton);

    linesContainer.appendChild(lineGroup);
    lineGroupId++; // Increment the line group ID for unique IDs

    // Add event listener for line name input
    lineNameInput.addEventListener('input', function() {
        var lineName = this.value;
        if (lineColors[lineName]) {
            lineColorInput.value = lineColors[lineName];
        }
    });
}

function addQuestion() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'editor' && userRole !== 'admin') {
        alert('Sie haben keine Berechtigung, Fragen hinzuzufügen.');
        return;
    }

    var questionsContainer = document.getElementById("questionsContainer");
    var questionGroup = document.createElement("div");
    questionGroup.className = "question-group";

    var questionLabel = document.createElement("label");
    questionLabel.setAttribute("for", "question" + questionGroupId);
    questionLabel.textContent = "Frage:";
    questionGroup.appendChild(questionLabel);

    var questionInput = document.createElement("input");
    questionInput.type = "text";
    questionInput.className = "question";
    questionInput.id = "question" + questionGroupId;
    questionInput.placeholder = "Wie lautet deine Frage?";
    questionGroup.appendChild(questionInput);

    var answerLabel = document.createElement("label");
    answerLabel.setAttribute("for", "answer" + questionGroupId);
    answerLabel.textContent = "Antwort:";
    questionGroup.appendChild(answerLabel);

    var answerInput = document.createElement("input");
    answerInput.type = "text";
    answerInput.className = "answer";
    answerInput.id = "answer" + questionGroupId;
    questionGroup.appendChild(answerInput);

    var applyLabel = document.createElement("label");
    applyLabel.setAttribute("for", "apply" + questionGroupId);
    applyLabel.textContent = "Anwenden auf:";
    questionGroup.appendChild(applyLabel);

    var applySelect = document.createElement("select");
    applySelect.className = "apply";
    applySelect.id = "apply" + questionGroupId;
    applySelect.innerHTML = `
        <option value="this">Nur diese Haltestelle</option>
        <option value="all">Alle Haltestellen</option>
        <option value="allQuestions">Nur Fragen für alle Haltestellen</option>
        <option value="allQuestionsAnswers">Fragen und Antworten für alle Haltestellen</option>
        <option value="removeAllQuestionsAnswers">Frage und Antwort für alle Haltestellen entfernen</option>
    `;
    questionGroup.appendChild(applySelect);

    var removeButton = document.createElement("button");
    removeButton.textContent = "Entfernen";
    removeButton.className = "remove-question";
    removeButton.onclick = function() {
        questionsContainer.removeChild(questionGroup);
    };
    questionGroup.appendChild(removeButton);

    questionsContainer.appendChild(questionGroup);
    questionGroupId++;
}

function editMarker(index) {
    var marker = markers[index];
    editingMarker = marker;
    var modal = document.getElementById("addStopModal");
    var span = document.getElementsByClassName("close")[0];
    var addButton = document.getElementById("addStopButton");

    // Befüllen des Modals mit den aktuellen Markerinformationen
    document.getElementById("stopName").value = marker.name;
    document.getElementById("zone").value = marker.zone;
    document.getElementById("epon").value = marker.epon;
    document.getElementById("streetviewLink").value = marker.streetviewLink;

    var linesContainer = document.getElementById("linesContainer");
    linesContainer.innerHTML = '';
    lineGroupId = 1; // Reset lineGroupId for editing

    marker.linien.forEach(function(line) {
        var lineGroup = document.createElement("div");
        lineGroup.className = "line-group";

        var lineNameLabel = document.createElement("label");
        lineNameLabel.setAttribute("for", "lineName" + lineGroupId);
        lineNameLabel.textContent = "Linienname:";
        lineGroup.appendChild(lineNameLabel);

        var lineNameInput = document.createElement("input");
        lineNameInput.type = "text";
        lineNameInput.className = "line-name";
        lineNameInput.id = "lineName" + lineGroupId;
        lineNameInput.value = line.linie;
        lineGroup.appendChild(lineNameInput);

        var directionLabel = document.createElement("label");
        directionLabel.setAttribute("for", "direction" + lineGroupId);
        directionLabel.textContent = "Richtung der Linie:";
        lineGroup.appendChild(directionLabel);

        var directionSelect = document.createElement("select");
        directionSelect.className = "direction";
        directionSelect.name = "direction";
        directionSelect.id = "direction" + lineGroupId;
        directionSelect.innerHTML = `
            <option value="outbound" ${line.richtung === 'outbound' ? 'selected' : ''}>Hinfahrt</option>
            <option value="inbound" ${line.richtung === 'inbound' ? 'selected' : ''}>Rückfahrt</option>
        `;
        lineGroup.appendChild(directionSelect);

        var prevStopLabel = document.createElement("label");
        prevStopLabel.setAttribute("for", "prevStop" + lineGroupId);
        prevStopLabel.textContent = "Vorherige Haltestelle:";
        lineGroup.appendChild(prevStopLabel);

        var prevStopInput = document.createElement("input");
        prevStopInput.type = "text";
        prevStopInput.className = "prev-stop";
        prevStopInput.id = "prevStop" + lineGroupId;
        prevStopInput.value = line.vorherigeHaltestelle;
        lineGroup.appendChild(prevStopInput);

        var nextStopLabel = document.createElement("label");
        nextStopLabel.setAttribute("for", "nextStop" + lineGroupId);
        nextStopLabel.textContent = "Nachfolgende Haltestelle:";
        lineGroup.appendChild(nextStopLabel);

        var nextStopInput = document.createElement("input");
        nextStopInput.type = "text";
        nextStopInput.className = "next-stop";
        nextStopInput.id = "nextStop" + lineGroupId;
        nextStopInput.value = line.nachfolgendeHaltestelle;
        lineGroup.appendChild(nextStopInput);

        var lineColorLabel = document.createElement("label");
        lineColorLabel.setAttribute("for", "lineColor" + lineGroupId);
        lineColorLabel.textContent = "Linienfarbe:";
        lineGroup.appendChild(lineColorLabel);

        var lineColorInput = document.createElement("input");
        lineColorInput.type = "color";
        lineColorInput.className = "line-color";
        lineColorInput.id = "lineColor" + lineGroupId;
        lineColorInput.value = lineColors[line.linie] || line.farbe;
        lineGroup.appendChild(lineColorInput);

        var removeButton = document.createElement("button");
        removeButton.textContent = "Entfernen";
        removeButton.className = "remove-line";
        removeButton.onclick = function() {
            linesContainer.removeChild(lineGroup);
        };
        lineGroup.appendChild(removeButton);

        linesContainer.appendChild(lineGroup);
        lineGroupId++; // Increment the line group ID for unique IDs

        // Add event listener for line name input
        lineNameInput.addEventListener('input', function() {
            var lineName = this.value;
            if (lineColors[lineName]) {
                lineColorInput.value = lineColors[lineName];
            }
        });
    });

    var questionsContainer = document.getElementById("questionsContainer");
    questionsContainer.innerHTML = '';
    questionGroupId = 1; // Reset questionGroupId for editing

    marker.fragen.forEach(function(question) {
        var questionGroup = document.createElement("div");
        questionGroup.className = "question-group";

        var questionLabel = document.createElement("label");
        questionLabel.setAttribute("for", "question" + questionGroupId);
        questionLabel.textContent = "Frage:";
        questionGroup.appendChild(questionLabel);

        var questionInput = document.createElement("input");
        questionInput.type = "text";
        questionInput.className = "question";
        questionInput.id = "question" + questionGroupId;
        questionInput.value = question.frage;
        questionGroup.appendChild(questionInput);

        var answerLabel = document.createElement("label");
        answerLabel.setAttribute("for", "answer" + questionGroupId);
        answerLabel.textContent = "Antwort:";
        questionGroup.appendChild(answerLabel);

        var answerInput = document.createElement("input");
        answerInput.type = "text";
        answerInput.className = "answer";
        answerInput.id = "answer" + questionGroupId;
        answerInput.value = question.antwort;
        questionGroup.appendChild(answerInput);

        var applyLabel = document.createElement("label");
        applyLabel.setAttribute("for", "apply" + questionGroupId);
        applyLabel.textContent = "Anwenden auf:";
        questionGroup.appendChild(applyLabel);

        var applySelect = document.createElement("select");
        applySelect.className = "apply";
        applySelect.id = "apply" + questionGroupId;
        applySelect.innerHTML = `
            <option value="this" ${question.anwendenAuf === 'this' ? 'selected' : ''}>Nur diese Haltestelle</option>
            <option value="all" ${question.anwendenAuf === 'all' ? 'selected' : ''}>Alle Haltestellen</option>
            <option value="allQuestions" ${question.anwendenAuf === 'allQuestions' ? 'selected' : ''}>Nur Fragen für alle Haltestellen</option>
            <option value="allQuestionsAnswers" ${question.anwendenAuf === 'allQuestionsAnswers' ? 'selected' : ''}>Fragen und Antworten für alle Haltestellen</option>
            <option value="removeAllQuestionsAnswers">Frage und Antwort für alle Haltestellen entfernen</option>
        `;
        questionGroup.appendChild(applySelect);

        var removeButton = document.createElement("button");
        removeButton.textContent = "Entfernen";
        removeButton.className = "remove-question";
        removeButton.onclick = function() {
            questionsContainer.removeChild(questionGroup);
        };
        questionGroup.appendChild(removeButton);

        questionsContainer.appendChild(questionGroup);
        questionGroupId++;
    });

    modal.style.display = "flex";
    addButton.textContent = 'Ändern';

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    addButton.onclick = function() {
        var name = document.getElementById("stopName").value;
        var zone = document.getElementById("zone").value;
        var epon = document.getElementById("epon").value;
        var streetviewLink = document.getElementById("streetviewLink").value;
        var lineGroups = document.getElementsByClassName("line-group");
        var lines = [];

        for (var i = 0; i < lineGroups.length; i++) {
            var lineName = lineGroups[i].querySelector(".line-name").value;
            var direction = lineGroups[i].querySelector(".direction").value;
            var prevStop = lineGroups[i].querySelector(".prev-stop").value;
            var nextStop = lineGroups[i].querySelector(".next-stop").value;
            var lineColor = lineGroups[i].querySelector(".line-color").value;

            if (lineName && prevStop && nextStop) {
                lines.push({
                    linie: lineName,
                    richtung: direction,
                    vorherigeHaltestelle: prevStop,
                    nachfolgendeHaltestelle: nextStop,
                    farbe: lineColor
                });
                lineColors[lineName] = lineColor; // Save the color for the line
            }
        }

        var questionGroups = document.getElementsByClassName("question-group");
        var questions = [];

        for (var i = 0; i < questionGroups.length; i++) {
            var questionText = questionGroups[i].querySelector(".question").value;
            var answerText = questionGroups[i].querySelector(".answer").value;
            var applyTo = questionGroups[i].querySelector(".apply").value;

            if (questionText) {
                questions.push({
                    frage: questionText,
                    antwort: answerText,
                    anwendenAuf: applyTo
                });
            }
        }

        console.log('Lines:', lines); // Debugging

        if (name !== "") {
            marker.name = name;
            marker.zone = zone;
            marker.epon = epon;
            marker.streetviewLink = streetviewLink;
            marker.linien = lines;
            marker.fragen = questions;
            updateMarkerPopup(marker);
            saveMarkers();
            drawLines(); // Draw lines after editing marker
            modal.style.display = "none";

            applyQuestions(questions, applyTo);
        } else {
            alert('Bitte geben Sie einen Namen für die Haltestelle ein.');
        }
    }
}

function deleteMarker(index) {
    var marker = markers[index];
    map.removeLayer(marker);
    markers.splice(index, 1);
    placeNames.splice(index, 1);
    updatePlaceList();
    saveMarkers();
    drawLines(); // Redraw lines after deleting marker
}

function addMarker(latlng, name, zone, epon, streetviewLink, linien, fragen, shouldSave) {
    if (!latlng || !name) return; // Prevent adding markers with invalid data
    var marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.name = name;
    marker.zone = zone;
    marker.epon = epon;
    marker.streetviewLink = streetviewLink;
    marker.linien = linien;
    marker.fragen = fragen; // Add questions to the marker
    markers.push(marker);
    placeNames.push(name);
    updateMarkerPopup(marker);
    console.log('Added Marker:', marker); // Debugging
    if (shouldSave) saveMarkers();
}

function updatePlaceList() {
    var datalist = document.getElementById('places');
    datalist.innerHTML = '';
    placeNames.forEach(function(name) {
        var option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

async function saveMarkers() {
    const markersToSave = markers.map(function(marker) {
        return {
            latlng: marker.getLatLng(),
            name: marker.name,
            zone: marker.zone,
            epon: marker.epon,
            streetviewLink: marker.streetviewLink,
            linien: marker.linien,
            fragen: marker.fragen // Save the questions as well
        };
    });

    // Löschen Sie alle vorhandenen Marker auf dem Server (optional, je nach Implementierung)
    // await fetch('http://localhost:3000/api/markers', { method: 'DELETE' });

    // Speichern Sie die Marker auf dem Server
    for (const marker of markersToSave) {
        await fetch('http://localhost:3000/api/markers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(marker)
        });
    }
}

function drawLines(filterLine = null, filterDirection = null) {
    // Clear existing lines
    for (var key in linesMap) {
        linesMap[key].remove();
    }
    linesMap = {};

    // Draw new lines
    markers.forEach(function(marker) {
        marker.linien.forEach(function(line) {
            if ((filterLine && line.linie !== filterLine) || (filterDirection && line.richtung !== filterDirection)) return;

            var prevStop = markers.find(m => m.name === line.vorherigeHaltestelle && m.linien.some(l => l.linie === line.linie && l.richtung === line.richtung));
            var nextStop = markers.find(m => m.name === line.nachfolgendeHaltestelle && m.linien.some(l => l.linie === line.linie && l.richtung === line.richtung));

            if (prevStop) {
                var polylineKey = line.linie + '_' + line.richtung + '_' + prevStop.name + '_' + marker.name;
                var polyline = L.polyline([prevStop.getLatLng(), marker.getLatLng()], { color: lineColors[line.linie] || line.farbe }).addTo(map);
                linesMap[polylineKey] = polyline;
            }

            if (nextStop) {
                var polylineKey = line.linie + '_' + line.richtung + '_' + marker.name + '_' + nextStop.name;
                var polyline = L.polyline([marker.getLatLng(), nextStop.getLatLng()], { color: lineColors[line.linie] || line.farbe }).addTo(map);
                linesMap[polylineKey] = polyline;
            }
        });
    });
}

function applyQuestions(questions, applyTo) {
    if (applyTo === "all" || applyTo === "allQuestions" || applyTo === "removeAllQuestionsAnswers") {
        markers.forEach(function(marker) {
            if (applyTo === "all") {
                marker.fragen = marker.fragen.concat(questions);
            } else if (applyTo === "allQuestions") {
                questions.forEach(function(question) {
                    marker.fragen.push({ frage: question.frage, antwort: "" });
                });
            } else if (applyTo === "removeAllQuestionsAnswers") {
                questions.forEach(function(question) {
                    marker.fragen = marker.fragen.filter(q => q.frage !== question.frage);
                });
            }
            updateMarkerPopup(marker);
        });
    }
    saveMarkers();
}

function showSidebar(lineName, direction) {
    var sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `<h4>Linie ${lineName} - ${direction === 'outbound' ? 'Hinfahrt' : 'Rückfahrt'}</h4>`;
    
    var stops = [];
    markers.forEach(marker => {
        var hasLine = marker.linien.some(line => line.linie === lineName && line.richtung === direction);
        if (hasLine) {
            stops.push(marker.name);
        }
    });

    var sortedStops = sortStops(lineName, direction, stops);

    var ul = document.createElement('ul');
    ul.id = 'stop-list';
    sortedStops.forEach(stop => {
        var li = document.createElement('li');
        li.textContent = stop;
        li.onclick = function() {
            var marker = markers.find(m => m.name === stop);
            if (marker) {
                marker.openPopup();
            }
        };
        ul.appendChild(li);
    });
    sidebar.appendChild(ul);
    sidebar.style.display = 'block';

    new Sortable(ul, {
        animation: 150,
        onEnd: function(evt) {
            var newOrder = Array.from(ul.children).map(item => item.textContent);
            updateLineStops(lineName, newOrder);
        }
    });

    var closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'red';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = hideSidebar;
    sidebar.appendChild(closeButton);
}

function sortStops(lineName, direction, stops) {
    var stopsMap = {};
    markers.forEach(marker => {
        marker.linien.forEach(line => {
            if (line.linie === lineName && line.richtung === direction) {
                if (!stopsMap[marker.name]) {
                    stopsMap[marker.name] = { prev: null, next: null };
                }
                if (!stopsMap[line.vorherigeHaltestelle]) {
                    stopsMap[line.vorherigeHaltestelle] = { prev: null, next: null };
                }
                if (!stopsMap[line.nachfolgendeHaltestelle]) {
                    stopsMap[line.nachfolgendeHaltestelle] = { prev: null, next: null };
                }
                stopsMap[marker.name].prev = line.vorherigeHaltestelle;
                stopsMap[marker.name].next = line.nachfolgendeHaltestelle;
                stopsMap[line.vorherigeHaltestelle].next = marker.name;
                stopsMap[line.nachfolgendeHaltestelle].prev = marker.name;
            }
        });
    });

    console.log('Stops Map:', stopsMap); // Debugging

    // Ensure stops is an array
    if (!Array.isArray(stops)) {
        console.error('stops is not an array:', stops);
        return [];
    }

    // Find the starting stop (where previous stop is "Endhaltestelle")
    var startStop = stops.find(stop => stopsMap[stop] && stopsMap[stop].prev === "Endhaltestelle");
    console.log('Start Stop:', startStop); // Debugging
    var sortedStops = [];
    var currentStop = startStop;

    // Traverse through the stops in the correct order
    while (currentStop && currentStop !== "Endhaltestelle") {
        sortedStops.push(currentStop);
        currentStop = stopsMap[currentStop].next;
    }

    console.log('Sorted Stops (end):', sortedStops); // Debugging

    return sortedStops;
}

function updateLineStops(lineName, newOrder) {
    // Save the new order in localStorage
    var lineStops = JSON.parse(localStorage.getItem('lineStops')) || {};
    lineStops[lineName] = newOrder;
    localStorage.setItem('lineStops', JSON.stringify(lineStops));
}

function hideSidebar() {
    var sidebar = document.getElementById('sidebar');
    sidebar.style.display = 'none';
    
    // Show all markers
    markers.forEach(function(marker) {
        marker.addTo(map);
    });
    drawLines(); // Redraw all lines
}

document.addEventListener('DOMContentLoaded', function() {
    var sidebar = document.getElementById('sidebar');
    var closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'red';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = hideSidebar;
    sidebar.appendChild(closeButton);
});

document.getElementById('search').addEventListener('input', function(e) {
    var query = this.value.trim();
    if (query === '') {
        // Show all markers and lines when the search query is empty
        markers.forEach(function(marker) {
            marker.addTo(map);
        });
        drawLines();
        hideSidebar();
    }
});

document.getElementById('search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        var query = this.value.trim();
        if (query !== '') {
            var isLineSearch = markers.some(marker => marker.linien.some(line => line.linie === query));
            var isZoneSearch = markers.some(marker => marker.zone === query);
            
            if (isLineSearch) {
                // Show only markers and lines for the queried line
                var stops = [];
                markers.forEach(marker => {
                    var hasLine = marker.linien.some(line => line.linie === query);
                    if (hasLine) {
                        marker.addTo(map);
                        stops.push(marker.name);
                    } else {
                        map.removeLayer(marker);
                    }
                });
                drawLines(query);
                showSidebar(query);
            } else if (isZoneSearch) {
                // Show only markers in the queried zone
                markers.forEach(function(marker) {
                    if (marker.zone === query) {
                        marker.addTo(map);
                    } else {
                        map.removeLayer(marker);
                    }
                });
                drawLines();
                hideSidebar();
            } else {
                // Search for a stop name
                var foundMarker = markers.find(marker => marker.name === query);
                if (foundMarker) {
                    map.setView(foundMarker.getLatLng(), 18);
                    markers.forEach(marker => {
                        if (marker === foundMarker) {
                            marker.addTo(map);
                        } else {
                            map.removeLayer(marker);
                        }
                    });
                    drawLines();
                    hideSidebar();
                } else {
                    alert('Ort oder Linie nicht gefunden');
                    hideSidebar();
                }
            }
        }
    }
});
