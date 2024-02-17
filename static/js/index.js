//#region Global Variables
var systemURL;
var loadButton;
var loadingIcon;
var statecharts;
var statechartSVG;
var matchingName = null;
var matchingSvg = null;
var statechartContainer;
var statechart;
var lastStatechartUrl = "";
var minimapHidden = false;
var statesCount = 0, edgesCount = 0, labelsCount = 0;
var json, url;
var currentZoom = 1;
var minimapWidth = 0, minimapHeight = 0, scaleFactor = 0, originalHeight = 0, originalWidth = 0, currentX = 0, currentY = 0, translateX = 0, translateY = 0, minimapRatio = 0, scale = 1, svgWidth = 0, svgHeight = 0;

// Array of colors is given  
/* let color1 = d3.schemeCategory10[0];
let color2 = d3.schemeCategory10[1];
let color3 = d3.schemeCategory10[2];
let color4 = d3.schemeCategory10[3];
let color5 = d3.schemeCategory10[4];
let color6 = d3.schemeCategory10[5];
let color7 = d3.schemeCategory10[6];
let color8 = d3.schemeCategory10[7];
let color9 = d3.schemeCategory10[8];
let color10 = d3.schemeCategory10[9]; */

//#endregion

// Function executed when index.html is loaded
window.onload = function () {
    var sideBarCollapse = document.getElementById("sidebarCollapse");
    loadingIcon = document.getElementById("loadingIcon");
    loadButton = document.getElementById("loadSystem");
    statechartSVG = document.getElementById("statechartSVG");

    sideBarCollapse.addEventListener("click", function () {
        sideBarCollapse.classList.toggle("active");
        document.getElementById("sidebar").classList.toggle("active");
    });
    colorLegend();
    graphviz();

    // If the user wants to see the state chart highlighted from the user traces page
    if ((JSON.parse(localStorage.getItem("selectedTrace")) != null) || (JSON.parse(localStorage.getItem("loadedTraces")) != null)){
        console.log("eh")
        systemURL = "https://vega.github.io/falcon/flights/"
        LoadSystem();
        
    }
    
};


//#region Resize Containers
function resizeContainers(layoutType) {
    var statechartContainer = document.getElementById("statechartContainer");
    var websiteContainer = document.getElementById("websiteContainer");
    var minimapContainer = document.getElementById("minimapContainer");
    var minimapSVG = document.getElementById("minimapSVG");
    var indicator = document.getElementById("indicator");

    switch (layoutType) {
        case "website":
            statechartContainer.style.minWidth = '29.5%';
            statechartContainer.style.height = '24%';
            websiteContainer.style.minWidth = '69.5%';
            websiteContainer.style.height = '100%';

            // Nascondi gli elementi nel caso "website"
            minimapContainer.style.display = 'none';
            minimapSVG.style.display = 'none';
            indicator.style.display = 'none';

            break;
        case "statechart":
            websiteContainer.style.minWidth = '29.5%';
            websiteContainer.style.height = '24%';
            statechartContainer.style.minWidth = '69.5%';
            statechartContainer.style.height = '100%';

            // Mostra gli elementi negli altri casi
            minimapContainer.style.display = 'block';
            minimapSVG.style.display = 'block';
            indicator.style.display = 'block';

            console.log("Case: statechart");
            break;
        default:
            statechartContainer.style.minWidth = '49.5%';
            statechartContainer.style.height = '100%';
            websiteContainer.style.minWidth = '49.5%';
            websiteContainer.style.height = '100%';

            // Mostra gli elementi negli altri casi
            minimapContainer.style.display = 'block';
            minimapSVG.style.display = 'block';
            indicator.style.display = 'block';

            console.log("Case: default");
    }
}
//#endregion

//#region Minimap

