var taskInfo = {};
var groupSum = {};
var groupCount = {};
var groupstd = {};
var violationsData;
var groupData = {};
var globalAlignmentData = {};
var globalAlignmentDataPercent = {};
var averageConformity = {};
var userTasks = {};
var allViolations = {};
var allTaskTime = {};
var interactionCounts = {};
var dynamicAlignmentData = {} //Used for user story 7
var averageDynamicAlignmentData = {}
var dynamicAlignmentEvents = {}
var dynamicTraceId = 0

window.onload = function () {
  filtersContainer = document.getElementById("filtersContainer");
  loadingIcon = document.getElementById("loadingIcon");
  table = document.getElementById("tasktable");

  colorLegend();
  getUserTasksTime();
  getRealConformity();

  //getUserTraceConformity();
  //This SUCKS, I know, but js synchronization sucks more
  //When getUserTasksTime finishes:
  //  calls getUserTasksViolations
  //    when getUserTasksViolations finishes:
  //      calls getUserTasks
};

function getRealConformity() {
  fetch("/get_trace_alignment")
    .then((response) => response.json())
    .then((data) => {
      globalAlignmentData = data;

      console.log("Alignment Data:", globalAlignmentData);

      // COnvert in percent
      globalAlignmentDataPercent = convertToPercentage(globalAlignmentData);

      console.log("Alignment Data in Percent:", globalAlignmentDataPercent);

      averageConformity = calculateAverage(globalAlignmentData);
      console.log("Average Conformity:", averageConformity);
    })
    .catch((error) => {
      console.error("Error fetching alignment data:", error);
    });
}

// Funzione per convertire alignments in percent
function convertToPercentage(originalData) {
  let newData = {};

  for (let key in originalData) {
    if (originalData.hasOwnProperty(key)) {
      newData[key] = {};

      for (let subKey in originalData[key]) {
        if (originalData[key].hasOwnProperty(subKey)) {
          newData[key][subKey] = originalData[key][subKey] * 100;
        }
      }
    }
  }

  return newData;
}

function calculateAverage(data) {
  // Initialize an object to store the sum and count for each group
  const groupSumCount = {};

  // Iterate through each file
  Object.values(data).forEach((fileData) => {
    // Iterate through each group in the file
    Object.entries(fileData).forEach(([group, value]) => {
      // Initialize the sum and count for the group if not present
      if (!groupSumCount[group]) {
        groupSumCount[group] = { sum: 0, count: 0 };
      }

      // Add the value to the sum and increment the count
      groupSumCount[group].sum += value;
      groupSumCount[group].count++;
    });
  });

  // Calculate the average for each group
  const groupAverages = {};
  Object.entries(groupSumCount).forEach(([group, { sum, count }]) => {
    groupAverages[group] = sum / count;
  });

  return groupAverages;
}

