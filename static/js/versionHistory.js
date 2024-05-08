var leftContainer, rightContainer;
var statecharts = {};
var minimapWidth = 0, minimapHeight = 0, scaleFactor = 0, originalHeight = 0, originalWidth = 0, currentX = 0, currentY = 0, translateX = 0, translateY = 0, minimapRatio = 0, scale = 1, svgWidth = 0, svgHeight = 0;

window.onload = function () {
    leftContainer = document.getElementById("leftContainer");
    rightContainer = document.getElementById("rightContainer");
    document.getElementById("colorLegend").style.display = "none";

    getVersionHistory();
}

async function getVersionHistory() {
    const url = "http://127.0.0.1:5000/get_statechart_comparison";
    fetch(url)
        .then((response) => response.json())
        .then((json) => {
            statecharts = json.files;
            console.log(statecharts);

            visualizeStatechart(statecharts[0].svg, leftContainer);
            visualizeStatechart(statecharts[1].svg, rightContainer);
            createStatechartStructure();
            applyZoom();
            applyIds();
            highlightDifferences();

        });
}

function visualizeStatechart(svg, container, snapshotNumber) {
    console.log("visualizeStatechart")
    var parser = new DOMParser();
    var doc = parser.parseFromString(svg, "image/svg+xml");
    var originalSVG = doc.documentElement;
    container.style.border = "2px solid grey";
    container.style.boxShadow = "0 0 10px black";
    container.style.margin = "5px";

    if (originalSVG) {
        container.style.display = "block";
        container.appendChild(originalSVG);

        var statechartId = container.id + "originalSVG"

        if (container.id.includes("left")) {
            originalWidth = originalSVG.width.baseVal.valueInSpecifiedUnits - 200;
            originalHeight = originalSVG.height.baseVal.valueInSpecifiedUnits - 200;

            originalSVG.setAttribute("width", originalWidth);
            originalSVG.setAttribute("height", originalHeight);

        }

        else if (container.id.includes("right")) {
            originalSVG.setAttribute("width", originalWidth);
            originalSVG.setAttribute("height", originalHeight);

        }






        d3.select(originalSVG)
            .select("g")
            .attr("id", statechartId);

        //To avoid the cropping effect while zooming, I need to give the svg more height.
        if (originalHeight < originalWidth) originalSVG.height.baseVal.valueInSpecifiedUnits = originalWidth + 1000;
        // Configure the handler to click on the minimap passing originalSVG as a parameter





        //Snapshot description, etc.

        if ((snapshotNumber)) {
            console.log("snapshotNumber")
            var statechartInfoDiv = document.createElement("div");

            if (container.id.includes("left")) {
                statechartInfoDiv.id = "statechartinfodivleft"

                setTimeout(function () {
                generateMinimap(originalSVG, "left");
                }, 500);
            }
            else {
                statechartInfoDiv.id = "statechartinfodivright"
                console.log("debug: " + originalSVG)
                setTimeout(function () {
                generateMinimap(originalSVG, "right");
                }, 500);
            }

            // Ottieni l'elemento <a> corrispondente al snapshotNumber
            var snapshotInfo = document.getElementById("snapshot" + snapshotNumber + "info");
            if (snapshotInfo ) {
                // Ottieni il titolo, la data e la descrizione dagli attributi personalizzati
                var title = snapshotInfo.textContent.trim();
                var date = snapshotInfo.getAttribute("date");
                var description = snapshotInfo.getAttribute("description");

                // Aggiungi il titolo, la data e la descrizione al div creato
                statechartInfoDiv.innerHTML = `
            <h4 style="color: black; font-size: 16px;">${title}</h4>
    <p style="color: black; font-size: 14px;">Date: ${date}</p>
    <p style="color: black; font-size: 14px;">Description: ${description}</p>
        `;
                
                // Imposta lo stile del div
                statechartInfoDiv.style.position = "absolute";
                statechartInfoDiv.style.top = "10px"; // 10px dal bordo superiore del container
                statechartInfoDiv.style.left = "10px"; // 10px dal bordo sinistro del container
                statechartInfoDiv.style.padding = "5px"; // Padding per migliorare leggibilità
                statechartInfoDiv.style.borderRadius = "5px"; // Bordo arrotondato
                statechartInfoDiv.style.border = "2px solid turquoise"; // Contorno nero
                //statechartInfoDiv.style.boxShadow = "0 0 10px turquoise"; // Ombra turchese
            }

            // Aggiungi il div creato al container
            
            document.getElementById("statechartContainer2").appendChild(statechartInfoDiv);
        }

        else { // Case in which I just load the page without selecting the snapshots from the menu, in this case I show two statecharts automatically
            console.log("else")

            
            setTimeout(function () {
                if(container.id.includes("right")) generateMinimap(originalSVG, "right");
                else generateMinimap(originalSVG, "left");
            }, 500);


            var statechartInfoDivLeft = document.createElement("div");
            statechartInfoDivLeft.id = "statechartinfodivleft";


            var title = "Snapshot 0"
            var date = "2024-04-18 08:30 AM"
            var description = "Falcon original"

            // Aggiungi il titolo, la data e la descrizione al div creato
            statechartInfoDivLeft.innerHTML = `
            <h4 style="color: black; font-size: 16px;">${title}</h4>
    <p style="color: black; font-size: 14px;">Date: ${date}</p>
    <p style="color: black; font-size: 14px;">Description: ${description}</p>
        `;

            // Imposta lo stile del div
            statechartInfoDivLeft.style.position = "absolute";
            statechartInfoDivLeft.style.top = "10px"; // 10px dal bordo superiore del container
            statechartInfoDivLeft.style.left = "10px"; // 10px dal bordo sinistro del container
            statechartInfoDivLeft.style.padding = "5px"; // Padding per migliorare leggibilità
            statechartInfoDivLeft.style.borderRadius = "5px"; // Bordo arrotondato
            statechartInfoDivLeft.style.border = "2px solid turquoise"; // Contorno nero
            //statechartInfoDiv.style.boxShadow = "0 0 10px turquoise"; // Ombra turchese
            // Aggiungi il div creato al container
            document.getElementById("statechartContainer").appendChild(statechartInfoDivLeft);

            var statechartInfoDivRight = document.createElement("div");
            statechartInfoDivRight.id = "statechartinfodivright";


            var title = "Snapshot 1"
            var date = "2024-04-12 10:30 AM"
            var description = "Test"

            // Aggiungi il titolo, la data e la descrizione al div creato
            statechartInfoDivRight.innerHTML = `
            <h4 style="color: black; font-size: 16px;">${title}</h4>
    <p style="color: black; font-size: 14px;">Date: ${date}</p>
    <p style="color: black; font-size: 14px;">Description: ${description}</p>
        `;

            // Imposta lo stile del div
            statechartInfoDivRight.style.position = "absolute";
            statechartInfoDivRight.style.top = "10px"; // 10px dal bordo superiore del container
            statechartInfoDivRight.style.left = "10px"; // 10px dal bordo sinistro del container
            statechartInfoDivRight.style.padding = "5px"; // Padding per migliorare leggibilità
            statechartInfoDivRight.style.borderRadius = "5px"; // Bordo arrotondato
            statechartInfoDivRight.style.border = "2px solid turquoise"; // Contorno nero
            statechartInfoDivRight.style.width = "auto";
            //statechartInfoDiv.style.boxShadow = "0 0 10px turquoise"; // Ombra turchese
            // Aggiungi il div creato al container
            document.getElementById("statechartContainer2").appendChild(statechartInfoDivRight);


        }



    }


    else {
        console.error("Invalid original SVG");
        return false;
    }




}