// Function to generate the minimap
function generateMinimap(originalSVG) {
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
    if(minimapHeight < 100 || minimapWidth < 100){
        minimapHeight *= 2.5
        minimapWidth  *= 2.5
    }
    console.log("Minimap width: " + minimapWidth + " , minimap height: " + minimapHeight)


    var minimapSVG = originalSVG.cloneNode(true);
    minimapSVG.setAttribute("width", minimapWidth);
    minimapSVG.setAttribute("height", minimapHeight);

    // Add content to the minimapContainer
    var minimapContainer = document.getElementById("minimapContainer");
    minimapContainer.innerHTML = "";
    minimapSVG.setAttribute("id", "minimapSVG");
    minimapContainer.appendChild(minimapSVG);
}


let initialX, initialY;
let isDragging = false;

function indicatorDragStarted() {
    indicator.classList.add("dragging");
    isDragging = true;

    initialX = parseFloat(indicator.style.left);
    initialY = parseFloat(indicator.style.top);
}

function indicatorDragged() {
    if (!isDragging) return;

    const indicatorRect = indicator.getBoundingClientRect();
    const minimapRect = minimapContainer.getBoundingClientRect();

    // Calculate the position of the indicator based on the drag
    let newX = event.clientX - minimapRect.left - indicatorRect.width / 2;
    let newY = event.clientY - minimapRect.top - indicatorRect.height / 2;

    // Ensure that the indicator stays within the bounds of minimapContainer
    newX = Math.min(Math.max(newX, 0), minimapRect.width - indicatorRect.width);
    newY = Math.min(Math.max(newY, 0), minimapRect.height - indicatorRect.height);

    // Update the position of the indicator
    indicator.style.left = newX + "px";
    indicator.style.top = newY + "px";

    const deltaX = parseFloat(indicator.style.left) - initialX;
    const deltaY = parseFloat(indicator.style.top) - initialY;

    translateX -= deltaX * ((svgWidth / minimapWidth) / 1.5);
    translateY -= deltaY * ((svgHeight / minimapHeight) / 2);
    console.log(translateX, translateY, deltaX, deltaY)


    //If...return!

    statechart.attr("transform", "translate(" + translateX + "," + translateY + ")");




    

    
}

function indicatorDragEnded() {
    indicator.classList.remove("dragging");
    isDragging = false;

    // Calcola la differenza in pixel tra la posizione iniziale e finale
    const deltaX = parseFloat(indicator.style.left) - initialX;
    const deltaY = parseFloat(indicator.style.top) - initialY;

    // Update the currentX and currentY values after dragging ends
    //currentX = translateX;
    //currentY = translateY;


    // Aggiorna anche la differenza in pixel
    console.log("Differenza X:", deltaX, "Differenza Y:", deltaY);
  
    
}