function jaccardIndex(set1, set2) {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Funzione per valutare la conformità di una traccia rispetto alla golden trace
function calculateConformity(trace, goldenTrace) {
  const traceSet = new Set(trace);
  const goldenTraceSet = new Set(goldenTrace);

  // Calcola l'indice di Jaccard
  const conformityScore = jaccardIndex(traceSet, goldenTraceSet);

  // Mappa l'indice di Jaccard su una scala da 1 a 5 o in percentuale
  const scaledScore = conformityScore * 5; // Scala da 0 a 1 a 0 a 5
  const percentageScore = conformityScore * 100; // Scala da 0 a 1 a 0% a 100%

  return {
    scaledScore: scaledScore,
    percentageScore: percentageScore,
  };
}

//Function for usert story 7, dynamic alignment

function uploadTrace() {
  // Resettare il modal
  $('#loadingModal .spinner-border').show();
  $('#loadingModal .modal-body .fas.fa-check-circle').hide();

  var $icon = $('#loadingModal .modal-body .fa-check-circle');

  // Controlla se l'elemento esiste
  if ($icon.length) {
    // Se esiste, rimpiazzalo con lo spinner border
    $icon.replaceWith('<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>');
  }
  
  $('#loadingModal .modal-body .mt-2').text('Performing trace alignment...this might take a while.');

  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = function (event) {
    var file = event.target.files[0];

    var reader = new FileReader();
    reader.onload = function () {
      var jsonContent = JSON.parse(reader.result);
      var fileName = file.name;
      var traceId = fileName.match(/\d+\.json$/)[0];
      traceId = traceId.slice(0, -5);

      dynamicTraceId = traceId

      // Mostra il modal di caricamento
      $('#loadingModal').modal('show');

      fetch('/perform_trace_alignment_with_json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ golden_trace: jsonContent, trace_id: traceId })
      })
        .then(response => response.json())
        .then(data => {
          // Nascondi il modal di caricamento dopo 2 secondi
          setTimeout(function () {
            $('#loadingModal').modal('hide');
          }, 2000); // 2000 millisecondi = 2 secondi
          // Manipola la risposta se necessario
          console.log(data);
          // Nascondi l'icona dello spinner border
          $('#loadingModal .spinner-border').hide();

          // Mostra la spunta al posto dell'icona dello spinner border
          $('#loadingModal .modal-body .spinner-border').replaceWith('<i class="fas fa-check-circle text-success fa-3x"></i>');

          // Aggiorna il contenuto del modal con il messaggio del server
          $('#loadingModal .modal-body .mt-2').text(data.message);

          //document.getElementById("uploadTraceBtn").textContent = "Trace " + traceId + " uploaded"

          dynamicAlignmentData = data

          // Array per memorizzare i valori medi
          let fitnessValuesPerIndex = [];

          // Itera attraverso dynamicAlignmentData e aggiorna le celle di correttezza
          dynamicAlignmentData.alignment_results.forEach((result) => {
            // Itera attraverso tutti gli oggetti result
            result.forEach((item, itemIndex) => {
              // Inizializza l'array se non esiste ancora
              if (!fitnessValuesPerIndex[itemIndex]) {
                fitnessValuesPerIndex[itemIndex] = [];
              }

              // Ottieni il valore di fitness per l'indice corrente e lo converti in positivo
              let fitness = Math.abs(parseFloat(item.fitness));
              // Aggiungi il valore di fitness all'array corrispondente all'indice
              fitnessValuesPerIndex[itemIndex].push(fitness);
            });
          });

          // Calcola la media dei valori di fitness per ogni indice
          averageDynamicAlignmentData = fitnessValuesPerIndex.map((values) => {
            let totalFitness = values.reduce((acc, curr) => acc + curr, 0);
            return totalFitness / values.length;
          });

          // Visualizza i valori medi nell'array
          console.log(averageDynamicAlignmentData);

          for (let j = 0; j < averageDynamicAlignmentData.length; j++){

            let taskCorrectnessCell = document.getElementById("correctness_" + j)

            taskCorrectnessCell.textContent = (averageDynamicAlignmentData[j] * 100).toFixed(2)
            taskCorrectnessCell.style.color = 'green';

          }

          var traceInfoSpan = document.getElementById("traceInfoSpan")
          traceInfoSpan.textContent = "Trace Uploaded: " + traceId
          traceInfoSpan.style.color = "green"
          traceInfoSpan.style.fontSize = "18px"
          traceInfoSpan.style.alignItems = "center";


          
          

        })
        .catch(error => {
          // Nascondi il modal di caricamento in caso di errore
          $('#loadingModal').modal('hide');
          // Gestisci gli errori
          console.error('Error:', error);
          // Mostra un messaggio di errore
          alert('There was an error in the uploading of the user trace.');
        });
    };
    reader.readAsText(file);
  };

  input.click();
}


function displayJSONModal(jsonContent) {
  // Trova l'elemento del body del modal
  var modalBody = document.getElementById('jsonModalBody');

  // Svuota il contenuto precedente
  modalBody.innerHTML = '';

  // Crea un nuovo elemento <pre> per mantenere la formattazione del JSON
  var preElement = document.createElement('pre');

  // Inserisci il contenuto JSON all'interno del <pre>
  preElement.textContent = jsonContent;

  // Aggiungi il <pre> contenente il JSON all'elemento del body del modal
  modalBody.appendChild(preElement);

  // Mostra il modal
  $('#jsonModal').modal('show');
}


