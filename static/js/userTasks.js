var taskInfo={};

function getUserTasks() {
  const url = "http://127.0.0.1:5000/get_user_tasks";

  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      loadingIcon.style.display = "none";
      //filtersContainer.style.display = "flex";
      table.style.display = "block";

      taskInfo = {
        0: { count: 0, mostPerformedEvent: "", interactions: {} },
        1: { count: 0, mostPerformedEvent: "", interactions: {} },
        2: { count: 0, mostPerformedEvent: "", interactions: {} },
        3: { count: 0, mostPerformedEvent: "", interactions: {} },
        4: { count: 0, mostPerformedEvent: "", interactions: {} },
      };

      document.getElementById("tracesNum").innerHTML = `Tasks covered: 5`;

      // Iterate through each file
      json.forEach((task) => {
        // Iterate through each number in the file
        Object.keys(taskInfo).forEach((number) => {
          // If the number exists in the task, update the aggregated info
          if (task[number]) {
            // Increment the count for the current number
            taskInfo[number].count += Array.isArray(task[number])
              ? task[number].length
              : 0;

            // Update the most performed event for the current number
            const events = Array.isArray(task[number]) ? task[number] : [];
            const eventCounts = events.reduce((acc, event) => {
              acc[event] = (acc[event] || 0) + 1;
              return acc;
            }, {});

            for (const event in eventCounts) {
              if (
                !taskInfo[number].mostPerformedEvent ||
                eventCounts[event] >
                  eventCounts[taskInfo[number].mostPerformedEvent]
              ) {
                taskInfo[number].mostPerformedEvent = event;
              }

              // Collect all different interactions for the current number
              if (!taskInfo[number].interactions[event]) {
                taskInfo[number].interactions[event] = 0;
              }
              taskInfo[number].interactions[event] += eventCounts[event];
            }
          }
        });
      });

      // Display aggregated info in the mainContainer
      Object.keys(taskInfo).forEach((number) => {
        const infoDiv = document.createElement("div");

        // Sort interactions by the number of interactions
        const sortedInteractions = Object.entries(
          taskInfo[number].interactions
        )
          .sort((a, b) => b[1] - a[1])
          .map(([interaction, count]) => `${interaction}: ${count}`);

        infoDiv.textContent = `${number} : Most performed event: ${
          taskInfo[number].mostPerformedEvent
        } - Total interactions: ${
          taskInfo[number].count
        } - All Interactions: ${sortedInteractions.join(", ")}`;
        //mainContainer.appendChild(infoDiv);
      });
      populateTable(taskInfo);
    })
    .then(() => {
      // Enable filtering for table
      var table = new DataTable("#tasktable", {
        searching: false,
        columnDefs: [
          // exclude first and last row from filtering and sorting
          { orderable: false, targets: [0] },
        ],
        paging: false,
        order: [[1, "asc"]],
        orderCellsTop: true,
        fixedHeader: true,
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}

function getUserTasksTime() {
  const url = "http://127.0.0.1:5000/get_userTraceTime";

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((json) => {
      //console.log(json);
      // const mainContainer = document.getElementById("mainContainerTime");
      //mainContainer.innerHTML = "";

      // Verifica se la proprietà 'groups' è presente nella risposta JSON
      if (json && json.groups) {
        const groupSum = {};
        const groupCount = {};

        // Itera attraverso ogni gruppo nel file
        Object.keys(json.groups).forEach((group) => {
          // Aggiorna la somma per il gruppo corrente
          if (!groupSum[group]) {
            groupSum[group] = 0;
            groupCount[group] = 0;
          }

          groupSum[group] += json.groups[group].total_time;
          groupCount[group]++;
        });

        // Visualizza i risultati in mainContainerTime
        Object.keys(groupSum).forEach((group) => {
          const averageTime = (
            groupSum[group] /
            (groupCount[group] * 1000)
          ).toFixed(2); // Converti millisecondi in secondi
          const infoDiv = document.createElement("div");
          infoDiv.textContent = `${group} : Somma del Tempo Totale: ${
            groupSum[group] / 1000
          } secondi - Tempo Medio: ${averageTime} secondi`;
          //mainContainer.appendChild(infoDiv);
        });
      } else {
        console.error(
          "Errore: la proprietà 'groups' è indefinita o nulla nella risposta JSON."
        );
      }
    })
    .catch((error) => {
      console.error("Errore durante il recupero dei dati:", error);
    });
}

function getUserTasksViolations() {
  const url = "http://127.0.0.1:5000/get_violations";

  fetch(url)
    .then((response) => response.json())
    .then((json) => {});
}

window.onload = function () {
  filtersContainer = document.getElementById("filtersContainer");
  loadingIcon = document.getElementById("loadingIcon");
  table = document.getElementById("tasktable");

  colorLegend();
  getUserTasks();
  //getUserTasksTime();
};

function populateTable(data) {
  const tableBody = document.getElementById("tracesTable");
  //console.log(data);

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      const row = document.createElement("tr");

      // Add checkbox column
      const checkboxCell = document.createElement("td");
      checkboxCell.style.paddingLeft = "1%";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = key;
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      // Add Name column
      const nameCell = document.createElement("td");
      nameCell.textContent = key;
      row.appendChild(nameCell);

      // const ideaCell = document.createElement("td");
      // if(key == 0){
      //   ideaCell.textContent = "'Try to select a range of flights that is between the departure time of 8-12'";
      // }
      // else if (key == 1){
      //   ideaCell.textContent = "'How many flights were longer than four and less than six hours (More than 240 minutes and less than 360 minutes)?'";
      // }
      // else if (key == 2) {
      //   ideaCell.textContent = "'Which two-hour window (during time of day) contains more flights with longer arrival delays?'";
      // }
      // else if (key == 3) {
      //   ideaCell.textContent = "'Which factors appear to have the greatest effect on the length of departure delays?'";
      // }

      // else if (key == 4) {
      //   ideaCell.textContent = "'How do distance, departure delays, and both distance and departure delays together appear to affect arrival delays?'";
      // }
      // row.appendChild(ideaCell);
      // console.log(data, key)

      // const categoryCell = document.createElement("td");
      // if(key == 0){

      //   categoryCell.textContent = "Tutorial";
      // }
      // else{
      //   categoryCell.textContent = "Exploratory";
      // }
      // row.appendChild(categoryCell);

      const tracesCell = document.createElement("td");
      tracesCell.textContent = data[key].count;
      row.appendChild(tracesCell);

      const varianceCell = document.createElement("td");
      varianceCell.textContent = "-";
      row.appendChild(varianceCell);

      const correctnessCell = document.createElement("td");
      correctnessCell.textContent = "-";
      row.appendChild(correctnessCell);

      const timeCell = document.createElement("td");
      timeCell.textContent = data[key].count;
      row.appendChild(timeCell);
      timeCell.textContent = "-";

      const idealTraceCell = document.createElement("td");
      idealTraceCell.textContent = "-";
      row.appendChild(idealTraceCell);

      // Add the row to the table
      tableBody.appendChild(row);

      checkbox.addEventListener("change", function () {
        
        if (checkbox.checked) {
          
          ExtraInfo(checkbox.id);
        }else{
          clearExtraInformation();
        }
      });
    }
  }
}
// Function to get color based on event name
function getColor(eventName) {
  switch (eventName) {
    case "mouseover":
      return "#1f77b4";
    case "click":
      return "#ff7f0e";
    case "brush":
      return "#ffbb78";
    case "mousemove":
      return "#2ca02c";
    case "wheel":
      return "#8c564b";
    case "mouseout":
      return "#ff9896";
    case "mousedown":
      return "#98df8a";
    case "mouseup":
      return "#9467bd";
    case "dblclick":
      return "#aec7e8";
    case "Double Click":
      return "#aec7e8";
    case "facsimile back":
      return "#c5b0d5";
    // Add more cases as needed
    default:
      console.log(eventName);
      return "red";
  }
}
const eventTypesArray = [
  "mouseover",
  "click",
  "brush",
  "mousemove",
  "mousedown",
  "wheel",
  "mouseout",
  "mouseup",
  "dblclick",
  "facsimile_back",
];
function colorLegend() {
  const colorLegend = document.getElementById("colorLegend");
  const eventColumn = document.getElementById("eventColumn");
  const violationsColumn = document.getElementById("violationsColumn");

  eventTypesArray.forEach((element) => {
    let colorElementDiv = document.createElement("div");
    colorElementDiv.classList.add("legendElementDiv");

    let colorElementImg = document.createElement("div");
    colorElementImg.classList.add("colorDiv");
    if (element == "facsimile_back")
      colorElementImg.style.backgroundColor = getColor("facsimile back");
    else colorElementImg.style.backgroundColor = getColor(element);

    let colorElementText = document.createElement("p");
    colorElementText.textContent = element;

    colorElementDiv.appendChild(colorElementImg);
    colorElementDiv.appendChild(colorElementText);

    eventColumn.appendChild(colorElementDiv);
  });

  const violations = ["Low", "Medium", "High", "Critical"];
  violations.forEach((element) => {
    let colorElementDiv = document.createElement("div");
    colorElementDiv.classList.add("legendElementDiv");

    let colorElementImg = document.createElement("div");
    colorElementImg.classList.add("colorDiv");
    if (element.includes("Low"))
      colorElementImg.style.backgroundColor = "#c7c7c7";
    else if (element.includes("Medium"))
      colorElementImg.style.backgroundColor = "#7f7f7f";
    else if (element.includes("High"))
      colorElementImg.style.backgroundColor = "#dbdb8d";
    else if (element.includes("Critical"))
      colorElementImg.style.backgroundColor = "#17becf";

    let colorElementText = document.createElement("p");
    colorElementText.textContent = element;

    colorElementDiv.appendChild(colorElementImg);
    colorElementDiv.appendChild(colorElementText);

    violationsColumn.appendChild(colorElementDiv);
  });
}

function toggleLegend() {
  const colorLegend = document.getElementById("colorLegend");
  const buttonImg = document.getElementById("colorLegendButton");

  if (colorLegend.getAttribute("data-visible") == "false") {
    colorLegend.setAttribute("data-visible", "true");
    buttonImg.style.transform = "rotate(0deg)";
    colorLegend.style.height = "310px";
  } else {
    colorLegend.setAttribute("data-visible", "false");
    buttonImg.style.transform = "rotate(180deg)";
    colorLegend.style.height = "31px";
  }
}

function ExtraInfo(taskID) {
  document.getElementById("selectTraceBtn").style.opacity = 1;
  document.getElementById(
    "selectTraceBtn"
  ).innerHTML = `View task`;
  document.getElementById("extrainfoContent").style.opacity = 1;
  document.getElementById("placeholderText").style.display = "none";

  document.getElementById(
    "traceInfoTitle"
  ).innerHTML = `Task Information: ${[taskID]}`;

  for (var key in taskInfo) {
    if (taskInfo.hasOwnProperty(key)) {
      if(key == taskID){
        const eventsList = document.getElementById("eventsList");
      eventsList.innerHTML = "";
      eventsList.innerHTML=`Most performed event: ${taskInfo[key].mostPerformedEvent}`;

      const violationsList = document.getElementById("violationsList");
      violationsList.innerHTML = "";
      
      for(var data in taskInfo[key].interactions){
        violationsList.innerHTML+=`${data}: ${taskInfo[key].interactions[data]}`;
      }
      }
    }
  }
}

function clearExtraInformation(){
  document.getElementById("selectTraceBtn").style.opacity = 0;
  document.getElementById(`previewTrace`).style.display = "none";
  document.getElementById("placeholderText").style.display = "block";
  document.getElementById("extrainfoContent").style.opacity = 0;
  document.getElementById("traceInfoTitle").innerHTML = "Task Information   ";
}