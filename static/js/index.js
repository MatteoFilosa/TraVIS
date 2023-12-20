// Global variable declarations
var systemURL;
var loadButton;
var loadingIcon;
var statecharts;
var statechartSVG;
var matchingName = null;
var matchingSvg = null;
var minimapWidth = 0, minimapHeight = 0;

// Function to generate the minimap
function generateMinimap(originalSVG) {
    var scaleFactor = 50;
    var originalWidth = originalSVG.width.baseVal.valueInSpecifiedUnits;
    var originalHeight = originalSVG.height.baseVal.valueInSpecifiedUnits;

    if (originalWidth / scaleFactor < 100 || originalHeight / scaleFactor < 100) {
        scaleFactor = 25;
    }

    minimapWidth = originalWidth / scaleFactor;
    minimapHeight = originalHeight / scaleFactor;

    var minimapSVG = originalSVG.cloneNode(true);
    minimapSVG.setAttribute("width", minimapWidth);
    minimapSVG.setAttribute("height", minimapHeight);

    // Add content to the minimapContainer
    var minimapContainer = document.getElementById("minimapContainer");
    minimapContainer.innerHTML = "";
    minimapContainer.appendChild(minimapSVG);
}

// Function to configure the click handler on the minimap
function setupMinimapClickHandler(originalSVG) {
    const minimapContainer = document.getElementById("minimapContainer");
    const statechartSVG = document.getElementById("statechartSVG");
    console.log(minimapWidth);

    // Add the indicator on the minimap
    const indicator = document.createElement("div");
    indicator.id = "indicator";
    indicator.style.position = "absolute";
    indicator.style.width = minimapWidth + "px"; // Rectangle width equal to minimap width
    indicator.style.height = "20px"; // Rectangle height
    indicator.style.backgroundColor = "transparent"; // Transparent background
    indicator.style.borderTop = "2px solid lightblue"; // Blue top border
    indicator.style.borderLeft = "2px solid lightblue"; // Blue left border
    indicator.style.borderRight = "2px solid lightblue"; // Blue right border
    indicator.style.borderBottom = "2px solid lightblue"; // Blue bottom border
    indicator.style.transition = "all 0.3s ease-in-out"; // Add a transition for a smoother effect
    minimapContainer.appendChild(indicator);

    minimapContainer.addEventListener("click", function (event) {
        const clickedX = event.offsetX;
        const clickedY = event.offsetY;

        // Calculate the corresponding point in the original SVG
        const scaleX = originalSVG.width.baseVal.value / minimapContainer.clientWidth;
        const scaleY = originalSVG.height.baseVal.value / minimapContainer.clientHeight;
        const targetX = clickedX * scaleX;
        const targetY = clickedY * scaleY;

        // Calculate the scroll position required to center the clicked point
        const scrollTop = targetY - statechartSVG.clientHeight / 2;

        // Move the main SVG to the desired point
        statechartSVG.scrollTop = scrollTop;

        // Update the position of the indicator
        updateIndicatorPosition(targetX, targetY, scaleX, scaleY);
    });

    // Event handler for scrolling on statechartSVG
    statechartSVG.addEventListener("scroll", function () {
        const minimapRect = minimapContainer.getBoundingClientRect();
        const indicatorY = (statechartSVG.scrollTop / statechartSVG.scrollHeight) * minimapRect.height;

        indicator.style.top = indicatorY + minimapRect.top + "px";
    });

    // Function to update the position of the indicator
    function updateIndicatorPosition(targetX, targetY, scaleX, scaleY) {
        // Calculate the relative position on the minimap
        const indicatorY = (targetY / scaleY) - (indicator.clientHeight / 2);

        // Adjustment of the position based on the margins and padding of the minimap
        const minimapRect = minimapContainer.getBoundingClientRect();
        indicator.style.top = indicatorY + minimapRect.top + "px";
    }
}

// Function to check if there is a corresponding statechart in the URL
function isNameInUrl(jsonData, systemUrl) {
    const matchingElement = jsonData.find(element => systemUrl.includes(element.name));
    if (matchingElement) {
        matchingName = matchingElement.name;
        matchingSvg = matchingElement.svg;
        statechartSVG.style.display = "block";
        var parser = new DOMParser();
        var doc = parser.parseFromString(matchingSvg, "image/svg+xml");
        var originalSVG = doc.documentElement;

        if (originalSVG) {
            statechartSVG.appendChild(originalSVG);

            // Generate and set up the minimap
            generateMinimap(originalSVG);

            // Configure the handler to click on the minimap passing originalSVG as a parameter
            setupMinimapClickHandler(originalSVG);

            return true;
        } else {
            console.error("Invalid original SVG");
            return false;
        }
    }
    return false;
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
    loadButton.disabled = true;
    var websiteContainer = document.getElementById("website");

    loadingIcon.style.display = "block";
    statechartSVG.style.display = "none";

    var statechartContainer = document.getElementById("statechartContainer");
    systemURL = document.getElementById("insertedURL").value;

    websiteContainer.src = systemURL;
    CheckIfStatechartExists();
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
};
