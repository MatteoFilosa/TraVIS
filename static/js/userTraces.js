//#region Global Variables
var tracesNum;
var selectedTraces = new Set();
var loadedTraces;
var violationsForAllTraces;
var timeForAllTraces;
//#endregion

window.onload = function () {
  loadingIcon = document.getElementById("loadingIcon");
  table = document.getElementById("table");

  getViolations();
  getTime();
  getUserTraces();

  document
    .getElementById("selectAllCheckbox")
    .addEventListener("change", function () {
      const tableBody = document.getElementById("tracesTable");

      const checkboxes = document.querySelectorAll(
        "#tracesTable input[type='checkbox']"
      );
      const selectAllCheckbox = document.getElementById("selectAllCheckbox");

      checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;

        const row = checkbox.closest("tr");
        if (checkbox.checked) {
          row.classList.add("table-selected");
          selectedTraces.add(checkbox.id);
        } else {
          row.classList.remove("table-selected");
          selectedTraces.delete(checkbox.id);
        }
      });
      if (selectedTraces.size != 0) {
        document.getElementById("selectTraceBtn").style.display = "block";
        document.getElementById(
          "selectTraceBtn"
        ).innerHTML = `Replay ${selectedTraces.size} traces`;
      } else {
        document.getElementById("selectTraceBtn").style.display = "none";
      }
    });
};

function getUserTraces() {
  const url = "http://127.0.0.1:5000/get_user_traces";
  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      loadedTraces = json;
      tracesNum = json.length;
      loadingIcon.style.display = "none";
      table.style.display = "block";
      document.getElementById("tracesNum").innerHTML =
        "Loaded User Traces: " + tracesNum;
      populateTable(loadedTraces);
    })
    .then(() => {
      //enable filtering for table
      var table = new DataTable("#table", {
        columnDefs: [
          //exclude first and last row from filtering and sorting
          { orderable: false, targets: [0, 5] },
          { searchable: false, targets: [0, 5] },
        ],
        paging: false,
        order: [[1, "asc"]],
        orderCellsTop: true,
        fixedHeader: true,
        // initComplete: function () {
        //     var api = this.api();

        //     // For each column
        //     api.columns().eq(0).each(function (colIdx) {
        //         // Skip the first and last columns
        //         if (colIdx !== 0 && colIdx !== api.columns().eq(0).length - 1) {
        //             // Set the header cell to contain the input element
        //             var cell = $('.filters th').eq(
        //                 $(api.column(colIdx).header()).index()
        //             );
        //             var title = $(cell).text();
        //             $(cell).html('<input type="text" placeholder="' + title + ' " style="width: 120px;height:24px;border:none;font-size:14px"" />');

        //             // On every keypress in this input
        //             $(
        //                 'input',
        //                 $('.filters th').eq($(api.column(colIdx).header()).index())
        //             )
        //                 .off('keyup change')
        //                 .on('change', function (e) {
        //                     // Get the search value
        //                     $(this).attr('title', $(this).val());
        //                     var regexr = '^{search}$';

        //                     // Search the column for that value
        //                     api
        //                         .column(colIdx)
        //                         .search(
        //                             this.value != ''
        //                                 ? regexr.replace('{search}', '(((' + this.value + ')))')
        //                                 : '',
        //                             this.value != '',
        //                             this.value == ''
        //                         )
        //                         .draw();
        //                 })
        //                 .on('keyup', function (e) {
        //                     e.stopPropagation();

        //                     $(this).trigger('change');
        //                 });
        //         }
        //     });
        //},
      });
    });
}

function getViolations() {
  const url = "http://127.0.0.1:5000/get_violations";
  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      violationsForAllTraces = json;
    });
}
function getTime() {
  const url = "http://127.0.0.1:5000/get_userTraceTime";
  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      timeForAllTraces = json;
    });
}

