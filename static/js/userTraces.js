//#region Global Variables
var tracesNum;
var selectedTraces = [];
var loadedTraces;
//#endregion

window.onload = function () {
    getUserTraces();
}

function getUserTraces(){
    const url = 'http://127.0.0.1:5000/get_user_traces';
    fetch(url)
        .then(response => response.json())
        .then(json => {
            loadedTraces = json;
            tracesNum = json.length;
            document.getElementById("tracesNum").innerHTML +=tracesNum;
            populateTable(loadedTraces);

        });
}
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
  
      // Add the row to the table
      tableBody.appendChild(row);
    });
  }