function getUserTasks() {
  const url = "http://127.0.0.1:5000/get_user_tasks";

  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      userTasks = json;
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

 
      var button = document.createElement('button');
      button.className = 'btn extraFiltersBtn';
      button.id = "uploadTraceBtn";

      var traceInfoSpan = document.createElement('span');
      traceInfoSpan.id = "traceInfoSpan";
      

      // Creazione dell'icona FontAwesome e del testo del bottone
      var icon = document.createElement('i');
      icon.className = 'fas fa-file-alt'; // Specifica il nome delle classi FontAwesome per l'icona
      var buttonText = document.createTextNode('New Ideal Path');

      // Aggiungi l'icona e il testo al bottone
      button.appendChild(icon);
      button.appendChild(buttonText);

      button.onclick = uploadTrace

      var upperDiv = document.getElementById('upperDiv');
      upperDiv.appendChild(traceInfoSpan);
      upperDiv.appendChild(button);

      

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

            for (const event of Object.keys(eventCounts)) {
              if (
                !taskInfo[number].mostPerformedEvent ||
                eventCounts[event] >
                  taskInfo[number].interactions[
                    taskInfo[number].mostPerformedEvent
                  ]
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
      console.log(taskInfo)
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

const traceConformityScores = [];

function getUserTraceConformity() {
  const url = "http://127.0.0.1:5000/get_user_trace_conformity";

  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      json.forEach((trace, index) => {});

      // Now traceConformityScores array contains conformity scores for each trace
      console.log("Trace Conformity Scores: ");
    })
    .catch((error) => {
      console.error("Error fetching user tasks:", error);
    });
}

function getGoldenTraceAlignment() {
  const url = "http://127.0.0.1:5000/get_traceAlignment";
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
        allTaskTime = json;
        json.forEach((item) => {
          const groups = JSON.parse(item.user_trace).groups;

          if (groups) {
            Object.keys(groups).forEach((group) => {
              if (!groupSum[group]) {
                groupSum[group] = 0;
                groupCount[group] = 0;
                groupstd[group] = [];
              }

              groupSum[group] += groups[group].total_time / 1000;
              groupCount[group]++;
              groupstd[group].push(groups[group].total_time / 1000); // Store total_time for std calculation
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
      allViolations = json;
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
    std: 0,
    averageTime: 0,
  };
  Object.keys(groupSum).forEach((group) => {
    if (group == groupID) {
      const mean = groupSum[group] / groupCount[group];
      const totalSquaredDifference = groupstd[group].reduce(
        (acc, time) => acc + Math.pow(time - mean, 2),
        0
      );

      returnObj.std = totalSquaredDifference / groupstd[group].length;
      returnObj.std = returnObj.std.toFixed(2);
      console.log(`Task ${group} std: ${returnObj.std}`);
      // Use d3 to create boxplot
      //createBoxPlot(group, groupstd[group]);

      returnObj.averageTime = groupSum[group] / groupCount[group];
      returnObj.averageTime = returnObj.averageTime.toFixed(2);
    }
  });
  return returnObj;
}
var checkboxChecked = false;
function populateTable(data) {
  const tableBody = document.getElementById("tracesTable");

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      const row = document.createElement("tr");
      row.id = "row" + key;
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

      var std, averageTime;

      getTimeForGroup(key).then(function (value) {
        std = value.std;
        averageTime = value.averageTime;

        const timeCell = document.createElement("td");
        timeCell.id = `timeCell_${checkbox.id}`;
        timeCell.textContent = averageTime;
        row.appendChild(timeCell);

        const stdCell = document.createElement("td");
        stdCell.id = `stdCell_${checkbox.id}`;
        stdCell.textContent = Math.sqrt(std).toFixed(2);
        row.appendChild(stdCell);
      });
      getViolationsForGroup(key).then(function (value) {
        const violationCell = document.createElement("td");
        row.appendChild(violationCell);

        const correctnessCell = document.createElement("td");
        correctnessCell.id = `correctness_${checkbox.id}`;
        row.appendChild(correctnessCell);

        //Start Golden Trace Button

        const idealTraceCell = document.createElement("td");
        var goldenTraceBtn = document.createElement("button");
        var btnImg = document.createElement("img");
        btnImg.src = "images/newPage.png";
        btnImg.width = "20px";
        btnImg.height = "20px";
        goldenTraceBtn.appendChild(btnImg);
        goldenTraceBtn.classList.add("btn", "extraFiltersBtn"); // Add Bootstrap button classes
        goldenTraceBtn.style.width = "100px";
        goldenTraceBtn.textContent = "Show";
        goldenTraceBtn.setAttribute("showedGoldenTrace", "false");
        goldenTraceBtn.setAttribute("data-toggle", "modal");
        goldenTraceBtn.setAttribute("data-target", "#filtersModal");

        goldenTraceBtn.addEventListener("click", function () {
          clearExtraInformation();
          goldenTraceBtn.classList.toggle("goldenTraceBtnClicked");
          // Get the checkbox ID
          const checkboxId = checkbox.id;
          if (checkbox.checked) checkbox.checked = false;

          if (goldenTraceBtn.getAttribute("showedGoldenTrace") == "false") {
            const pressedBtns = document.querySelectorAll(
              '[showedGoldenTrace="true"]'
            );
            pressedBtns.forEach((element) => {
              element.setAttribute("showedGoldenTrace", "false");
              element.classList.toggle("goldenTraceBtnClicked");
              document.getElementById("goldenTraceEvents").innerHTML = "";
            });

            goldenTraceBtn.setAttribute("showedGoldenTrace", "true");

         

            //document.getElementById("goldenTraceEvents").id += "_" + checkboxId

            // Retrieve the information from the super_golden_trace.json file

            if (Object.keys(dynamicAlignmentData).length == 0) {

              fetch("/files/user_traces/trace_alignment/super_golden_trace.json")
                .then((response) => response.json())
                .then((data) => {
                  document.getElementById(
                    "traceInfoTitle"
                  ).innerHTML = `Golden Trace for Task ${checkboxId}`;
                  document.getElementById("goldenTraceContent").style.opacity = 1;

                  document.getElementById("extrainfoContent").style.display =
                    "none";
                  document.getElementById("placeholderText").style.display =
                    "none";
                  generateHeatmap(data, checkbox.id);
                  // Extra Info for golden trace: Populate the modal with the information
                  data[checkboxId].forEach((item) => {
                    const li = document.createElement("li");
                    li.style.color = "#000";
                    li.textContent = item;
                    document.getElementById("goldenTraceEvents").appendChild(li);
                  });
                  var replayTraceBtnElem =
                    document.getElementById("replayTraceBtn");
                  replayTraceBtnElem.style.opacity = 1;
                  document.getElementById("selectTraceBtn").style.display =
                    "none";
                  replayTraceBtnElem.addEventListener("click", function () {
                    localStorage.removeItem("selectedTrace");
                    localStorage.removeItem("selectedTraceID");
                    localStorage.removeItem("loadedTraces");

                    /// TODO: find id of golden trace and get raw value so we can replay it
                    let url = "http://127.0.0.1:5000/replay";
                    fetch(url, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        current_trace: JSON.stringify(selectedTrace_RawValue),
                        name: "falcon",
                      }),
                    }).then((response) => console.log(response));
                  });
                });
            }

            //If the user performed a dynamic alignment, I need to show him the new golden trace divided by task
            else{

              fetch("/files/user_traces/task_division/task_division_falcon_7M_" + dynamicTraceId + ".json")
                .then((response) => response.json())
                .then((data) => {
                  console.log(data)

             

                    document.getElementById(
                      "traceInfoTitle"
                    ).innerHTML = `Golden Trace for Task ${checkboxId}`;
                    document.getElementById("goldenTraceEvents").innerHTML = ""
                    document.getElementById("goldenTraceContent").style.opacity = 1;
                    document.getElementById("extrainfoContent").style.display =
                      "none";
                    document.getElementById("placeholderText").style.display =
                      "none";
                  generateHeatmap(data, checkboxId);
                    // Extra Info for golden trace: Populate the modal with the information
                      data[checkboxId].forEach((item) => {
                      const li = document.createElement("li");
                      li.style.color = "green";
                      li.textContent = item;
                      document.getElementById("goldenTraceEvents").appendChild(li);
                    });

                  

                });

            }

            

            
          } else {
            document.getElementById(
              "traceInfoTitle"
            ).innerHTML = `Task Information `;
            clearExtraInformation();
            goldenTraceBtn.setAttribute("showedGoldenTrace", "false");
            document.getElementById("goldenTraceContent").style.opacity = 0;
            document.getElementById("extrainfoContent").style.display = "block";
            document.getElementById("placeholderText").style.display = "block";
            document.getElementById("replayTraceBtn").style.opacity = 0;
            document.getElementById("selectTraceBtn").style.display = "block";
          }
        });

        // Append the button to the idealTraceCell
        idealTraceCell.appendChild(goldenTraceBtn);

        row.appendChild(idealTraceCell);

        //End golden trace cell

        //console.log(value);
        violationCell.id = `violationCell_${checkbox.id}`;
        violationCell.textContent = value;
        //console.log(data[key].totalViolations);

        correctnessCell.textContent = (
          averageConformity[checkbox.id] * 100
        ).toFixed(2);

        const buttonCell = document.createElement("td");
        var btn = document.createElement("button");
        btn.id = `expand${checkbox.id}`;
        btn.classList.add("expandButton");
        var img = document.createElement("img");
        img.src = "images/downArrow.png";
        img.width = "20px";
        img.height = "20px";
        img.id = `expandImg${checkbox.id}`;
        btn.appendChild(img);

        buttonCell.appendChild(btn);
        row.appendChild(buttonCell);

        // Add the row to the table
        tableBody.appendChild(row);
        btn.addEventListener("click", function () {
          expandTableOnClick(checkbox.id, row);
        });
      });
      var newRow;
      checkbox.addEventListener("change", function () {
        if (checkboxChecked) {
          const checkboxes = document.querySelectorAll('input[checked="true"]');
          checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
              const row = checkbox.closest("tr");
      row.classList.remove("table-selected");
              checkbox.setAttribute("checked", "false");
              row.classList.remove("table-selected");
              checkbox.checked = false;
              clearExtraInformation();
            }
          });
        }
        if (checkbox.checked) {
          checkboxChecked = true;
          checkbox.setAttribute("checked", "true");
          row.classList.add("table-selected");
          ExtraInfo(checkbox.id);
        } else {
          checkboxChecked = false;
          checkbox.setAttribute("checked", "false");
          row.classList.remove("table-selected");
          clearExtraInformation();
        }
      });
    }
  }
  // getUserTasksTime();
  //getUserTasksViolations();
}