//#region Update Table
// Function to truncate a string and add ellipsis
function truncateString(str, maxLength) {
  return str.length > maxLength ? str.substring(0, maxLength) + " [...]" : str;
}
// Function to populate the table with JSON data
function populateTable(data) {
  const tableBody = document.getElementById("tracesTable");

  data.forEach((element, index) => {
    let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
    // Extract the captured number from the file name
    let extractedNumber = match ? match[1] : null;

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
    nameCell.textContent = extractedNumber;

    row.appendChild(nameCell);

    // Add Events column
    const eventsCell = document.createElement("td");
    var traceData = JSON.parse(element.user_trace);
    eventsCell.style.display = "flex";
    eventTypes(extractedNumber).then(function (value) {
      eventsCell.appendChild(createEventsBar(value));
    });
    eventsCell.textContent = traceData.length;
    row.appendChild(eventsCell);

    findViolations(extractedNumber).then(function (value) {
      // Add violations column
      const violationsCell = document.createElement("td");
      const sum = Object.values(value).reduce((acc, curr) => acc + curr, 0);
      violationsCell.textContent = sum;
      row.appendChild(violationsCell);
    });

    findTotalTime(extractedNumber).then(function (value) {
      // Add time column
      const timeCell = document.createElement("td");
      timeCell.textContent = value.totalTime + " seconds";
      row.appendChild(timeCell);

      // Add button on last column
      const iconCell = document.createElement("td");
      const iconButton = document.createElement("button");
      iconButton.classList.add("expandButton");
      iconButton.id = `button${extractedNumber}`;
      const iconImg = document.createElement("img");
      iconImg.src = "images/moreInfo.png";
      iconImg.id = `buttonImg${extractedNumber}`;
      iconButton.appendChild(iconImg);

      iconButton.addEventListener("click", () => {
        var numbersOnlyID = iconButton.id.replace(/\D/g, "");

        if (
          document
            .getElementById(`extrainfoDiv`)
            .getAttribute("data-visible") === "false"
        ) {
          iconImg.src = "images/moreInfo_pressed.png";
          iconButton.classList.add("expandButtonPressed");
          document
            .getElementById(`extrainfoDiv`)
            .setAttribute("data-visible", "true");
          document
            .getElementById(`extrainfoDiv`)
            .setAttribute("data-activatedBy", numbersOnlyID);
          showExtraInformation(numbersOnlyID);
        } else {
          const wasActivatedBy = document
            .getElementById(`extrainfoDiv`)
            .getAttribute("data-activatedBy");
          //console.log(`Was activatedBy:${wasActivatedBy}, pressed by:${numbersOnlyID}`);
          if (wasActivatedBy != 0 && wasActivatedBy != numbersOnlyID) {
            document.getElementById(`buttonImg${wasActivatedBy}`).src =
              "images/moreInfo.png";
            document
              .getElementById(`button${wasActivatedBy}`)
              .classList.remove("expandButtonPressed");
            document.getElementById(`buttonImg${numbersOnlyID}`).src =
              "images/moreInfo_pressed.png";
            document
              .getElementById(`button${numbersOnlyID}`)
              .classList.add("expandButtonPressed");
            document
              .getElementById(`extrainfoDiv`)
              .setAttribute("data-activatedBy", numbersOnlyID);
            showExtraInformation(numbersOnlyID);
          } else {
            iconImg.src = "images/moreInfo.png";
            document
              .getElementById(`button${numbersOnlyID}`)
              .classList.remove("expandButtonPressed");
            document
              .getElementById(`extrainfoDiv`)
              .setAttribute("data-visible", "false");
            document
              .getElementById(`extrainfoDiv`)
              .setAttribute("data-activatedBy", 0);
            clearExtraInformation();
          }
        }
      });
      iconCell.appendChild(iconButton);
      row.appendChild(iconCell);

      // Add the row to the table
      tableBody.appendChild(row);
    });

    // Add event listener to each checkbox for changing row color
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        row.classList.add("table-selected");
        selectedTraces.add(checkbox.id);
        console.log(selectedTraces);

        document.getElementById("selectTraceBtn").style.opacity = 1;
      } else {
        row.classList.remove("table-selected");
        selectedTraces.delete(checkbox.id);
        console.log(selectedTraces);
      }
      console.log(selectedTraces.size);
      if (selectedTraces.size != 0) {
        document.getElementById("selectTraceBtn").style.display = "block";
        document.getElementById(
          "selectTraceBtn"
        ).innerHTML = `Replay ${selectedTraces.size} traces`;
      } else {
        document.getElementById("selectTraceBtn").style.opacity = 0;
      }
    });
  });
}

