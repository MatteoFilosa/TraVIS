var systemURL;
var loadButton;
var loadingIcon;
var statecharts;
var statechartSVG;
let matchingName = null;
let matchingSvg = null;

// Function to check if any name in the JSON is contained in the URL
function isNameInUrl(jsonData, systemUrl) {
  const matchingElement = jsonData.find(element => systemUrl.includes(element.name));
  if (matchingElement) {
    matchingName = matchingElement.name;
    matchingSvg = matchingElement.svg;
    //statechartSVG.innerHTML = matchingSvg;
    statechartSVG.style.display = "block";
    var parser = new DOMParser();
    var doc = parser.parseFromString(matchingSvg, "image/svg+xml");
    statechartSVG.appendChild(doc.documentElement);

    return true;
  }
  return false;
}
function CheckIfStatechartExists(){
    const url = 'http://127.0.0.1:5000/get_statecharts'
    fetch(url)
    .then(response => response.json())  
    .then(json => {
        console.log(json);
        loadButton.disabled = false;
        loadingIcon.style.display = "none";
        statecharts = json;
        isNameInUrl(json,systemURL)
    })
    
    
}

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


window.onload = function () {
    var sideBarCollapse = document.getElementById("sidebarCollapse");
    var loadSystem = document.getElementById("loadSystem");
    loadingIcon = document.getElementById("loadingIcon");
    loadButton = document.getElementById("loadSystem");
    statechartSVG = document.getElementById("statechartSVG");

    sideBarCollapse.addEventListener("click", function () {
        sideBarCollapse.classList.toggle("active");
        document.getElementById("sidebar").classList.toggle("active");
    });

    // loadSystem.addEventListener("click", function () {
    //     systemURL = document.getElementById("insertedURL").value;
    //     console.log(`Loaded system:${systemURL}`);
    //     LoadSystem();
    // });
}