function generateMinimap(originalSVG, container) {
    scaleFactor = 50;
    originalWidth = originalSVG.width.baseVal.valueInSpecifiedUnits;
    originalHeight = originalSVG.height.baseVal.valueInSpecifiedUnits;

    //Needed to avoid certain behaviors while dragging the indicator
    currentY = originalHeight;
    translateY = originalHeight;

    if (originalWidth / scaleFactor < 100 || originalHeight / scaleFactor < 100) {
        scaleFactor = 25;
    }

    minimapWidth = originalWidth / scaleFactor;
    minimapHeight = originalHeight / scaleFactor;
    if (minimapHeight < 100 || minimapWidth < 100) {
        minimapHeight *= 2.5
        minimapWidth *= 2.5
    }
    //console.log("Minimap width: " + minimapWidth + " , minimap height: " + minimapHeight)

    console.log(originalSVG)

    var minimapSVG = originalSVG.cloneNode(true);
    console.log(container)
    minimapSVG.setAttribute("width", minimapWidth);
    minimapSVG.setAttribute("height", minimapHeight);

    // Add content to the minimapContainer
    var minimapContainer = document.getElementById(container + "MinimapContainer");
    minimapContainer.innerHTML = "";
    minimapSVG.setAttribute("id", "minimapSVG" + container);
    minimapContainer.appendChild(minimapSVG);
}