function generateHeatmap(data, id) {
  var mainDiv;
  mainDiv = document.getElementById("heatmap");
  mainDiv.innerHTML = "";

  var rows = Math.ceil(Math.sqrt(data[id].length));
  var columns = Math.ceil(data[id].length / rows);

  //console.log(data[id]);
  data[id].forEach((item, i) => {
    var match = item.match(/^[^\s]+/)[0];
    //Create a div for each event
    var eventDiv = document.createElement("div");
    eventDiv.className = "event-rectangle";
    eventDiv.style.width = 100 / columns + "%";
    eventDiv.style.height = 100 / rows + "%";
    eventDiv.style.backgroundColor = getColor(match);
    eventDiv.style.position = "absolute";
    eventDiv.style.left = (i % columns) * (100 / columns) + "%";
    eventDiv.style.top = Math.floor(i / columns) * (100 / rows) + "%";

    // Append the event div to the main div
    mainDiv.appendChild(eventDiv);

    // Set the number of rows and columns as CSS variables for the main div
    mainDiv.style.setProperty("--rows", rows);
    mainDiv.style.setProperty("--columns", columns);
  });
  return mainDiv;
}
var rowExpanded = false;

//INNER TABLES 

function expandTableOnClick(id, row) {
  if (!rowExpanded) {
    if (document.getElementById(`newrow${id}`) == undefined) {
      newRow = document.createElement("tr");
      newRow.classList.add("extraRow");
      var rowWidth = row.offsetWidth;

      newRow.style.width = rowWidth + "px";
      newRow.id = `newrow${id}`;

      row.appendChild(newRow);
      addTraceInfo(id).then(() => {
        // Enable sorting for table
        var table = new DataTable(`#innerTable${id}`, {
          searching: false,
          paging: false,
          order: [[0, "asc"]],
          orderCellsTop: true,
          fixedHeader: true,
        });
      });
    } else {
      document.getElementById(`newrow${id}`).style.display = "table-row";
    }

    for (var i = 0; i <= 4; i++) {
      if (i != id) document.getElementById(`row${i}`).style.display = "none";
    }
    document.getElementById(`expandImg${id}`).style.transform =
      "rotate(" + 180 + "deg)";
    rowExpanded = true;
  } else {
    document.getElementById(`newrow${id}`).style.display = "none";
    for (var i = 0; i <= 4; i++) {
      document.getElementById(`row${i}`).style.display = "table-row";
    }
    document.getElementById(`expandImg${id}`).style.transform =
      "rotate(" + 0 + "deg)";
    rowExpanded = false;
  }
}

