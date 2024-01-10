//#region Global Variables
var tracesNum;
var selectedTraces = [];
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

    data.forEach((element, index) => {
        const row = document.createElement("tr");

        // Add checkbox column
        const checkboxCell = document.createElement("td");
        checkboxCell.style.paddingLeft = "1%";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        // Add Name column
        const nameCell = document.createElement("td");
        nameCell.textContent = element.name;
        row.appendChild(nameCell);

        // Add User Trace column
        const userTraceCell = document.createElement("td");
        userTraceCell.textContent = truncateString(element.user_trace, 20);
        row.appendChild(userTraceCell);

        // Add empty timestamp column
        const TimestampCell = document.createElement("td");
        TimestampCell.textContent = "";
        row.appendChild(TimestampCell);

        // Add empty events column
        const EventsCell = document.createElement("td");
        EventsCell.textContent = "";
        row.appendChild(EventsCell);

        // Add the row to the table
        tableBody.appendChild(row);

        // Add event listener to each checkbox for changing row color
        checkbox.addEventListener('change', function () {
            if (checkbox.checked) {
                row.classList.add('table-selected');
            } else {
                row.classList.remove('table-selected');
            }
        });
    });
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
        } else {
            row.classList.remove('table-selected');
        }
    });
}

//#endregion
