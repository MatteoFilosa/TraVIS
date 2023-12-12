var systemURL;


function CheckIfStatechartExists(){

    var folderPath="files/statechartSVGS";
    
}

function LoadSystem() {
    var websiteContainer = document.getElementById("website");
    var statechartContainer = document.getElementById("statechartContainer");

    websiteContainer.src = systemURL;
    console.log(websiteContainer.src);
    CheckIfStatechartExists();
}


window.onload = function () {
    var sideBarCollapse = document.getElementById("sidebarCollapse");
    var loadSystem = document.getElementById("loadSystem");


    sideBarCollapse.addEventListener("click", function () {
        sideBarCollapse.classList.toggle("active");
        document.getElementById("sidebar").classList.toggle("active");
    });

    loadSystem.addEventListener("click", function () {
        systemURL = document.getElementById("insertedURL").value;
        console.log(`Loaded system:${systemURL}`);
        LoadSystem();
    });
}