// Function to configure the click handler on the minimap
function setupMinimapClickHandler(originalSVG) {
    const minimapContainer = document.getElementById("minimapContainer");
    const statechartSVG = document.getElementById("statechartSVG");
    svgHeight = statechartSVG.getBoundingClientRect().height;
    svgWidth = statechartSVG.getBoundingClientRect().width;
    console.log("Svg width: " + svgWidth + ", svg height: " + svgHeight)
    
    //To adjust the indicator's height basing on the original svg's height
    minimapRatio = 800 / svgHeight
    if (minimapRatio > 1) minimapRatio = 1
    console.log("Minimap ratio: " + minimapRatio)
    const indicator = document.createElement("div");
    indicator.id = "indicator";
    indicator.style.position = "absolute";
    indicator.style.width = minimapWidth + "px";
    indicator.style.height = (minimapRatio * 75) + "%";
    indicator.style.backgroundColor = "transparent";
    indicator.style.borderTop = "2px solid #554e8d";
    indicator.style.borderLeft = "2px solid #554e8d";
    indicator.style.borderRight = "2px solid #554e8d";
    indicator.style.borderBottom = "2px solid #554e8d";
    indicator.style.transition = "all 0.3s ease-in-out";

    // Append the indicator to the minimapContainer
    minimapContainer.appendChild(indicator);

    // Set the top position relative to the minimapContainer
    indicator.style.top = "45%";
    indicator.style.left = "0";
    indicator.style.bottom = "0";
    indicator.style.right = "0";

    // Event listener per il click sul minimap
    minimapContainer.addEventListener("click", function (event) {
        // Clicked position on the minimap
        var clickedX = event.offsetX;
        var clickedY = event.offsetY;

        // Calculate the proportion relative to the total height of the minimap
        var proportion = minimapHeight / clickedY;

        // Calculate the maximum scrollable height of the SVG
        var maxScroll = statechartSVG.scrollHeight - statechartSVG.clientHeight;

        // Calculate the new scroll position of the SVG
        var newScrollPosition = maxScroll / proportion;

        // Ensure that the new scroll position is within the allowed limits
        statechartSVG.scrollTop = Math.min(newScrollPosition, maxScroll);

     
    });


    // Event listener for dragging the indicator
    indicator.addEventListener("mousedown", function () {
        indicatorDragStarted();

        document.addEventListener("mousemove", indicatorDragged);
        document.addEventListener("mouseup", function () {
            document.removeEventListener("mousemove", indicatorDragged);
            indicatorDragEnded();
        });
    });

    // Reset Button
    const resetButton = document.createElement("button");
    resetButton.innerHTML = "Reset";
    resetButton.className = "btn btn-info";
    resetButton.style.position = "absolute";
    resetButton.style.bottom = "5px";
    resetButton.style.right = "5px";
    resetButton.addEventListener("click", function () {


    statechart.attr("transform", "translate(0 ," + originalHeight + ")");

        var zoom = d3.zoom()
            .scaleExtent([1, 20])
            .on('zoom', function (event) {
                statechart
                    .selectAll("g")
                    .attr('transform', event.transform);
                console.log(event)
                adjustIndicator(event.transform.k, event.transform.x, event.transform.y, event)
            });
        

        statechart.transition()
            .duration(500)  // Durata dell'animazione di reset, se desiderato
            .call(zoom.transform, d3.zoomIdentity);

        currentZoom = 1;

        indicator.style.width = minimapWidth + "px";
        indicator.style.height = (minimapRatio * 80) + "%";
        indicator.style.top = "40%";
        indicator.style.left = "0";
        indicator.style.bottom = "0";
        indicator.style.right = "0";

        scale = 1, currentX = 0, currentY = originalHeight, translateX = 0, translateY = currentY;
    });

    minimapContainer.appendChild(resetButton);

    // Toggle Button
    const toggleButton = document.createElement("button");
    toggleButton.innerHTML = "Hide";
    toggleButton.className = "btn btn-info";
    toggleButton.style.position = "absolute";
    toggleButton.style.bottom = "5px";
    toggleButton.style.left = "5px";
    toggleButton.addEventListener("click", function () {
        if (minimapHidden) {
            // Show the minimap container
            document.getElementById("indicator").style.display = "block";
            document.getElementById("minimapSVG").style.display = "block";
            resetButton.style.display = "block";
            toggleButton.innerHTML = "Hide";
            toggleButton.style.left = "5px";
            minimapHidden = false;
        } else {
            // Hide the minimap container
            toggleButton.innerHTML = "Show";
            document.getElementById("indicator").style.display = "none";
            document.getElementById("minimapSVG").style.display = "none";
            resetButton.style.display = "none";
            toggleButton.style.left = "-50px";
            minimapHidden = true;
        }
    });

    minimapContainer.appendChild(toggleButton);
}







