// Global variable declarations
var systemURL;
var loadButton;
var loadingIcon;
var statecharts;
var statechartSVG;
var matchingName = null;
var matchingSvg = null;
var statechartContainer;
var minimapWidth = 0, minimapHeight = 0, scaleFactor = 0, originalHeight = 0, originalWidth = 0;

// Array of colors is given  
let color1 = d3.schemeCategory10[0];
let color2 = d3.schemeCategory10[1];
let color3 = d3.schemeCategory10[2];
let color4 = d3.schemeCategory10[3];
let color5 = d3.schemeCategory10[4];
let color6 = d3.schemeCategory10[5];
let color7 = d3.schemeCategory10[6];
let color8 = d3.schemeCategory10[7];
let color9 = d3.schemeCategory10[8];
let color10 = d3.schemeCategory10[9];

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

            // Nascondi gli elementi nel caso "website"
            minimapContainer.style.display = 'none';
            minimapSVG.style.display = 'none';
            indicator.style.display = 'none';

            break;
        case "statechart":
            websiteContainer.style.minWidth = '29.5%';
            websiteContainer.style.height = '24%';
            statechartContainer.style.minWidth = '69.5%';

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


// Function to generate the minimap
function generateMinimap(originalSVG) {
    scaleFactor = 50;
    originalWidth = originalSVG.width.baseVal.valueInSpecifiedUnits;
    originalHeight = originalSVG.height.baseVal.valueInSpecifiedUnits;

    if (originalWidth / scaleFactor < 100 || originalHeight / scaleFactor < 100) {
        scaleFactor = 25;
    }

    minimapWidth = originalWidth / scaleFactor;
    minimapHeight = originalHeight / scaleFactor;
    console.log(minimapWidth, minimapHeight)

    var minimapSVG = originalSVG.cloneNode(true);
    minimapSVG.setAttribute("width", minimapWidth);
    minimapSVG.setAttribute("height", minimapHeight);

    // Add content to the minimapContainer
    var minimapContainer = document.getElementById("minimapContainer");
    minimapContainer.innerHTML = "";
    minimapSVG.setAttribute("id", "minimapSVG");
    minimapContainer.appendChild(minimapSVG);
}

// Function to update the position of the indicator based on scrolling
function updateIndicatorPosition() {
    var statechartContainer = document.getElementById("statechartContainer");
    const minimapContainer = document.getElementById("minimapContainer");
    const minimapRect = minimapContainer.getBoundingClientRect();
    const indicator = document.getElementById("indicator");

    // Calculate the position of the indicator based on the scroll of statechartSVG
    const maxScroll = statechartSVG.scrollHeight - statechartSVG.clientHeight;
    let indicatorY = (statechartSVG.scrollTop / maxScroll) * minimapRect.height;

    // Calculate the maximum allowed top position for the indicator
    const maxIndicatorTop = minimapRect.height - indicator.clientHeight;

    // Ensure that the indicatorY is within the bounds of minimapContainer
    indicatorY = Math.max(0, Math.min(indicatorY, maxIndicatorTop));

    // Update the position of the indicator
    indicator.style.top = indicatorY + "px";
}

// Function to configure the click handler on the minimap
function setupMinimapClickHandler(originalSVG) {
    const minimapContainer = document.getElementById("minimapContainer");
    const statechartSVG = document.getElementById("statechartSVG");
    //console.log(minimapWidth);
    //var originalHeightPixel = document.getElementById("graph0").getBoundingClientRect().height
    //var ratio = originalHeightPixel/800
    //var indicatorHeight = ratio * minimapHeight;
    // Add the indicator on the minimap
    const indicator = document.createElement("div");
    indicator.id = "indicator";
    indicator.style.position = "absolute";
    indicator.style.width = minimapWidth + "px";
    indicator.style.height = "80px";
    indicator.style.backgroundColor = "transparent";
    indicator.style.borderTop = "2px solid lightblue";
    indicator.style.borderLeft = "2px solid lightblue";
    indicator.style.borderRight = "2px solid lightblue";
    indicator.style.borderBottom = "2px solid lightblue";
    indicator.style.transition = "all 0.3s ease-in-out";

    // Append the indicator to the minimapContainer
    minimapContainer.appendChild(indicator);

    // Set the top position relative to the minimapContainer
    indicator.style.top = "0";
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

        // Update the position of the indicator
        updateIndicatorPosition(clickedX, clickedY);
    });

    // Event listener for scrolling of SVG
    statechartSVG.addEventListener("scroll", function () {
        // Calculate the position of the indicator based on the scroll of SVG
        const minimapRect = minimapContainer.getBoundingClientRect();
        const maxScroll = statechartSVG.scrollHeight - statechartSVG.clientHeight;
        const indicatorY = (statechartSVG.scrollTop / maxScroll) * minimapRect.height;

        // Update the position of the indicator
        updateIndicatorPosition(null, null, indicatorY);
    });

    // Event listener for scrolling of statechartSVG
    statechartSVG.addEventListener("scroll", function () {
        updateIndicatorPosition();
    });



}