//#endregion

//#region Select Trace

function showExtraInformation(userID) {
  document.getElementById("placeholderText").style.display = "none";
  document.getElementById("extrainfoContent").style.opacity = 1;
  document.getElementById(
    "traceInfoTitle"
  ).innerHTML = `Trace Information: User ${userID}`;

  generateHeatmap(userID);
  eventTypes(userID).then(function (value) {
    const eventsList = document.getElementById("eventsList");
    eventsList.innerHTML = "";
    for (const key in value) {
      if (value[key] > 0) {
        var eventElement = document.createElement("li");
        eventElement.textContent = `${key}: ${value[key]}`;
        if(key=="dblclick")
          eventElement.textContent = `Double click: ${value[key]}`;
        eventElement.style.textTransform = "capitalize";
        eventsList.append(eventElement);
      }
    }
  });

  findViolations(userID).then(function (value) {
    const violationsList = document.getElementById("violationsList");
    violationsList.innerHTML = "";
    var level1 = document.createElement("li");
    level1.textContent = "Level 1: " + value.level1;
    var level2 = document.createElement("li");
    level2.textContent = "Level 2: " + value.level2;
    var level3 = document.createElement("li");
    level3.textContent = "Level 3: " + value.level3;

    violationsList.append(level1);
    violationsList.append(level2);
    violationsList.append(level3);
  });
  findTotalTime(userID).then(function (value) {
    const timeList = document.getElementById("timeList");
    timeList.innerHTML = "";
    var totalTime = document.createElement("li");
    totalTime.textContent = `Total time: ${value.totalTime} seconds`;
    var averageTime = document.createElement("li");
    averageTime.textContent = `Average time: ${value.averageTime} seconds`;

    timeList.append(totalTime);
    timeList.append(averageTime);
  });
}
function clearExtraInformation() {
  document.getElementById("placeholderText").style.display = "block";
  document.getElementById("extrainfoContent").style.opacity = 0;
  document.getElementById("traceInfoTitle").innerHTML = "Trace Information   ";
}

//#endregion

//#region Extract trace info
async function eventTypes(userID) {
  var searchWords = [
    "mousemove",
    "click",
    "dblclick",
    "brush",
    "wheel",
    "mouseout",
    "mouseover",
    "mousedown",
    "mouseup",
    "Double Click",
    "facsimile back",
  ];
  var wordCount = {};

  // Initialize counts for all search words to zero
  searchWords.forEach(function (searchWord) {
    wordCount[searchWord] = 0;
  });
  loadedTraces.forEach((element, index) => {
    let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
    // Extract the captured number from the file name
    let extractedNumber = match ? match[1] : null;

    if (extractedNumber === userID) {
      let traceData = JSON.parse(element.user_trace);

      traceData.forEach(function (obj) {
        Object.values(obj).forEach(function (value) {
          searchWords.forEach(function (searchWord) {
            if (String(value).includes(searchWord)) {
              wordCount[searchWord]++;
            }
          });
        });
      });
    }
  });

  return wordCount;
}
async function findTotalTime(userID) {
  const timeInfo = { totalTime: 0, averageTime: 0 };
  timeForAllTraces.forEach((element, index) => {
    let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
    // Extract the captured number from the file name
    let extractedNumber = match ? match[1] : null;

    if (extractedNumber === userID) {
      const userTrace = JSON.parse(element.user_trace);
      //console.log(element.name, userTrace.total_time);
      var totalTimeInSeconds = (userTrace.total_time / 1000).toFixed(2); // Convert milliseconds to seconds
      timeInfo.totalTime = totalTimeInSeconds;
      var avgTimeInSeconds = (userTrace.total_average_time / 1000).toFixed(2); // Convert milliseconds to seconds
      timeInfo.averageTime = avgTimeInSeconds;
    }
  });
  return timeInfo;
}