//POPULATING THE INNER TABLES

async function addTraceInfo(taskID) {
  var div = document.getElementById(`newrow${taskID}`);
  var title = document.createElement("p");
  title.textContent = `Traces of Task ${taskID}`;
  div.appendChild(title);
  var tableDiv = document.createElement("div");
  tableDiv.classList.add("innerTableDiv");

  var table = document.createElement("table");
  table.classList.add("table-responsive");
  table.classList.add("table-hover");
  table.id = `innerTable${taskID}`;

  // Create table header
  var thead = document.createElement("thead");
  var tr = document.createElement("tr");
  var columns = [
    "User ID",
    "Interactions",
    "Violations",
    "Execution Time",
    "Correctness %",
  ];
  columns.forEach(function (columnName, index) {
    var th = document.createElement("th");
    th.scope = "col";
    th.style.width = "2.5%";

    var divContent = document.createElement("div");
    divContent.style.display = "flex";
    var iconImg = document.createElement("img");
    if (index == 0) iconImg.src = "images/userIcon.png";
    else if (index == 1) iconImg.src = "images/interactorIcon.png";
    else if (index == 2) iconImg.src = "images/errorIcon.png";
    else if (index == 3) iconImg.src = "images/timeIcon.png";
    iconImg.width = "20";
    iconImg.height = "20";
    if (index != 4) divContent.appendChild(iconImg);

    var text = document.createElement("h6");
    text.textContent = columnName;
    divContent.appendChild(text);
    th.appendChild(divContent);
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  var traceCnt = 0;
  var tbody = document.createElement("tbody");
  tbody.id = "tracesTable"; // corretto da tbody.classList.id a tbody.id

  userTasks.forEach((element) => {
    let totalElements = 0;
    let events = {};
    for (let key in userTasks[traceCnt]) {
      if (key == taskID) {
        totalElements += userTasks[traceCnt][key].length;
        events = userTasks[traceCnt][key];
      }
    }
    if (totalElements != 0) {
      var tr = document.createElement("tr");

      var userIDCell = document.createElement("td");
      userIDCell.textContent = traceCnt + 1;
      tr.appendChild(userIDCell);

      var interactionsCell = document.createElement("td");
      interactionsCell.textContent = totalElements;
      eventTypes(events).then(function (value) {
        interactionsCell.appendChild(createEventsBar(value, traceCnt + 1));
        interactionsCell.style.display = "flex";
        interactionsCell.style.marginTop = "12%";
      });
      tr.appendChild(interactionsCell);

      var violationsCell = document.createElement("td");
      let violations = {};
      allViolations.forEach((jsonData, index) => {
        let match = jsonData.name.match(/_(\d+)\.[a-zA-Z]+$/);
        let extractedNumber = match ? match[1] : null;

        if (extractedNumber === (traceCnt + 1).toString()) {
          const userTrace = JSON.parse(jsonData.user_trace);
          let totalViolations = 0;
          for (let key in userTrace) {
            if (key == taskID) {
              totalViolations += userTrace[key].length;
              violations = userTrace[key];
              findViolations(violations).then(function (value) {
                violationsCell.appendChild(createViolationsBar(value));
              });
              tr.appendChild(violationsCell);
            }
          }
        }
      });

      var timeCell = document.createElement("td");
      const timeInfo = { totalTime: 0, averageTime: 0 };
      allTaskTime.forEach((element, index) => {
        let match = element.name.match(/_(\d+)\.[a-zA-Z]+$/);
        let extractedNumber = match ? match[1] : null;

        if (extractedNumber === (traceCnt + 1).toString()) {
          const userTrace = JSON.parse(element.user_trace);
          for (let key in userTrace.groups) {
            if (key == taskID) {
              var totalTimeInSeconds = (
                userTrace.groups[key].total_time / 1000
              ).toFixed(2); // Convert milliseconds to seconds
              timeInfo.totalTime = totalTimeInSeconds;
              timeCell.textContent = totalTimeInSeconds;
              tr.appendChild(timeCell);
            }
          }
        }
      });

      // CORRECTNESS CELL
      var correctnessCell = document.createElement("td");

      //IF the user still didn't perform dynamic trace alignment
      if (Object.keys(dynamicAlignmentData).length == 0) {
        Object.entries(globalAlignmentDataPercent).forEach(([fileName, data]) => {
          const regex = /alignment_result_(\d+)\.json/;
          const match = fileName.match(regex);
          if (parseInt(match[1], 10) == traceCnt + 1) {
            correctnessCell.textContent = `${(data[taskID] || 0).toFixed(2)}`;
            tr.appendChild(correctnessCell);
          }
        });
      } else {
        // Populating inner tables with dynamic alignment data (IF present)
        dynamicAlignmentData.alignment_results.forEach((result, index) => {

          if (result[taskID].fitness != undefined){
            if (result[taskID].trace_id == traceCnt + 1) {
              //console.log(result[taskID].trace_id, traceCnt)
              const fitness = result[taskID].fitness
              //console.log(fitness)
              const fitnessPercent = Math.abs((parseFloat(fitness) * 100)).toFixed(2); 

              correctnessCell.textContent = `${fitnessPercent}`;
              correctnessCell.style.color = 'green'; // Cambia il colore del testo in verde
              tr.appendChild(correctnessCell);

            }

          }
          
          
        });
      }

      tbody.appendChild(tr); // Spostato all'interno del controllo if-else per assicurarsi che venga aggiunto solo se ci sono dati
    }
    traceCnt++;
  });

  table.appendChild(tbody);
  tableDiv.appendChild(table);
  div.appendChild(tableDiv);

  const EventElements = document.querySelectorAll("[id^='eventCell']");
  EventElements.forEach((element) => {
    element.style.marginTop = "10%";
  });

  const ViolationElements = document.querySelectorAll("[id^='violationBarCell']");
  ViolationElements.forEach((element) => {
    element.style.marginTop = "10%";
  });
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
      colorElementImg.style.backgroundColor = "#F8D3D3";
    else if (element.includes("Medium"))
      colorElementImg.style.backgroundColor = "#EA7B7B";
    else if (element.includes("High"))
      colorElementImg.style.backgroundColor = "#DC2323";
    else if (element.includes("Critical"))
      colorElementImg.style.backgroundColor = "#580E0E";

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

  document.getElementById("selectTraceBtn").onclick = function () {
    //window.location.href = "home"; //!!!!!

    localStorage.setItem("taskInfo", JSON.stringify(taskInfo));
    localStorage.setItem("taskID", JSON.stringify(taskID));
    window.open("home", "_blank");
  };

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
        descriptionCell = "-";

        

        // Retrieve the information from the super_golden_trace.json file
        fetch("/files/user_traces/trace_alignment/super_golden_trace.json")
          .then((response) => response.json())
          .then((data) => {
            var idealSequenceCell = document.getElementById("idealSequence");
            data[taskID].forEach((item) => {
              const p = document.createElement("p");
              p.style.color = "#000";
              p.style.fontWeight = "400";
              p.textContent = item;
              idealSequenceCell.appendChild(p);
            });
          });
        const mostPerformed = document.getElementById("mostPerformed");
        mostPerformed.innerHTML = "";
        document.getElementById(
          "mostPerformed"
        ).innerHTML = `${taskInfo[key].mostPerformedEvent}`;

        const eventsList = document.getElementById("interactionsList");
        eventsList.innerHTML = "";

        for (var data in taskInfo[key].interactions) {
          var eventElement = document.createElement("li");
          eventElement.textContent = `${data}: ${taskInfo[key].interactions[data]}`;
          eventsList.appendChild(eventElement);
        }
        //createBoxPlot(taskID, groupstd[taskID]);

        document.getElementById(
          "violationsTotal"
        ).innerHTML = `${groupData[taskID].totalViolations}`;

        const mean = groupSum[taskID] / groupCount[taskID];
        const totalSquaredDifference = groupstd[taskID].reduce(
          (acc, time) => acc + Math.pow(time - mean, 2),
          0
        );

        var std = Math.sqrt(totalSquaredDifference / groupstd[taskID].length);
        std = std.toFixed(2);

        document.getElementById("stdInfo").textContent = std;
      }
    }
  }
}

