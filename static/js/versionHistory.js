var leftContainer,rightContainer;
var statecharts={};
var minimapWidth = 0, minimapHeight = 0, scaleFactor = 0, originalHeight = 0, originalWidth = 0, currentX = 0, currentY = 0, translateX = 0, translateY = 0, minimapRatio = 0, scale = 1, svgWidth = 0, svgHeight = 0;

window.onload = function () {
    leftContainer = document.getElementById("leftContainer");
    rightContainer = document.getElementById("rightContainer");
    document.getElementById("colorLegend").style.display = "none";
    
    getVersionHistory();
}

async function getVersionHistory(){
    const url = "http://127.0.0.1:5000/get_statechart_comparison";
    fetch(url)
      .then((response) => response.json())
      .then((json) => {
        statecharts = json.files;
        console.log(statecharts);
        
        visualizeStatechart(statecharts[0].svg,leftContainer);
        visualizeStatechart(statecharts[1].svg,rightContainer);
        applyZoom();
        applyIds();
        highlightDifferences();

      });
}

function visualizeStatechart(svg,container,snapshotNumber){
    console.log("visualizeStatechart")
    var parser = new DOMParser();
    var doc = parser.parseFromString(svg, "image/svg+xml");
    var originalSVG = doc.documentElement;

    if (originalSVG) {
        container.style.display = "block";
        container.appendChild(originalSVG);

        var statechartId = container.id + "originalSVG"

        if(container.id.includes("left")){
            originalWidth = originalSVG.width.baseVal.valueInSpecifiedUnits -200;
            originalHeight = originalSVG.height.baseVal.valueInSpecifiedUnits - 200;

            originalSVG.setAttribute("width", originalWidth);
            originalSVG.setAttribute("height", originalHeight);

        }

        else if (container.id.includes("right")) {
            originalSVG.setAttribute("width", originalWidth);
            originalSVG.setAttribute("height", originalHeight);

        }

        

        //TODO: set up minimap for each container

        // Generate and set up the minimap
        //generateMinimap(originalSVG);
        //Set the id of the originalSVG
        d3.select(originalSVG)
            .select("g")
            .attr("id", statechartId);

        //To avoid the cropping effect while zooming, I need to give the svg more height.
        if(originalHeight < originalWidth) originalSVG.height.baseVal.valueInSpecifiedUnits = originalWidth + 1000;
        // Configure the handler to click on the minimap passing originalSVG as a parameter
      
        container.style.border = "2px solid grey"; 
        container.style.boxShadow = "0 0 10px black";

        //Snapshot description, etc.

        if (snapshotNumber) {
            console.log("snapshotNumber")
            var statechartInfoDiv = document.createElement("div");

            if (container.id.includes("left")) statechartInfoDiv.id = "statechartinfodivleft"
            else statechartInfoDiv.id = "statechartinfodivright"

            // Ottieni l'elemento <a> corrispondente al snapshotNumber
            var snapshotInfo = document.getElementById("snapshot" + snapshotNumber + "info");
            if (snapshotInfo) {
                // Ottieni il titolo, la data e la descrizione dagli attributi personalizzati
                var title = snapshotInfo.textContent.trim();
                var date = snapshotInfo.getAttribute("date");
                var description = snapshotInfo.getAttribute("description");

                // Aggiungi il titolo, la data e la descrizione al div creato
                statechartInfoDiv.innerHTML = `
            <h3 style="color: black;">${title}</h3>
            <p style="color: black;">Date: ${date}</p>
            <p style="color: black;">Description: ${description}</p>
        `;

                // Imposta lo stile del div
                statechartInfoDiv.style.position = "absolute";
                statechartInfoDiv.style.top = "10px"; // 10px dal bordo superiore del container
                statechartInfoDiv.style.left = "10px"; // 10px dal bordo sinistro del container
                statechartInfoDiv.style.padding = "10px"; // Padding per migliorare leggibilità
                statechartInfoDiv.style.borderRadius = "10px"; // Bordo arrotondato
                statechartInfoDiv.style.border = "2px solid turquoise"; // Contorno nero
                //statechartInfoDiv.style.boxShadow = "0 0 10px turquoise"; // Ombra turchese
            }

            // Aggiungi il div creato al container
            document.getElementById("statechartContainer2").appendChild(statechartInfoDiv);
        }

        else{
            console.log("else")
            var statechartInfoDivLeft = document.createElement("div");
            statechartInfoDivLeft.id = "statechartinfodivleft";

            
                var title = "Snapshot 0"
                var date = "2024-04-18 08:30 AM"
                var description = "Falcon original vis.system "

                // Aggiungi il titolo, la data e la descrizione al div creato
            statechartInfoDivLeft.innerHTML = `
            <h3 style="color: black;">${title}</h3>
            <p style="color: black;">Date: ${date}</p>
            <p style="color: black;">Description: ${description}</p>
        `;

                // Imposta lo stile del div
            statechartInfoDivLeft.style.position = "absolute";
            statechartInfoDivLeft.style.top = "10px"; // 10px dal bordo superiore del container
            statechartInfoDivLeft.style.left = "10px"; // 10px dal bordo sinistro del container
            statechartInfoDivLeft.style.padding = "10px"; // Padding per migliorare leggibilità
            statechartInfoDivLeft.style.borderRadius = "10px"; // Bordo arrotondato
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
            <h3 style="color: black;">${title}</h3>
            <p style="color: black;">Date: ${date}</p>
            <p style="color: black;">Description: ${description}</p>
        `;

            // Imposta lo stile del div
            statechartInfoDivRight.style.position = "absolute";
            statechartInfoDivRight.style.top = "10px"; // 10px dal bordo superiore del container
            statechartInfoDivRight.style.left = "10px"; // 10px dal bordo sinistro del container
            statechartInfoDivRight.style.padding = "10px"; // Padding per migliorare leggibilità
            statechartInfoDivRight.style.borderRadius = "10px"; // Bordo arrotondato
            statechartInfoDivRight.style.border = "2px solid turquoise"; // Contorno nero
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



function applyZoom(){

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
var textsLeft;
var textsRight;

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
        console.log(textLeft)
        // Controlla se il testo contiene un numero
        //if (!/\d/.test(textLeft)) {
            textsLeft.push(textLeft);
        //}
    });

    // Seleziona il primo elemento "text" di ogni nodo nel statechart di destra
    nodesRight.each(function () {
        var textRight = d3.select(this).select("text").text();

        // Controlla se il testo contiene un numero
        //if (!/\d/.test(textRight)) {
            textsRight.push(textRight);
        //}
    });
}

function clearStatechart(statechart){

    if(statechart == "left"){

        var container = document.getElementById("leftContainer");

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        document.getElementById("statechartinfodivleft").remove();

    }

    else if(statechart == "right"){

        var container = document.getElementById("rightContainer");
        var elements = document.querySelectorAll("#statechartinfodivright");
        elements.forEach(function (element) {
            element.remove();
        });
        
       

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        console.log("right")
        
    }

}


function visualizeSnapshot(snapshotNumber){
    console.log(snapshotNumber)
    clearStatechart("right")
    visualizeStatechart(statecharts[snapshotNumber].svg, rightContainer, snapshotNumber);
    applyZoom();
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

                
                if (d3.select(this).select("title").text() == item){
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
                
                else if ((colorToApply == "lightcoral")){
                    d3.select(this).selectAll("polygon").style("fill", colorToApply);
                    //d3.select(this).selectAll("path").attr("stroke", colorToApply);
                }
                
                
                if(colorToApply == "lightcoral"){
                    d3.select(this).select("polygon").attr("class", "lightcoral");
                }
                
            });

            gRight.each(function () {


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
            
        }

        else{

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

            gRight.each(function () {
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