async function findViolations(userID) {
  // Initialize level counters
  const levelCount = {
    level1: 0,
    level2: 0,
    level3: 0,
  };
  for (const element of violationsForAllTraces) {
    let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
    // Extract the captured number from the file name
    let extractedNumber = match ? match[1] : null;
    //console.log(extractedNumber,number);
    if (extractedNumber === userID) {
      const userTrace = JSON.parse(element.user_trace);
      // Iterate through the JSON data

      for (const key in userTrace) {
        var levelname = "level" + key;
        //levelCount[levelname]=userTrace[key].length;
        for (const violationString of userTrace[key]) {
          const match = violationString.match(/violation of level (\d+)/);
          if (match) {
            const level = `level${match[1]}`;
            // Increment the corresponding level counter
            levelCount[level]++;
          }
        }
      }
    }
  }
  return levelCount;
}
//#endregion

function createEventsBar(events) {
  const eventRectangle = document.createElement("div");
  eventRectangle.id = "eventRectangle";
  eventRectangle.innerHTML = "";

  // Calculate the percentage of each event type
  const totalEvents = Object.values(events).reduce(
    (acc, count) => acc + count,
    0
  );
  const percentages = {};
  for (const [eventName, count] of Object.entries(events)) {
    percentages[eventName] = (count / totalEvents) * 100;
  }

  const sortedPercentages = Object.entries(events)
    .map(([eventName, count]) => ({
      eventName,
      percentage: (count / totalEvents) * 100,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  for (const [eventName, count] of Object.entries(events)) {
    const eventDiv = document.createElement("div");
    eventDiv.classList.add("eventColor");
    eventDiv.style.height = "20px";
    eventDiv.style.width = `${
      (count / Object.values(events).reduce((acc, count) => acc + count, 0)) *
      100
    }%`;
    eventDiv.style.backgroundColor = getColor(eventName);
    eventRectangle.appendChild(eventDiv);
  }
  return eventRectangle;
}

function generateHeatmap(userID) {
  var mainDiv = document.getElementById("heatmap");
  mainDiv.innerHTML = "";

  loadedTraces.forEach((element, index) => {
    let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
    // Extract the captured number from the file name
    let extractedNumber = match ? match[1] : null;

    if (extractedNumber === userID) {
      let traceData = JSON.parse(element.user_trace);
      let cnt = 0;

      // Calculate the number of rows based on the length of the traceData array
      var rows = Math.ceil(Math.sqrt(traceData.length));
      var columns = Math.ceil(traceData.length / rows);

      traceData.forEach(function (obj, i) {
        // Create a div for each event
        var eventDiv = document.createElement("div");
        eventDiv.className = "event-rectangle";
        eventDiv.style.width = 100 / columns + "%";
        eventDiv.style.height = 100 / rows + "%";
        eventDiv.style.backgroundColor = getColor(obj.event);
        eventDiv.style.position = "absolute";
        eventDiv.style.left = (i % columns) * (100 / columns) + "%";
        eventDiv.style.top = Math.floor(i / columns) * (100 / rows) + "%";

        // Append the event div to the main div
        mainDiv.appendChild(eventDiv);
        cnt++;
      });

      // Set the number of rows and columns as CSS variables for the main div
      mainDiv.style.setProperty("--rows", rows);
      mainDiv.style.setProperty("--columns", columns);
    }
  });
}
// Function to get color based on event name
function getColor(eventName) {
  switch (eventName) {
    case "mouseover":
      return "#8e0152";
    case "click":
      return "#c51b7d";
    case "brush":
      return "#de77ae";
    case "mousemove":
      return "#f1b6da";
    case "wheel":
      return "#fde0ef";
    case "mouseout":
      return "#e6f5d0";
    case "mousedown":
      return "#b8e186";
    case "mousedown":
      return "#7fbc41";
    case "mouseup":
      return "#4d9221";
    case "dblclick":
      return "#276419";
    case "Double Click":
      return "yellow";
    case "facsimile back":
      return "#072700";
    // Add more cases as needed
    default:
      console.log(eventName);
      return "red";
  }
}
