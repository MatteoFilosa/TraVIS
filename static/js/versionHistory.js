var leftContainer,rightContainer;
var statecharts={};
var minimapWidth = 0, minimapHeight = 0, scaleFactor = 0, originalHeight = 0, originalWidth = 0, currentX = 0, currentY = 0, translateX = 0, translateY = 0, minimapRatio = 0, scale = 1, svgWidth = 0, svgHeight = 0;

window.onload = function () {
    leftContainer = document.getElementById("leftContainer");
    rightContainer = document.getElementById("rightContainer");
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

        //TODO: set up minimap for each container

        // Generate and set up the minimap
        //generateMinimap(originalSVG);
        //Set the id of the originalSVG
        originalSVG.setAttribute("id", `${container.id}originalSVG`)
        //To avoid the cropping effect while zooming, I need to give the svg more height.
        if(originalHeight < originalWidth) originalSVG.height.baseVal.valueInSpecifiedUnits = originalWidth + 1000;
        // Configure the handler to click on the minimap passing originalSVG as a parameter
        //setupMinimapClickHandler(originalSVG);

        //I need to do this otherwise it selects the minimap instead of the big statechart ...

        statechart = d3.select(container)
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

        //document.getElementById("statechartContainer").appendChild(changeLayoutButton);

        //Different functionalities part

        if(window.location.href.includes("replay")) document.getElementById("changeLayoutButton").style.display = "none";
        let selectedTrace = JSON.parse(localStorage.getItem("selectedTrace"));

        //State chart highlighting for interaction frequency

        if (selectedTrace && Object.keys(selectedTrace).length > 0) {
            console.log("selectedTrace is not empty");
            console.log(selectedTrace);
            highlightStatechart(selectedTrace);
        }

        //State chart highlighting for interaction frequency (multiple traces selected)
        
        if (JSON.parse(localStorage.getItem("loadedTraces")) != null) {

            console.log("loadedTraces != null")
            highlightStatechartMultiple(JSON.parse(localStorage.getItem("loadedTraces")), JSON.parse(localStorage.getItem("selectedTraces")));

        }

        //State chart highlighting for task and interaction frequency (multiple traces selected)

        if (JSON.parse(localStorage.getItem("taskInfo")) != null){
            console.log("Highlight Task")
            highlightTask(JSON.parse(localStorage.getItem("taskInfo")), JSON.parse(localStorage.getItem("taskID")))
        }

        localStorage.removeItem("selectedTrace")
        return true;
    }
    else {
        console.error("Invalid original SVG");
        return false;
    }

    return false;

}

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
