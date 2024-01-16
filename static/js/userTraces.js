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

        }).then(() => {
            $('#table thead tr')
            .clone(true)
            .addClass('filters')
            .appendTo('#table thead');

            var table = new DataTable("#table", {
                columnDefs: [
                    { "orderable": false, "targets": [0, 7] },
                    { "searchable": false, "targets": [0, 7] },
                ],
                orderCellsTop: true,
                fixedHeader: true,
                initComplete: function () {
                    var api = this.api();
            
                    // For each column
                    api.columns().eq(0).each(function (colIdx) {
                        // Skip the first and last columns
                        if (colIdx !== 0 && colIdx !== api.columns().eq(0).length - 1) {
                            // Set the header cell to contain the input element
                            var cell = $('.filters th').eq(
                                $(api.column(colIdx).header()).index()
                            );
                            var title = $(cell).text();
                            $(cell).html('<input type="text" placeholder="' + title + '" />');
            
                            // On every keypress in this input
                            $(
                                'input',
                                $('.filters th').eq($(api.column(colIdx).header()).index())
                            )
                                .off('keyup change')
                                .on('change', function (e) {
                                    // Get the search value
                                    $(this).attr('title', $(this).val());
                                    var regexr = '^{search}$';
            
                                    // Search the column for that value
                                    api
                                        .column(colIdx)
                                        .search(
                                            this.value != ''
                                                ? regexr.replace('{search}', '(((' + this.value + ')))')
                                                : '',
                                            this.value != '',
                                            this.value == ''
                                        )
                                        .draw();
                                })
                                .on('keyup', function (e) {
                                    e.stopPropagation();
            
                                    $(this).trigger('change');
                                });
                        }
                    });
                },
            });
            
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
        nameCell.textContent = id_Cnt;
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
            iconButton.id = `button${id_Cnt}`;
            const iconImg = document.createElement("img");
            iconImg.classList.add("expandButton");
            iconImg.src = "images/expandIcon.png";
            iconImg.id = `buttonImg${id_Cnt}`;
            iconButton.appendChild(iconImg);


            iconButton.addEventListener("click", () => {
                var numbersOnlyID = iconButton.id.replace(/\D/g, '');
                if (document.getElementById(`extrainfoDiv`).getAttribute('data-visible') === 'false') {
                    document.getElementById("extrainfoDiv").classList.remove("hiddenInfo");
                    document.getElementById("extrainfoDiv").classList.add("extrainfoDiv");
                    document.getElementById(`extrainfoDiv`).setAttribute('data-visible', 'true');
                } else {
                    document.getElementById("extrainfoDiv").classList.add("hiddenInfo");
                    document.getElementById("extrainfoDiv").classList.remove("extrainfoDiv");
                    document.getElementById(`extrainfoDiv`).setAttribute('data-visible', 'false');
                }


            });
            iconCell.appendChild(iconButton);
            row.appendChild(iconCell);


            // Add the row to the table
            tableBody.appendChild(row);

            // const extrainfoRow = document.createElement("tr");
            // extrainfoRow.classList.add("no-sort");
            // extrainfoRow.id = `row${id_Cnt}`;
            // extrainfoRow.style.display = "none";
            // extrainfoRow.style.transition = "display 1s";
            // //extrainfoRow.classList.add("extrainfoRow");

            // const infoDiv = document.createElement("td");
            // infoDiv.textContent = "Test";

            // infoDiv.colSpan = "10";
            // extrainfoRow.appendChild(infoDiv);

            //tableBody.appendChild(extrainfoRow);


        }

        );
        id_Cnt++;
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