function applyZoom() {

    var statechartLeft = d3.select("#leftContaineroriginalSVG")
    var statechartRight = d3.select("#rightContaineroriginalSVG")

    var zoom = d3.zoom()
        .scaleExtent([0.5, 20])
        .on('zoom', function (event) {
            statechartLeft
                .selectAll("g")
                .attr('transform', event.transform);

            currentZoom = event.transform.k
            //adjustIndicator(event.transform.k, event.transform.x, event.transform.y, event)
        });

    statechartLeft.call(zoom)

    var zoom = d3.zoom()
        .scaleExtent([0.5, 20])
        .on('zoom', function (event) {
            statechartRight
                .selectAll("g")
                .attr('transform', event.transform);

            currentZoom = event.transform.k
            //adjustIndicator(event.transform.k, event.transform.x, event.transform.y, event)
        });

    statechartRight.call(zoom)



}
var textsLeft = [];
var textsRight = [];

//Function that creates a graph-like structure for the state charts.
//Rivedere se è meglio labelare con id, classi, o una via di mezzo! (Ora è con le classi)

/* ESEMPIO DI COME COLORARE UN ARCO:
var pathsToColor = document.getElementsByClassName("E41->0")
d3.selectAll(pathsToColor).style("stroke", "blue") */

function createStatechartStructure() {
    var statechartLeft = d3.select("#leftContaineroriginalSVG");
    var statechartRight = d3.select("#rightContaineroriginalSVG");

    // Funzione per estrarre i dati da un singolo elemento SVG
    function extractDataFromSVG(svg) {
        var data = {};

        svg.selectAll("*").each(function () {
            var element = d3.select(this);
            var titleElement = element.select("title");
            if (!titleElement.empty()) { // Controlla se l'elemento <title> esiste
                var title = titleElement.text();

                data[title] = {};
                var xPathText = ""; // Stringa per memorizzare gli xPath
                var interactionText = ""; // Stringa per memorizzare le interazioni
                element.selectAll("text").each(function () { // Seleziona tutti gli elementi <text>
                    var textContent = d3.select(this).text();
                    if (textContent.includes("/")) {
                        // Se il testo contiene "/", consideralo come xPath
                        xPathText += textContent + ", ";
                        // Aggiungi l'id "xPath" all'elemento HTML che contiene l'xPath
                        d3.select(this).attr("class", "xPath");
                    } else {
                        // Altrimenti, consideralo come interaction
                        interactionText += textContent + ", ";
                        // Aggiungi l'id "interaction" all'elemento HTML che contiene l'interazione
                        d3.select(this).attr("class", "interaction");
                    }
                });
                // Rimuovi l'ultima virgola e lo spazio vuoto dalle stringhe
                xPathText = xPathText.slice(0, -2);
                interactionText = interactionText.slice(0, -2);
                // Salva le stringhe nella struttura dati
                data[title]["xPath"] = xPathText;
                data[title]["interaction"] = interactionText;

                // Cerca l'elemento HTML che ha <polygon>, <path> o <ellipse> come tag e imposta l'id come il titolo
                var polygonElement = element.select("polygon");
                if (!polygonElement.empty()) {
                    polygonElement.attr("class", title);
                }

                var pathElement = element.select("path");
                if (!pathElement.empty()) {
                    pathElement.attr("class", title);
                }

                var ellipseElement = element.select("ellipse");
                if (!ellipseElement.empty()) {
                    ellipseElement.attr("class", title);
                }

                // Salva il contenuto degli altri tag HTML nell'oggetto associato
                element.selectAll(":not(title, text)").each(function () {
                    var tag = this.tagName;
                    var content = d3.select(this).html();
                    data[title][tag] = content;
                });
            }
        });

        return data;
    }

    // Estrai i dati per il container sinistro e destro
    var leftData = extractDataFromSVG(statechartLeft);
    var rightData = extractDataFromSVG(statechartRight);

    // Ora leftData e rightData contengono le strutture dati dei grafi per i rispettivi contenitori
    console.log("Struttura dati per il contenitore sinistro:", leftData);
    console.log("Struttura dati per il contenitore destro:", rightData);
}



