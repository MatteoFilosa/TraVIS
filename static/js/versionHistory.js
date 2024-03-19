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
        
        visualizeStatecharts(statecharts[0].svg,leftContainer);
        visualizeStatecharts(statecharts[1].svg,rightContainer);
          applyZoom()
          applyIds()
          highlightDifferences()

      });
}

function visualizeStatecharts(svg,container){
    var parser = new DOMParser();
    var doc = parser.parseFromString(svg, "image/svg+xml");
    var originalSVG = doc.documentElement;

    if (originalSVG) {
        container.style.display = "block";
        graphLayout(originalSVG);
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
var textsLeft = [];
var textsRight = [];

function applyIds() {
    var statechartLeft = d3.select("#leftContaineroriginalSVG");
    var statechartRight = d3.select("#rightContaineroriginalSVG");

    var nodesLeft = statechartLeft.selectAll(".node");
    var nodesRight = statechartRight.selectAll(".node");

    // Seleziona il primo elemento "text" di ogni nodo nel statechart di sinistra
    nodesLeft.each(function () {
        var textLeft = d3.select(this).select("text").text();

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

    console.log(missingItems);

    console.log(missingItems, encountered);

    console.log(missingItems)


    var colorToApply = ""

    // Itera sugli elementi dell'array "missingItems"
    missingItems.forEach(function (item) {
        // Se l'elemento è un numero
        if (!isNaN(item)) {
            console.log(item)
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
            
        }
    });
}



// Chiamata alla funzione highlightDifferences()
highlightDifferences();


function graphLayout(svg) {
    //labelsCount = 0;
    var textElements = svg.querySelectorAll("g.node text");
    var edgesCount = svg.querySelectorAll("g.edge").length/2; //Divided 2 because the svg computes 2 edges: state ---(edge)--> label --(edge)--->. But the real edge is only 1.
    var statesCount = svg.querySelectorAll("ellipse").length;
 
    if((window.location.href.includes("replay") === false)){

 
    textElements.forEach(function (textElement) {
        
        var node = textElement.parentElement;
        //var xPath = "";
        //console.log(node)

        
        if (node.classList.contains("node")) {
        /*
            if ((textElement.textContent.includes('[')) && (textElement.textContent.includes(']'))) {
                xPath = textElement;
                xPath.classList.add("xPath");
                xPath.style.display = 'none';

                // Tooltip
                node.addEventListener("mouseover", function () {
                    tooltip.textContent = xPath.innerHTML;
                    tooltip.style.display = 'block';
                    adjustTooltipPosition();
                    //console.log("mouseover detected")
                });

                node.addEventListener("mouseout", function () {
                    tooltip.style.display = 'none';
                    //console.log("mouseout detected")
                });
            } */

            // Increase font size of non-hidden text
            /* if (textElement.innerHTML.length > 3) {
                var fontSize = parseFloat(textElement.style.fontSize) || 12; // Default font size is 12px
                textElement.style.fontSize = (fontSize + 4) + 'px';

                var textY = parseFloat(textElement.getAttribute("y"));
                textElement.classList.add("nodeText");
                textElement.setAttribute("y", textY + 8);
            } */

            // Check for "mousemove" or "mouseup" and set child polygon's fill property accordingly
            var firstString = textElement.textContent.split(',')[0];
            var polygon = node.querySelector('polygon');
            //if (polygon) labelsCount++;
          

            if (firstString.includes('mousemove')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "mousemove"
                    
                }
            } else if (firstString.includes('mouseup')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "mouseup"
                }
            }
            else if (firstString.includes('mousedown')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "mousedown"
                }
            }
            else if (firstString.includes('click')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "click"
                }
            }
            else if (firstString.includes('dblclick')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "dblclick"
                }
            }
            else if (firstString.includes('wheel')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "wheel"
                }
            }
            else if (firstString.includes('facsimile_back')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "facsimile_back"
                }
            }
            else if (firstString.includes('mouseout')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "mouseout"
                }
            }
            else if (firstString.includes('mouseover')) {
                if (polygon) {
                    polygon.setAttribute('fill', getColor(firstString)); // Set color for "mouseover"
                }
            }
        }
        
    });
    }
    

}
const eventTypes=["mouseover","click","brush","mousemove","mousedown","wheel","mouseout","mouseup","dblclick","facsimile_back"];
// more available colors: c49c94,e377c2,f7b6d2,7f7f7f,c7c7c7,bcbd22,dbdb8d,17becf,9edae5
// Function to get color based on event name
function getColor(eventName) {
    if (eventName.includes("mouseover")) {
        return "#1f77b4";
    } else if (eventName.includes("dblclick")) {
        return "#aec7e8";
    } else if (eventName.includes("click")) {
        return "#ff7f0e";
    } else if (eventName.includes("brush")) {
        return "#ffbb78";
    } else if (eventName.includes("mousemove")) {
        return "#2ca02c";
    } else if (eventName.includes("mousedown")) {
        return "#98df8a";
    }else if (eventName.includes("wheel")) {
        return "#8c564b";
    } else if (eventName.includes("mouseout")) {
        return "#ff9896";
    } else if (eventName.includes("mouseup")) {
        return "#9467bd";
    } else if (eventName.includes("facsimile_back")) {
        return "#c5b0d5";
    } else {
        console.log(eventName);
        return "red";
    }
}

function colorLegend(){
    const colorLegend = document.getElementById("colorLegend");

    eventTypes.forEach(element => {
        
        let colorElementDiv = document.createElement("div");
        colorElementDiv.classList.add("legendElementDiv");

        let colorElementImg = document.createElement("div");
        colorElementImg.classList.add("colorDiv");
        colorElementImg.style.backgroundColor = getColor(element);

        let colorElementText = document.createElement("p");
        colorElementText.textContent=element;

        colorElementDiv.appendChild(colorElementImg);
        colorElementDiv.appendChild(colorElementText);

        colorLegend.appendChild(colorElementDiv);
    });

}

function toggleLegend(){
    const colorLegend = document.getElementById("colorLegend");
    const buttonImg = document.getElementById("colorLegendButton");
    //console.log(colorLegend.getAttribute("data-visible"));
    if(colorLegend.getAttribute("data-visible")=="false"){
        colorLegend.setAttribute("data-visible", "true");
        buttonImg.style.transform = "rotate(0deg)";
        colorLegend.style.height="310px";
    }else{
        colorLegend.setAttribute("data-visible","false");
        buttonImg.style.transform = "rotate(180deg)";
        colorLegend.style.height="31px";
    }
}