function clearExtraInformation() {
  document.getElementById("selectTraceBtn").style.opacity = 0;
  document.getElementById("placeholderText").style.display = "block";
  document.getElementById("extrainfoContent").style.opacity = 0;
  document.getElementById("traceInfoTitle").innerHTML = "Task Information   ";
}
async function eventTypes(events) {
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

  events.forEach((element, index) => {
    searchWords.forEach(function (searchWord) {
      if (String(element).includes(searchWord)) {
        wordCount[searchWord]++;
      }
    });
  });

  return wordCount;
}
function createEventsBar(events, userTraceIndex) {
  const eventRectangle = document.createElement("div");
  eventRectangle.id = "eventRectangle";
  eventRectangle.innerHTML = "";

  // Calculate the total number of events
  const totalEvents = Object.values(events).reduce(
    (acc, count) => acc + count,
    0
  );

  // Set a minimum width for the bar
  const minWidthPercent = 5; // Adjust as needed

  // Calculate the maximum width of a single event type bar
  const maxBarWidthPercent = 80; // Adjust as needed

  // Calculate the width of the bar based on total events
  const totalBarWidthPercent = Math.min(maxBarWidthPercent, totalEvents);

  // Calculate the width of each event bar
  for (const [eventName, count] of Object.entries(events)) {
    if (count > 0) {
      const percentage = (count / totalEvents) * totalBarWidthPercent;

      const barWidth = Math.max(minWidthPercent, percentage);

      const eventDiv = document.createElement("div");
      eventDiv.classList.add("eventColor");
      eventDiv.style.height = "20px";
      eventDiv.style.width = `${barWidth}%`;
      eventDiv.style.backgroundColor = getColor(eventName);
      eventRectangle.appendChild(eventDiv);
    }
  }

  return eventRectangle;
}