function applyIds() {

    textsLeft = []
    textsRight = []

    var statechartLeft = d3.select("#leftContaineroriginalSVG");
    var statechartRight = d3.select("#rightContaineroriginalSVG");

    var nodesLeft = statechartLeft.selectAll(".node");
    var nodesRight = statechartRight.selectAll(".node");

    // Seleziona il primo elemento "text" di ogni nodo nel statechart di sinistra
    nodesLeft.each(function () {
        var textLeft = d3.select(this).select("text").text();
        var titleLeft = d3.select(this).select("title").text();
        console.log(titleLeft)
        d3.select(this).id = titleLeft
        //console.log(textLeft)
        // Controlla se il testo contiene un numero
        //if (!/\d/.test(textLeft)) {
        textsLeft.push(textLeft);
        //}
    });

    // Seleziona il primo elemento "text" di ogni nodo nel statechart di destra
    nodesRight.each(function () {
        var textRight = d3.select(this).select("text").text();
        var titleRight = d3.select(this).select("title").text();
        d3.select(this).id = titleRight

        // Controlla se il testo contiene un numero
        //if (!/\d/.test(textRight)) {
        textsRight.push(textRight);
        //}
    });
}

function clearStatechart(statechart) {

    if (statechart == "left") {

        var container = document.getElementById("leftContainer");

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        var newDiv = document.createElement("div");
        newDiv.id = "leftMinimapContainer";
        container.appendChild(newDiv);

        //document.getElementById("statechartinfodivleft").remove();

    }

    else if (statechart == "right") {

        var container = document.getElementById("rightContainer");

        var elements = document.querySelectorAll("#statechartinfodivright");
        elements.forEach(function (element) {
            element.remove();
        });

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        

        var newDiv = document.createElement("div");
        newDiv.id = "rightMinimapContainer";
        container.appendChild(newDiv);

        console.log("right")

    }
}


function visualizeSnapshot(snapshotNumber) {
    console.log(snapshotNumber)
    clearStatechart("right")
    clearStatechart("left")
    visualizeStatechart(statecharts[0].svg, leftContainer, "none")
    visualizeStatechart(statecharts[snapshotNumber].svg, rightContainer, snapshotNumber);
    applyZoom();
    createStatechartStructure();
    applyIds();
    highlightDifferences();
}




