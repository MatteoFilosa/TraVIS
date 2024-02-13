function getUserTasks() {
    const url = "http://127.0.0.1:5000/get_user_tasks";
    fetch(url)
        .then((response) => response.json())
        .then((json) => {
            loadedTraces = json;
            tracesNum = json.length;
            loadingIcon.style.display = "none";
            filtersContainer.style.display = "flex";
            table.style.display = "block";
            document.getElementById("tracesNum").innerHTML =
                "Loaded User Traces: " + tracesNum;
            populateTable(loadedTraces);


        })
        .then(() => {
            // Enable filtering for table
            var table = new DataTable("#table", {
                searching: false,
                columnDefs: [
                    // exclude first and last row from filtering and sorting
                    { orderable: false, targets: [0, 5] },
                ],
                paging: false,
                order: [[1, "asc"]],
                orderCellsTop: true,
                fixedHeader: true,
            });


            //Filters creation
            createSliders();
            createCheckboxes();
            // Local JSON file
            fetch('/files/user_traces/demographic_info/demographic_info.json')
                .then(response => response.json())
                .then(data => {


                    createDemographicFilter(data);
                });

        });
}