async function findViolations(violations) {
  const levelCount = {
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
  };
  if (Array.isArray(violations)) {
    violations.forEach(function (element) {
      const match = element.match(/violation of level (\d+)/);
      if (match) {
        const level = `level${match[1]}`;
        levelCount[level]++;
      }
    });
  }

  return levelCount;
}
//#endregion

function createViolationsBar(violations) {
  const violationsRectangle = document.createElement("div");
  violationsRectangle.style.display = "flex";
  violationsRectangle.style.width = "100%";
  violationsRectangle.style.marginTop = "10%";
  violationsRectangle.style.justifyContent = "space-between";
  violationsRectangle.id = "violationsRectangle";
  violationsRectangle.innerHTML = "";

  // Calculate the percentage of each event type
  const totalViolations = Object.values(violations).reduce(
    (acc, count) => acc + count,
    0
  );

  var totalNum = document.createElement("p");
  totalNum.textContent = totalViolations;
  totalNum.style.marginRight = "8px";
  totalNum.style.color = "black";
  totalNum.id = "violationsCell";
  violationsRectangle.appendChild(totalNum);

  const percentages = {};
  for (const [violationName, count] of Object.entries(violations)) {
    percentages[violationName] = (count / totalViolations) * 100;
  }

  const sortedPercentages = Object.entries(violations)
    .map(([violationName, count]) => ({
      violationName,
      percentage: (count / totalViolations) * 100,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  // Set a minimum width for the bar
  const minWidth = 10;

  // Create and append bars based on violation types
  let wrapperDiv = document.createElement("div");
  wrapperDiv.style.width = "80%";
  wrapperDiv.style.display = "flex";
  wrapperDiv.style.marginTop = "5px";

  for (const { violationName, percentage } of sortedPercentages) {
    // Check if the violation count is greater than 0
    if (violations[violationName] > 0) {
      const eventDiv = document.createElement("div");
      eventDiv.classList.add("eventColor");
      eventDiv.style.height = "20px";

      // Calculate the width of the bar based on percentage
      const barWidth = Math.max(
        minWidth,
        (percentage / 100) * (totalViolations / 10)
      );
      eventDiv.style.width = `${barWidth}%`;

      // Set different background colors based on violation level
      if (violationName.includes("1"))
        eventDiv.style.backgroundColor = "#F8D3D3";
      else if (violationName.includes("2"))
        eventDiv.style.backgroundColor = "#EA7B7B";
      else if (violationName.includes("3"))
        eventDiv.style.backgroundColor = "#DC2323";
      else if (element.includes("4"))
        colorElementImg.style.backgroundColor = "#580E0E";

      wrapperDiv.appendChild(eventDiv);
    }
  }

  violationsRectangle.appendChild(wrapperDiv);
  return violationsRectangle;
}