function isNameInUrl(jsonData, systemUrl) {
    const matchingElement = jsonData.find(element => systemUrl.includes(element.name));
    if (matchingElement) {
        matchingName = matchingElement.name;
        matchingSvg = matchingElement.svg;
        console.log(matchingSvg)
        statechartSVG.style.display = "block";
        var parser = new DOMParser();
        var doc = parser.parseFromString(matchingSvg, "image/svg+xml");
        var originalSVG = doc.documentElement;
        console.log(originalSVG)

        if (originalSVG) {
            statechartSVG.appendChild(originalSVG);


            // Generate and set up the minimap
            generateMinimap(originalSVG);

            // Configure the handler to click on the minimap passing originalSVG as a parameter
            setupMinimapClickHandler(originalSVG);

            console.log(d3.selectAll("#graph0"))

            //I need to do this otherwise it selects the minimap instead of the big statechart ...

            const statechart = d3.select(statechartSVG)
                .selectAll("#graph0")
                .filter(function () {
                    return this.parentNode.id !== "minimapSVG";
                });


            // Initial translation values
            var translateX = 0;
            var translateY = 0;

            // Update indicator position
            const indicator = document.getElementById("indicator");
            var indicatorTop, indicatorLeft;

            // Initial scale values
            var scale = 1, currentX = 0, currentY = originalHeight;

            //DRAG

            statechart.call(
                d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended)
            );

            const zoom = d3.zoom()
                .scaleExtent([2, 100])
                .on("zoom", zoomed);

            statechart.call(zoom);

            function dragstarted() {
                statechart.classed("dragging", true);

                // Initialize translation values with currentX and currentY
                translateX = currentX;
                translateY = currentY;
                indicatorLeft = indicator.style.left;
                indicatorTop = indicator.style.top;

            }

            function dragged() {
                translateX += d3.event.dx;
                translateY += d3.event.dy;


                // Update the translation part of the transform attribute
                statechart.attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

                console.log(translateX, translateY, d3.event.x, d3.event.y)
            }

            function dragended() {
                statechart.classed("dragging", false);

                // Extract numeric values from the current left and top properties
                var currentLeft = parseFloat(indicatorLeft);
                var currentTop = parseFloat(indicatorTop);

                // Calculate the change in translation values
                var dx = translateX - currentX;
                var dy = translateY - currentY;

                // Update the translated values with the correct proportion based on the scale factor and the scale (zoom) value
                var newLeft = currentLeft - ((dx / scaleFactor) / scale);
                var newTop = currentTop - ((dy / scaleFactor) / scale);

                // Ensure that the indicator stays within the bounds of minimapContainer
                newLeft = Math.min(Math.max(newLeft, 0), minimapContainer.clientWidth - indicator.clientWidth);
                newTop = Math.min(Math.max(newTop, 0), minimapContainer.clientHeight - indicator.clientHeight);

                // Update the position of the indicator. We have to invert!
                indicator.style.left = newLeft + "px";
                indicator.style.top = newTop + "px";

                // Update the currentX and currentY values after dragging ends
                currentX = translateX;
                currentY = translateY;
            }

            function zoomed() {
                // Update the scale part of the transform attribute
                scale = d3.event.transform.k;
                currentX = d3.event.transform.x;
                currentY = d3.event.transform.y;
                console.log(originalWidth, originalHeight, currentX, currentY);

                var indicator = document.getElementById("indicator");

                indicatorLeft = indicator.style.left;
                indicatorTop = indicator.style.top;

                var currentLeft = parseFloat(indicatorLeft);
                var currentTop = parseFloat(indicatorTop);

                // Calcolare le nuove posizioni dell'indicatore
                var newLeft = currentLeft - ((currentX / minimapWidth) / scale / scaleFactor);
                var newTop = currentTop - ((currentY / 80) / scale / scaleFactor);

                // Assicurarsi che l'indicatore non esca mai dai bordi del minimapContainer
                newLeft = Math.min(Math.max(newLeft, 0), minimapContainer.clientWidth - indicator.clientWidth);
                newTop = Math.min(Math.max(newTop, 0), minimapContainer.clientHeight - indicator.clientHeight);

                // Aggiornare la posizione dell'indicatore
                indicator.style.left = newLeft + "px";
                indicator.style.top = newTop + "px";

                // Update the entire transform attribute, including both scale and translation
                statechart.attr("transform", d3.event.transform);

                // Update the size of the indicator based on the zoom level
                const newWidth = minimapWidth / scale;
                const newHeight = 80 / scale;

                indicator.style.width = newWidth + "px";
                indicator.style.height = newHeight + "px";
            }

            return true;
        } else {
            console.error("Invalid original SVG");
            return false;
        }
    }
    return false;
}





function zoom(type) {

}




// Function to check if there is a corresponding statechart in the URL
function CheckIfStatechartExists() {
    const url = 'http://127.0.0.1:5000/get_statecharts';
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

// Function to load the system
function LoadSystem() {
    statechartSVG.innerHTML = "";
    var minimapContainer = document.createElement("div");
    minimapContainer.id = "minimapContainer";
    statechartSVG.appendChild(minimapContainer);
    console.log("ok")
    loadButton.disabled = true;
    var websiteContainer = document.getElementById("website");

    loadingIcon.style.display = "block";
    statechartSVG.style.display = "none";


    systemURL = document.getElementById("insertedURL").value;

    websiteContainer.src = systemURL;
    CheckIfStatechartExists();
}

var pin = false;

function pinSidebar() {
    pin = !pin;
    document.getElementById("sidebarCollapse").disabled = pin;
    if (pin) {
        document.getElementById("pinImg").src = "/images/pinFilled.png";
    } else {
        document.getElementById("pinImg").src = "/images/pin.png";
    }
}
// Function executed when the page is loaded
window.onload = function () {
    var sideBarCollapse = document.getElementById("sidebarCollapse");
    loadingIcon = document.getElementById("loadingIcon");
    loadButton = document.getElementById("loadSystem");
    statechartSVG = document.getElementById("statechartSVG");

    sideBarCollapse.addEventListener("click", function () {
        sideBarCollapse.classList.toggle("active");
        document.getElementById("sidebar").classList.toggle("active");
    });

    document.getElementById("slidersNum").style.color = color2;
    document.getElementById("buttonsNum").style.color = color1;
    document.getElementById("inputsNum").style.color = color9;
};

