var taskInfo = {};
var groupSum = {};
var groupCount = {};
var groupVariance = {};
var violationsData;
var groupData = {};

window.onload = function () {
  filtersContainer = document.getElementById("filtersContainer");
  loadingIcon = document.getElementById("loadingIcon");
  table = document.getElementById("tasktable");

  colorLegend();
  getUserTasksTime();
  //This SUCKS, I know, but js synchronization sucks more
  //When getUserTasksTime finishes:
  //  calls getUserTasksViolations
  //    when getUserTasksViolations finishes:
  //      calls getUserTasks
};

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
        const sortedInteractions = Object.entries(taskInfo[number].interactions)
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
      if (json && json.length > 0 && JSON.parse(json[0].user_trace).groups) {
        json.forEach((item) => {
          const groups = JSON.parse(item.user_trace).groups;

          if (groups) {
            Object.keys(groups).forEach((group) => {
              if (!groupSum[group]) {
                groupSum[group] = 0;
                groupCount[group] = 0;
                groupVariance[group] = [];
              }

              groupSum[group] += groups[group].total_time / 1000;
              groupCount[group]++;
              groupVariance[group].push(groups[group].total_time / 1000); // Store total_time for variance calculation
            });
          } else {
            console.error(
              "Error: 'groups' property is undefined or null in an item."
            );
          }
        });
      } else {
        console.error(
          "Error: 'groups' property is undefined or null in the JSON response or there are no items in the array."
        );
      }
    })
    .then(() => {
      getUserTasksViolations();
    })
    .catch((error) => {
      console.error("Error retrieving data:", error);
    });
}
function getUserTasksViolations() {
  const url = "http://127.0.0.1:5000/get_violations";

  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      // Iterate through each JSON file
      json.forEach((jsonData, index) => {
        violationsData = JSON.parse(jsonData.user_trace);

        // Iterate through each group in the current JSON file
        for (const group in violationsData) {
          if (violationsData.hasOwnProperty(group)) {
            // Initialize group data if not exists
            if (!groupData[group]) {
              groupData[group] = {
                levels: {},
                totalViolations: 0,
              };
            }

            // Calculate the sum of violations for the current group
            violationsData[group].forEach((violation) => {
              // Extract the violation level directly from the string
              const levelMatch = violation.match(/violation of level (\d+)/);
              const level = levelMatch ? parseInt(levelMatch[1]) : 0;

              // Update the count for the specific level
              if (!groupData[group].levels[level]) {
                groupData[group].levels[level] = 0;
              }
              groupData[group].levels[level]++;

              // Update the total violations for the current group
              groupData[group].totalViolations++;
            });
          }
        }
      });

      // Print the sum of violations for each group to the console
      for (const group in groupData) {
        if (groupData.hasOwnProperty(group)) {
          // Log the total violations for each group
          console.log(
            `Group ${group}: Total Violations - ${groupData[group].totalViolations}`
          );
        }
      }
    })
    .then(() => {
      getUserTasks();
    })
    .catch((error) => {
      console.error("Error retrieving violations data:", error);
    });
}
async function getViolationsForGroup(groupID) {
  var violations;
  //Now, update the corresponding violationCell in the table
  for (const group in groupData) {
    if (groupData.hasOwnProperty(group)) {
      if (group == groupID) {
        console.log(groupData);
        violations = groupData[group].totalViolations;
      }
    }
  }
  return violations;
}
async function getTimeForGroup(groupID) {
  var returnObj = {
    variance: 0,
    averageTime: 0,
  };
  Object.keys(groupSum).forEach((group) => {
    if (group == groupID) {
      const mean = groupSum[group] / groupCount[group];
      const totalSquaredDifference = groupVariance[group].reduce(
        (acc, time) => acc + Math.pow(time - mean, 2),
        0
      );

      returnObj.variance = totalSquaredDifference / groupVariance[group].length;
      returnObj.variance = returnObj.variance.toFixed(2);
      console.log(`Task ${group} Variance: ${returnObj.variance}`);
      // Use d3 to create boxplot
      //createBoxPlot(group, groupVariance[group]);

      returnObj.averageTime = groupSum[group] / groupCount[group];
      returnObj.averageTime = returnObj.averageTime.toFixed(2);
    }
  });
  return returnObj;
}
function createBoxPlot(groupId, totalTimeArray) {
  // Select the variance cell using the groupId
  //const boxPlotCell = d3.select(`#boxPlotCell_${groupId}`);
  const boxPlotCell = d3.select(`#boxPlot`);
  document.getElementById("boxPlot").innerHTML = "";
  console.log(groupId, totalTimeArray);

  // Set up the dimensions for the box plot
  const width = 200;
  const height = 150;
  const margin = { top: 10, right: 30, bottom: 30, left: 40 };

  // Create an SVG container for the box plot
  const svg = boxPlotCell
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Compute summary statistics used for the box:
  const dataSorted = totalTimeArray.sort(d3.ascending);
  const q1 = d3.quantile(dataSorted, 0.25);
  const median = d3.quantile(dataSorted, 0.5);
  const q3 = d3.quantile(dataSorted, 0.75);
  const interQuantileRange = q3 - q1;
  const min = q1 - 1.5 * interQuantileRange;
  const max = q1 + 1.5 * interQuantileRange;

  // Show the Y scale
  const y = d3
    .scaleLinear()
    .domain([Math.min(...totalTimeArray), Math.max(...totalTimeArray)])
    .range([height, 0]);
  svg.call(d3.axisLeft(y));

  // a few features for the box
  const center = width / 2;
  const boxWidth = 100;

  // Show the main vertical line
  svg
    .append("line")
    .attr("x1", center)
    .attr("x2", center)
    .attr("y1", y(min))
    .attr("y2", y(max))
    .attr("stroke", "black");

  // Show the box
  svg
    .append("rect")
    .attr("x", center - boxWidth / 2)
    .attr("y", y(q3))
    .attr("height", y(q1) - y(q3))
    .attr("width", boxWidth)
    .attr("stroke", "black")
    .style("fill", "#69b3a2");

  // Show median, min, and max horizontal lines
  const horizontalLinesData = [min, median, max];

  svg
    .selectAll("line.toto")
    .data(horizontalLinesData)
    .enter()
    .append("line")
    .attr("x1", center - boxWidth / 2)
    .attr("x2", center + boxWidth / 2)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "black");
}

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

      const tracesCell = document.createElement("td");
      tracesCell.textContent = data[key].count;
      row.appendChild(tracesCell);

      var variance, averageTime;

      getTimeForGroup(key).then(function (value) {
        variance = value.variance;
        averageTime = value.averageTime;

        const timeCell = document.createElement("td");
        timeCell.id = `timeCell_${key}`;
        timeCell.textContent = averageTime;
        row.appendChild(timeCell);

        const varianceCell = document.createElement("td");
        varianceCell.id = `varianceCell_${key}`;
        varianceCell.textContent = variance;
        row.appendChild(varianceCell);
      });
      getViolationsForGroup(key).then(function (value) {
        const violationCell = document.createElement("td");
        row.appendChild(violationCell);

        const correctnessCell = document.createElement("td");
        row.appendChild(correctnessCell);

        const idealTraceCell = document.createElement("td");
        row.appendChild(idealTraceCell);

        //console.log(value);
        violationCell.id = `violationCell_${key}`;
        violationCell.textContent = value;
        //console.log(data[key].totalViolations);

        correctnessCell.textContent = "-";

        idealTraceCell.textContent = "-";

        // Add the row to the table
        tableBody.appendChild(row);
      });
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) {
          ExtraInfo(checkbox.id);
        } else {
          clearExtraInformation();
        }
      });
    }
  }
  // getUserTasksTime();
  //getUserTasksViolations();
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
  document.getElementById("selectTraceBtn").innerHTML = `View task`;
  document.getElementById("extrainfoContent").style.opacity = 1;
  document.getElementById("placeholderText").style.display = "none";

  document.getElementById("traceInfoTitle").innerHTML = `Task Information: ${[
    taskID,
  ]}`;

  for (var key in taskInfo) {
    if (taskInfo.hasOwnProperty(key)) {
      if (key == taskID) {
        var ideaCell = document.getElementById("idea");
        if (key == 0) {
          ideaCell.textContent =
            "'Try to select a range of flights that is between the departure time of 8-12'";
        } else if (key == 1) {
          ideaCell.textContent =
            "'How many flights were longer than four and less than six hours (More than 240 minutes and less than 360 minutes)?'";
        } else if (key == 2) {
          ideaCell.textContent =
            "'Which two-hour window (during time of day) contains more flights with longer arrival delays?'";
        } else if (key == 3) {
          ideaCell.textContent =
            "'Which factors appear to have the greatest effect on the length of departure delays?'";
        } else if (key == 4) {
          ideaCell.textContent =
            "'How do distance, departure delays, and both distance and departure delays together appear to affect arrival delays?'";
        }

        var categoryCell = document.getElementById("category");
        if (key == 0) {
          categoryCell.textContent = "Tutorial";
        } else {
          categoryCell.textContent = "Exploratory";
        }

        var descriptionCell = document.getElementById("description");
        descriptionCell="-"
        var idealSequenceCell = document.getElementById("idealSequence");
        idealSequenceCell="-";

        const mostPerformed = document.getElementById("mostPerformed");
        mostPerformed.innerHTML = "";
        mostPerformed.innerHTML = `Most performed event: ${taskInfo[key].mostPerformedEvent}`;

        const eventsList = document.getElementById("interactionsList");
        eventsList.innerHTML = "";

        for (var data in taskInfo[key].interactions) {
          var eventElement = document.createElement("li");
          eventElement.textContent = `${data}: ${taskInfo[key].interactions[data]}`;
          eventsList.appendChild(eventElement);
        }
        createBoxPlot(taskID, groupVariance[taskID]);

        document.getElementById(
          "violationsTotal"
        ).innerHTML = `Total Violations: ${groupData[taskID].totalViolations}`;

        const mean = groupSum[taskID] / groupCount[taskID];
        const totalSquaredDifference = groupVariance[taskID].reduce(
          (acc, time) => acc + Math.pow(time - mean, 2),
          0
        );

        var variance = totalSquaredDifference / groupVariance[taskID].length;
        variance = variance.toFixed(2);

        document.getElementById("varianceInfo").textContent =
          "Variance: " + variance;
      }
    }
  }
}

function clearExtraInformation() {
  document.getElementById("selectTraceBtn").style.opacity = 0;
  document.getElementById(`previewTrace`).style.display = "none";
  document.getElementById("placeholderText").style.display = "block";
  document.getElementById("extrainfoContent").style.opacity = 0;
  document.getElementById("traceInfoTitle").innerHTML = "Task Information   ";
}
