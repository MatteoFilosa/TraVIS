//#region Global Variables
var tracesNum;
var selectedTraces = new Set();
var loadedTraces;
//#endregion

window.onload = function () {
    loadingIcon = document.getElementById("loadingIcon");
    table = document.getElementById("table");

    getUserTraces();
}

function getUserTraces() {

    const url = 'http://127.0.0.1:5000/get_user_traces';
    fetch(url)
        .then(response => response.json())
        .then(json => {
            loadedTraces = json;
            tracesNum = json.length;
            loadingIcon.style.display = "none";
            table.style.display = "block";
            document.getElementById("tracesNum").innerHTML = "Loaded User Traces: " + tracesNum;
            populateTable(loadedTraces);

        });
}

//#region Update Table
// Function to truncate a string and add ellipsis
function truncateString(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength) + ' [...]' : str;
}
// Function to populate the table with JSON data
function populateTable(data) {
    const tableBody = document.getElementById("tracesTable");
    var id_Cnt = 1;
    data.forEach((element, index) => {
        const row = document.createElement("tr");

        // Add checkbox column
        const checkboxCell = document.createElement("td");
        checkboxCell.style.paddingLeft = "1%";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = element.name;
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        // Add Name column
        const nameCell = document.createElement("td");
        nameCell.textContent = "User " + id_Cnt;
        row.appendChild(nameCell);

        const eventsCell = document.createElement("td");
        var traceData = JSON.parse(element.user_trace);
        eventsCell.textContent = traceData.length;
        row.appendChild(eventsCell);

        eventTypes(traceData).then(function (value) {
            const mousemoveCell = document.createElement("td");
            mousemoveCell.textContent = value.mousemove;
            row.appendChild(mousemoveCell);

            const brushCell = document.createElement("td");
            brushCell.textContent = value.brush;
            row.appendChild(brushCell);

            const wheelCell = document.createElement("td");
            wheelCell.textContent = value.wheel;
            row.appendChild(wheelCell);

            const mouseoutCell = document.createElement("td");
            mouseoutCell.textContent = value.mouseout;
            row.appendChild(mouseoutCell);

            const iconCell = document.createElement("td");
            const iconButton = document.createElement("button");
            iconButton.classList.add("expandButton");
            iconButton.id=`button${id_Cnt}`;
            const iconImg=document.createElement("img");
            iconImg.classList.add("expandButton");
            iconImg.src="images/expandIcon.png";
            iconButton.appendChild(iconImg);

            
            iconButton.addEventListener("click",()=>{
                var numbersOnlyID = iconButton.id.replace(/\D/g, '');
                if(document.getElementById(`row${numbersOnlyID}`).getAttribute('data-visible')==='false'){
                    document.getElementById(`row${numbersOnlyID}`).classList.add("extrainfoRow");
                    document.getElementById(`row${numbersOnlyID}`).setAttribute('data-visible', 'true');
                }else{
                    document.getElementById(`row${numbersOnlyID}`).classList.remove("extrainfoRow");
                    document.getElementById(`row${numbersOnlyID}`).setAttribute('data-visible', 'false');
                }
                
            });
            iconCell.appendChild(iconButton);
            row.appendChild(iconCell);
    
            // Add the row to the table
            tableBody.appendChild(row);
    
            const extrainfoRow = document.createElement("tr");
            extrainfoRow.id=`row${id_Cnt}`;
            extrainfoRow.style.display="none";
            extrainfoRow.style.transition="display 1s";
            //extrainfoRow.classList.add("extrainfoRow");

            const infoDiv = document.createElement("td");
            infoDiv.textContent="Test";
            infoDiv.colSpan="10";
            extrainfoRow.appendChild(infoDiv);
            
            tableBody.appendChild(extrainfoRow);
            id_Cnt++;
        }

        );

        // eventsCell.textContent = traceData.length;
        // row.appendChild(eventsCell);

        // Add event listener to each checkbox for changing row color
        checkbox.addEventListener('change', function () {
            if (checkbox.checked) {
                row.classList.add('table-selected');
                selectedTraces.add(checkbox.id);
                console.log(selectedTraces);
            } else {
                row.classList.remove('table-selected');
                selectedTraces.delete(checkbox.id);
                console.log(selectedTraces);
            }
        });

        
    });
}

async function eventTypes(jsonData) {
    var searchWords = ["mousemove", "click", "brush", "wheel", "mouseout"];
    var wordCount = {};

    // Initialize counts for all search words to zero
    searchWords.forEach(function (searchWord) {
        wordCount[searchWord] = 0;
    });

    jsonData.forEach(function (obj) {
        Object.values(obj).forEach(function (value) {
            searchWords.forEach(function (searchWord) {
                if (String(value).includes(searchWord)) {
                    wordCount[searchWord]++;
                }
            });
        });
    });

    return wordCount;
}
//#endregion

//#region Select Trace

function selectAllTraces() {
    const tableBody = document.getElementById("tracesTable");

    const checkboxes = document.querySelectorAll("#tracesTable input[type='checkbox']");
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");

    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;

        const row = checkbox.closest('tr');
        if (checkbox.checked) {
            row.classList.add('table-selected');
            selectedTraces.add(checkbox.id);
        } else {
            row.classList.remove('table-selected');
            selectedTraces.delete(checkbox.id);
        }

    });
}

//#endregion