function adjustIndicator(scale, currentX, currentY, event) {
    console.log(statechart);
    var indicator = document.getElementById("indicator");

    // New positions for inicator calculation
    var newLeft = ((currentX / scale / scaleFactor)) * -1;
    var newTop = (currentY / scale / scaleFactor);

    console.log(newTop)
    console.log(minimapContainer.clientHeight - indicator.clientHeight)

    // To let the indicator stay in the boundaries of the minimap
    newLeft = Math.min(Math.max(newLeft, 0), minimapContainer.clientWidth - indicator.clientWidth);
    newTop = Math.min(Math.max(newTop, 0), minimapContainer.clientHeight - indicator.clientHeight);

    //Needed otherwise the indicator goes in the opposite direction in the Y-axis
    if (event.sourceEvent != null){
        if (event.sourceEvent.type != "wheel") newTop = (minimapContainer.clientHeight - indicator.clientHeight) - newTop
    }
    
  
    indicator.style.left = newLeft + "px";
    indicator.style.top = newTop + "px"; 

    
    const newWidth = minimapWidth / scale;
    const newHeight = minimapHeight / scale;

    indicator.style.width = newWidth + "px";
    indicator.style.height = newHeight + "px";
}


//#endregion

//#region Statechart

//user story 4!!!!!!!
function highlightStatechart(interaction_types) {
    
    document.getElementById("colorLegend").style.display = 'none';

    // Select nodes, polygons, and texts
    var nodes = d3.select("#originalSVG").selectAll(".node");
    var polygons = nodes.selectAll("polygon");
    var texts = nodes.selectAll("text");

    var interactionFrequency = {}; // Object to store interaction frequency

    for (let i = 0; i < interaction_types.length; i++) {
        var event = "'" + interaction_types[i].event + "'";
        var css = interaction_types[i].css;

        var interaction = event + " on " + "'" + css + "'";
        console.log(interaction);

        // The brush interaction decomposes into three different interactions
        if (interaction_types[i].event === "brush") {
            var mousedownString = "'mousedown' on " + "'" + css + "'";
            interactionFrequency[mousedownString] = (interactionFrequency[mousedownString] || 0) + 1;

            var mousemoveString = "'mousemove' on " + "'" + css + "'"
            interactionFrequency[mousemoveString] = (interactionFrequency[mousemoveString] || 0) + 1;

            var mouseupString = "'mouseup' on " + "'" + css + "'"
            interactionFrequency[mouseupString] = (interactionFrequency[mouseupString] || 0) + 1;
        } else {
            interactionFrequency[interaction] = (interactionFrequency[interaction] || 0) + 1; // Frequency 
        }
    }

    // Viridis frequency scale
    var maxFrequency = d3.max(Object.values(interactionFrequency));
    var colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, maxFrequency]);

    // Update polygon fill colors based on interaction frequency
    polygons.style("fill", function () {
        var nodeText = d3.select(this.parentNode).select("text").text();
        var interaction = interactionFrequency[nodeText] || 0;

        // Color gray if there are no interactions
        if (interaction === 0) {
            return "#7373733b"; // or "grey"
        }

        // Use the Viridis color scale
        return colorScale(interaction);
    });

    texts.style("fill", "white"); // Set text color to white

    // Create and update traceInfo div using plain HTML
    var traceInfoDiv = document.getElementById("traceInfo");
    if (!traceInfoDiv) {
        traceInfoDiv = document.createElement("div");
        traceInfoDiv.id = "traceInfo";
        traceInfoDiv.style.position = "absolute";
        traceInfoDiv.style.top = "150px";
        traceInfoDiv.style.right = "10px";
        traceInfoDiv.style.background = "white";
        traceInfoDiv.style.width = "180px";
        traceInfoDiv.style.padding = "10px";
        traceInfoDiv.style.display = "flex";
        traceInfoDiv.style.flexDirection = "column";
        traceInfoDiv.style.borderTop = "2px solid #554e8d";
        traceInfoDiv.style.borderLeft = "2px solid #554e8d";
        traceInfoDiv.style.borderRight = "2px solid #554e8d";
        traceInfoDiv.style.borderBottom = "2px solid #554e8d";

        // Add an image to the traceInfo div
        var img = document.createElement("img");
        img.src = "images/viridis.png";
        img.alt = "Viridis Image";
        img.style.maxWidth = "100%";
        traceInfoDiv.appendChild(img);

        // Add a small number representing the maximum number of interactions
        var interactionCount = document.createElement("div");
        interactionCount.className = "interaction-count";
        interactionCount.style.color = "black";
        interactionCount.textContent = "Max Interactions: " + maxFrequency;
        traceInfoDiv.appendChild(interactionCount);

        // Append the traceInfo div to the statechartContainer
        document.getElementById("statechartContainer").appendChild(traceInfoDiv);
    }

    // Add content to the traceInfo div
    traceInfoDiv.innerHTML += "Trace selected: " + JSON.parse(localStorage.getItem("selectedTraceID"));

    localStorage.removeItem("selectedTrace");
    localStorage.removeItem("selectedTraceID");
    
}