function highlightDifferences() {
    console.log(textsLeft);
    console.log(textsRight);
    var statechartLeft = d3.select("#leftContaineroriginalSVG");
    var statechartRight = d3.select("#rightContaineroriginalSVG");

    var gLeft = statechartLeft.selectAll("g")
    var gRight = statechartRight.selectAll("g")

    var nodesLeft = statechartLeft.selectAll(".node");
    var nodesRight = statechartRight.selectAll(".node");

    nodesLeft.selectAll("polygon").style("fill", "#a3a3a3")
    nodesRight.selectAll("polygon").style("fill", "#a3a3a3")

    var polygonsLeft = nodesLeft.selectAll("polygon");
    var polygonsRight = nodesRight.selectAll("polygon");

    var missingItems = [];

    var encountered = {}; // Oggetto per tenere traccia degli elementi incontrati

    textsLeft.forEach(function (textLeft) {
        if (!textsRight.includes(textLeft)) {
            if (encountered[textLeft]) {
                encountered[textLeft]++;
            } else {
                encountered[textLeft] = 1;
            }
        }
    });

    // Aggiungi tutti gli elementi incontrati con duplicati all'array missingItems
    for (var item in encountered) {
        for (var i = 0; i < encountered[item]; i++) {
            missingItems.push(item);
        }
    }

    // Inizializza un oggetto per tenere traccia degli elementi "nuovi" in textsRight
    var newItems = {};

    // Trova gli elementi "nuovi" in textsRight rispetto a textsLeft
    textsRight.forEach(function (textRight) {
        if (!textsLeft.includes(textRight)) {
            if (newItems[textRight]) {
                newItems[textRight]++;
            } else {
                newItems[textRight] = 1;
            }
        }
    });

    // Aggiungi tutti gli elementi "nuovi" all'array newItemsArray
    var newItemsArray = [];
    for (var item in newItems) {
        for (var i = 0; i < newItems[item]; i++) {
            newItemsArray.push(item);
        }
    }


    console.log(missingItems, encountered);

    console.log(newItemsArray);


    var colorToApply = ""

    // Itera sugli elementi dell'array "missingItems". Vede gli elementi mancanti e li colora di lightcoral
    missingItems.forEach(function (item) {
        // Se l'elemento è un numero, quindi uno stato che è stato tolto e quindi devo colorare tutti i suoi figli...
        if (!isNaN(item)) {
            //console.log(item)
            // Itera su tutti i "g" dello statechart di sinistra
            gLeft.each(function () {


                if (d3.select(this).select("title").text() == item) {
                    colorToApply = "lightcoral"

                    d3.select(this).select("ellipse").style("fill", colorToApply)
                }
                else if (!isNaN(d3.select(this).select("title").text())) colorToApply = "#a3a3a3"

                if (colorToApply == "#a3a3a3") {
                    var polygon = d3.select(this).select("polygon");
                    if (!polygon.empty() && polygon.attr("class") !== "lightcoral") {
                        polygon.style("fill", colorToApply);
                    }
                }

                else if ((colorToApply == "lightcoral")) {
                    d3.select(this).selectAll("polygon").style("fill", colorToApply);
                    //d3.select(this).selectAll("path").attr("stroke", colorToApply);
                }


                if (colorToApply == "lightcoral") {
                    d3.select(this).select("polygon").attr("class", "lightcoral");
                }

            });

            /* gRight.each(function () {


                if (d3.select(this).select("title").text() == item) {
                    colorToApply = "lightcoral"

                    d3.select(this).select("ellipse").style("fill", colorToApply)
                }
                else if (!isNaN(d3.select(this).select("title").text())) colorToApply = "#a3a3a3"

                if (colorToApply == "#a3a3a3") {
                    var polygon = d3.select(this).select("polygon");
                    if (!polygon.empty() && polygon.attr("class") !== "lightcoral") {
                        polygon.style("fill", colorToApply);
                    }
                }

                else if ((colorToApply == "lightcoral")) {
                    d3.select(this).selectAll("polygon").style("fill", colorToApply);
                    //d3.select(this).selectAll("path").attr("stroke", colorToApply);
                }


                if (colorToApply == "lightcoral") {
                    d3.select(this).select("polygon").attr("class", "lightcoral");
                }

            }); */

        }

        else {

            gLeft.each(function () {
                var polygon = d3.select(this).select("polygon");
                var textElement = d3.select(this).select("text");
                if (!polygon.empty() && !textElement.empty()) { // Verifica se esiste un poligono e un elemento di testo all'interno di questo elemento g
                    var text = textElement.text();
                    if (text.includes(item)) {
                        colorToApply = "lightcoral";
                        polygon.style("fill", colorToApply);
                        polygon.attr("class", "lightcoral");
                    }
                }
            });

            /* gRight.each(function () {
                var polygon = d3.select(this).select("polygon");
                var textElement = d3.select(this).select("text");
                if (!polygon.empty() && !textElement.empty()) { // Verifica se esiste un poligono e un elemento di testo all'interno di questo elemento g
                    var text = textElement.text();
                    if (text.includes(item)) {
                        colorToApply = "lightcoral";
                        polygon.style("fill", colorToApply);
                        polygon.attr("class", "lightcoral");
                    }
                }
            }); */

        }
    });


    // Itera sugli elementi dell'array "newItems". Colora gli elementi nuovi di blu.
    newItemsArray.forEach(function (item) {
        // Se l'elemento è un numero, quindi uno stato che è stato tolto e quindi devo colorare tutti i suoi figli...
        if (!isNaN(item)) {
            //console.log(item)
            // Itera su tutti i "g" dello statechart di destra
            gRight.each(function () {


                if (d3.select(this).select("title").text() == item) {
                    colorToApply = "lightblue"

                    d3.select(this).select("ellipse").style("fill", colorToApply)
                }
                else if (!isNaN(d3.select(this).select("title").text())) colorToApply = "#a3a3a3"

                if (colorToApply == "#a3a3a3") {
                    var polygon = d3.select(this).select("polygon");
                    if (!polygon.empty() && polygon.attr("class") !== "lightblue") {
                        polygon.style("fill", colorToApply);
                    }
                }

                else if ((colorToApply == "lightblue")) {
                    d3.select(this).selectAll("polygon").style("fill", colorToApply);
                    //d3.select(this).selectAll("path").attr("stroke", colorToApply);
                }


                if (colorToApply == "lightblue") {
                    d3.select(this).select("polygon").attr("class", "lightblue");
                }

            });

            gLeft.each(function () {


                if (d3.select(this).select("title").text() == item) {
                    colorToApply = "lightblue"

                    d3.select(this).select("ellipse").style("fill", colorToApply)
                }
                else if (!isNaN(d3.select(this).select("title").text())) colorToApply = "#a3a3a3"

                if (colorToApply == "#a3a3a3") {
                    var polygon = d3.select(this).select("polygon");
                    if (!polygon.empty() && polygon.attr("class") !== "lightblue") {
                        polygon.style("fill", colorToApply);
                    }
                }

                else if ((colorToApply == "lightblue")) {
                    d3.select(this).selectAll("polygon").style("fill", colorToApply);
                    //d3.select(this).selectAll("path").attr("stroke", colorToApply);
                }


                if (colorToApply == "lightblue") {
                    d3.select(this).select("polygon").attr("class", "lightblue");
                }

            });
        }

        else {

            gRight.each(function () {
                var polygon = d3.select(this).select("polygon");
                var textElement = d3.select(this).select("text");
                if (!polygon.empty() && !textElement.empty()) { // Verifica se esiste un poligono e un elemento di testo all'interno di questo elemento g
                    var text = textElement.text();
                    if (text.includes(item)) {
                        colorToApply = "lightblue";
                        polygon.style("fill", colorToApply);
                        polygon.attr("class", "lightblue");
                    }
                }
            });

            gLeft.each(function () {
                var polygon = d3.select(this).select("polygon");
                var textElement = d3.select(this).select("text");
                if (!polygon.empty() && !textElement.empty()) { // Verifica se esiste un poligono e un elemento di testo all'interno di questo elemento g
                    var text = textElement.text();
                    if (text.includes(item)) {
                        colorToApply = "lightblue";
                        polygon.style("fill", colorToApply);
                        polygon.attr("class", "lightblue");
                    }
                }
            });

        }
    });

}



// Chiamata alla funzione highlightDifferences()
highlightDifferences();