function highlightStatechartMultiple(loadedTraces, selectedTraces) {
    document.getElementById("colorLegend").style.display = 'none';

    // Select nodes, polygons, and texts
    var nodes = d3.select("#originalSVG").selectAll(".node");
    var polygons = nodes.selectAll("polygon");
    var texts = document.querySelectorAll("#originalSVG .node text");
    var traceIndex = 0;

    // Initialize interactionColors and colorScales outside the loop
    var interactionColors = {};
    var colorScales = {};

    // Initialize traceInteractionFrequencies
    var traceInteractionFrequencies = {};

    for (let i = 0; i < loadedTraces.length; i++) {

        if (loadedTraces[i].name.includes(selectedTraces[traceIndex])) {

            // Initialize color scale for the current trace
            if (!colorScales[selectedTraces[traceIndex]]) {
                colorScales[selectedTraces[traceIndex]] = d3.scaleSequential(d3.interpolateBlues).domain([0, selectedTraces.length]);
            }

            try {
                var userTraceArray = JSON.parse(loadedTraces[i].user_trace);

                // Initialize traceInteractionFrequencies for the current trace
                traceInteractionFrequencies[selectedTraces[traceIndex]] = {};

                // Iterate over user_trace events in the current trace
                userTraceArray.forEach(function (interaction) {
                    var eventName = interaction.event;

                    // Color gray if there are no interactions
                    if (!interactionColors[eventName]) {
                        interactionColors[eventName] = colorScales[selectedTraces[traceIndex]](Object.keys(interactionColors).length + 1);
                    }

                    // Store interaction frequency for the current trace
                    traceInteractionFrequencies[selectedTraces[traceIndex]][eventName] = interactionColors[eventName];
                    console.log(traceInteractionFrequencies);
                });

                // Update polygon fill colors based on interaction frequency for the current trace
                polygons.each(function () {
                    
                    var nodeText = d3.select(this.parentNode).select("text").text();
                    var interactionColor = traceInteractionFrequencies[selectedTraces[traceIndex]][nodeText];
                    console.log(interactionColor)
                    if (interactionColor) {
                        console.log("lastCheck")
                        d3.select(this).style("fill", interactionColor);
                    }
                });

                // Set text color to white
                texts.forEach(function (text) {
                    text.style.fill = "white";
                });

                // Increment traceIndex for the next selected trace
                traceIndex += 1;
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        }
    }

    localStorage.removeItem("selectedTraces");
    localStorage.removeItem("loadedTraces");
}
















function graphLayout(svg) {
    //labelsCount = 0;
    var textElements = svg.querySelectorAll("g.node text");
    var edgesCount = svg.querySelectorAll("g.edge").length/2; //Divided 2 because the svg computes 2 edges: state ---(edge)--> label --(edge)--->. But the real edge is only 1.
    var statesCount = svg.querySelectorAll("ellipse").length;
    
    document.getElementById("edges").innerHTML = edgesCount;
    document.getElementById("states").innerHTML = statesCount;

 
    //var tooltip = document.getElementById("tooltip");

    /* function adjustTooltipPosition() {
        var rect = tooltip.getBoundingClientRect();
        var maxX = window.innerWidth - rect.width;
        var maxY = window.innerHeight - rect.height;
        var x = Math.min(Math.max(event.pageX, 0), maxX);
        var y = Math.min(Math.max(event.pageY, 0), maxY);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
 */
    textElements.forEach(function (textElement) {
        
        var node = textElement.parentElement;
        //var xPath = "";
        //console.log(node)


        // Hide Xpath
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

    //GRAPH INFO

    // Select all title elements within the SVG
    var titles = svg.querySelectorAll("title");

    // Create an object to keep track of the edge count for each node
    var nodeEdgesCount = {};

    // Iterate through each title element
    titles.forEach(function (title) {
        var titleText = title.innerHTML;

        // Check if the title contains the format "[number]->E[number]"
        if (titleText.includes("-&gt;E")) {
            // Split the title text into parts based on the "->E" substring
            var parts = titleText.split("-&gt;E");

            // Extract the node number from the first part
            var nodeNumber = parseInt(parts[0]);

            // Add the node to the object or increment the edge count if the node already exists
            nodeEdgesCount[nodeNumber] = (nodeEdgesCount[nodeNumber] || 0) + 1;
        }
    });

    // Calculate the degree of each node and sum up all degrees
    var totalDegrees = 0;
    var totalNodes = 0;
    var maxDegree = -1; // Initialize to a value lower than any possible degree
    var minDegree = Infinity; // Initialize to a value higher than any possible degree
    var nodeWithMaxDegree, nodeWithMinDegree;

    for (var nodeNumber in nodeEdgesCount) {
        var degree = nodeEdgesCount[nodeNumber];

        // Print the number of edges for each node
        console.log("Node " + nodeNumber + ": " + degree + " edges");

        // Update max and min degrees along with corresponding nodes
        if (degree > maxDegree) {
            maxDegree = degree;
            nodeWithMaxDegree = nodeNumber;
        }

        if (degree < minDegree) {
            minDegree = degree;
            nodeWithMinDegree = nodeNumber;
        }

        totalDegrees += degree;
        totalNodes++;
    }

    // Calculate the average degree
    var averageDegree = totalDegrees / totalNodes;

    // Print the max and min degrees along with corresponding nodes
    document.getElementById("maxDeg").innerHTML=`${maxDegree} in Node ${nodeWithMaxDegree}`;
    console.log("Max Degree: " + maxDegree + " (Node " + nodeWithMaxDegree + ")");
    console.log("Min Degree: " + minDegree + " (Node " + nodeWithMinDegree + ")");

    // Print the average degree
    document.getElementById("avgDeg").innerHTML=`${averageDegree.toFixed(2)}`;
    console.log("Average Degree: " + averageDegree);




 

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
    console.log(colorLegend.getAttribute("data-visible"));
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
function isNameInUrl(jsonData, systemUrl) {
    
    const matchingElement = jsonData.find(element => systemUrl.includes(element.name));
    if (matchingElement) {
       if(document.getElementById("notFoundText")){
        document.getElementById("notFoundText").remove();
       }
        matchingName = matchingElement.name;
        matchingSvg = matchingElement.svg;
        //console.log(matchingSvg)
        statechartSVG.style.display = "block";
        var parser = new DOMParser();
        var doc = parser.parseFromString(matchingSvg, "image/svg+xml");
        var originalSVG = doc.documentElement;
        //console.log(originalSVG)
        lastStatechartUrl = systemURL;
        

        if (originalSVG) {
            graphLayout(originalSVG);
            statechartSVG.appendChild(originalSVG);

            
            // Generate and set up the minimap
            generateMinimap(originalSVG);
            //Set the id of the originalSVG
            originalSVG.setAttribute("id", "originalSVG")
            //To avoid the cropping effect while zooming, I need to give the svg more height.
            if(originalHeight < originalWidth) originalSVG.height.baseVal.valueInSpecifiedUnits = originalWidth + 1000;
            // Configure the handler to click on the minimap passing originalSVG as a parameter
            setupMinimapClickHandler(originalSVG);

            //I need to do this otherwise it selects the minimap instead of the big statechart ...

            statechart = d3.select(statechartSVG)
                .selectAll("#graph0")
                .filter(function () {
                    return this.parentNode.id !== "minimapSVG";
                });

            

            // Initial scale values
            scale = 1, currentX = 0, currentY = originalHeight, translateX = 0, translateY = currentY, minimapHidden = false;

            

            var zoom = d3.zoom()
                .scaleExtent([1, 20])
                .on('zoom', function (event) {
                    statechart
                    .selectAll("g")
                    .attr('transform', event.transform);
                    console.log(event)
                    currentZoom = event.transform.k
                    adjustIndicator(event.transform.k, event.transform.x, event.transform.y, event)
                });

            statechart.call(zoom)


            //Append change layout button

            const changeLayoutButton = document.createElement("button");
            changeLayoutButton.innerHTML = "Change Layout";
            changeLayoutButton.className = "btn btn-info";
            changeLayoutButton.style.position = "absolute";
            changeLayoutButton.style.top = "12%"
            changeLayoutButton.id = "changeLayoutButton"
            changeLayoutButton.onclick = function () {
                // Check if the button's innerHTML includes the string "Change"
                if (changeLayoutButton.innerHTML.includes("Change")) {
                    // If yes, call changeLayout with "neato"
                    changeLayout("neato");
                    setTimeout(() => {
                        changeLayoutButton.innerHTML = "Normal Layout";
                    }, 500);
                    
                } else {
                    // If no, call changeLayout with "normal"
                    changeLayout("normal");
                    setTimeout(() => {
                        changeLayoutButton.innerHTML = "Change Layout";
                    }, 500);
                }
            };

            document.getElementById("statechartContainer").appendChild(changeLayoutButton);




            //To see if the user wants the state chart highlighted!
            if (JSON.parse(localStorage.getItem("selectedTrace")) != null) {


                console.log("selectedTrace != null")
                highlightStatechart(JSON.parse(localStorage.getItem("selectedTrace")));

            }
            
            if (JSON.parse(localStorage.getItem("loadedTraces")) != null) {


                console.log("loadedTraces != null")
                highlightStatechartMultiple(JSON.parse(localStorage.getItem("loadedTraces")), JSON.parse(localStorage.getItem("selectedTraces")));

            }




            return true;
        } else {
            console.error("Invalid original SVG");
            return false;
        }


        


    }else{
        if(!document.getElementById("notFoundText")){
            const notFoundtext = document.createElement("div");
            notFoundtext.id="notFoundText";
            notFoundtext.textContent = "No statechart found for inserted URL"
            document.getElementById("statechartContainer").appendChild(notFoundtext);
        }
    }
    return false;
}

// Function to download gv state charts
function graphviz() {
    url = 'http://127.0.0.1:5000/get_statecharts_gv';
    fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            loadButton.disabled = false;
            loadingIcon.style.display = "none";
            statecharts = json;
            console.log("Get graphviz");
            //visualizeStatechart();
            //console.log((statecharts[10].svg).toString());
        });
}


function changeLayout(layoutName) {
    var vis_name = ""
    var changeLayoutButton = document.getElementById("changeLayoutButton")

    if (systemURL.includes("falcon")) vis_name = "falcon"
    if (systemURL.includes("nemesis")) vis_name = "nemesis"
    if (systemURL.includes("crumbs")) vis_name = "crumbs"
    if (systemURL.includes("summit")) vis_name = "summit"
    if (systemURL.includes("radviz")) vis_name = "radviz"

    console.log(systemURL)

    let url = `http://127.0.0.1:5000/changeLayout/${vis_name}/${layoutName}`;

    fetch(url, {
        method: 'POST',
    })
        .then(response => response.json())
        .then(json => {
            // Assuming the server response has an 'svgContent' property
            const svgContent = json.svgContent;

            // Create a new DOMParser
            const parser = new DOMParser();

            // Parse the SVG content string into a DOM document
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');

            // Extract the root <svg> element from the document
            const newOriginalSVG = doc.documentElement;

            // Use newOriginalSVG in your existing code
            statechartSVG.innerHTML = ""
            statechartSVG.appendChild(document.createElement('div')).id = 'minimapContainer';

            

            graphLayout(newOriginalSVG);
            statechartSVG.appendChild(newOriginalSVG);

            // Generate and set up the minimap
            generateMinimap(newOriginalSVG);
            // Set the id of the newOriginalSVG
            newOriginalSVG.setAttribute("id", "originalSVG")
            // To avoid the cropping effect while zooming, give the svg more height.
            if (originalHeight < originalWidth) newOriginalSVG.height.baseVal.valueInSpecifiedUnits = originalWidth + 1000;
            // Configure the handler to click on the minimap passing newOriginalSVG as a parameter
            setupMinimapClickHandler(newOriginalSVG);

            //I need to do this otherwise it selects the minimap instead of the big statechart ...
            statechart = d3.select(statechartSVG)
                .selectAll("#graph0")
                .filter(function () {
                    return this.parentNode.id !== "minimapSVG";
                });

            // Initial scale values
            scale = 1, currentX = 0, currentY = originalHeight, translateX = 0, translateY = currentY, minimapHidden = false;

            var zoom = d3.zoom()
                .scaleExtent([1, 20])
                .on('zoom', function (event) {
                    statechart
                        .selectAll("g")
                        .attr('transform', event.transform);
                    console.log(event)
                    currentZoom = event.transform.k
                    adjustIndicator(event.transform.k, event.transform.x, event.transform.y, event)
                });

            statechart.call(zoom)
        });

        


}


function visualizeStatechart(){
    var gvFile = statecharts[10].svg;
   
    url = `http://127.0.0.1:5000/visualizeStatechart`;
    fetch(url,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graphData: gvFile }),
    })
        .then(response => response.json())
        .then(json => {
            //console.log(json.svgContent);
            statechartSVG.style.display = "block";
            var parser = new DOMParser();
        var doc = parser.parseFromString(json.svgContent, "image/svg+xml");
        var originalSVG = doc.documentElement;
            graphLayout(originalSVG);
            statechartSVG.appendChild(originalSVG);
        });
}
// Function to check if there is a corresponding statechart in the URL
function CheckIfStatechartExists() {
    url = 'http://127.0.0.1:5000/get_statecharts';
    fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            loadButton.disabled = false;
            loadingIcon.style.display = "none";
            statecharts = json;
            isNameInUrl(json, systemURL);
        });
}
//#endregion

//#region Sidebar
var pin = false;

function pinSidebar() {
    pin = !pin;
    document.getElementById("sidebarCollapse").disabled = pin;
    
    if (pin) {
        document.getElementById("pinImg").src = "/images/pinFilled.png";
        document.getElementById("sidebarCollapse").style.opacity = '24%';
    } else {
        document.getElementById("pinImg").src = "/images/pin.png";
        document.getElementById("sidebarCollapse").style.opacity = '100%';
    }
}

//#endregion

//#region Load system
// Function to load the system
function LoadSystem() {
    statechartSVG.innerHTML = "";
    var minimapContainer = document.createElement("div");
    minimapContainer.id = "minimapContainer";
    statechartSVG.appendChild(minimapContainer);
    //console.log("ok")
    loadButton.disabled = true;
    var websiteContainer = document.getElementById("website");

    loadingIcon.style.display = "block";
    statechartSVG.style.display = "none";

    if ((JSON.parse(localStorage.getItem("selectedTrace")) == null) && (JSON.parse(localStorage.getItem("loadedTraces")) == null)){

        systemURL = document.getElementById("insertedURL").value;

        
    }

    websiteContainer.src = systemURL;

    CheckIfStatechartExists();
}

//#endregion


