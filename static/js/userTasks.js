function getUserTasks() {
    const url = "http://127.0.0.1:5000/get_user_tasks";

    fetch(url)
        .then((response) => response.json())
        .then((json) => {
            const mainContainer = document.getElementById("mainContainer");
            mainContainer.innerHTML = "";

            const aggregatedInfo = {
                "0": { count: 0, mostPerformedEvent: "", interactions: {} },
                "1": { count: 0, mostPerformedEvent: "", interactions: {} },
                "2": { count: 0, mostPerformedEvent: "", interactions: {} },
                "3": { count: 0, mostPerformedEvent: "", interactions: {} },
                "4": { count: 0, mostPerformedEvent: "", interactions: {} },
            };

            // Iterate through each file
            json.forEach((task) => {
                // Iterate through each number in the file
                Object.keys(aggregatedInfo).forEach((number) => {
                    // If the number exists in the task, update the aggregated info
                    if (task[number]) {
                        // Increment the count for the current number
                        aggregatedInfo[number].count += Array.isArray(task[number]) ? task[number].length : 0;

                        // Update the most performed event for the current number
                        const events = Array.isArray(task[number]) ? task[number] : [];
                        const eventCounts = events.reduce((acc, event) => {
                            acc[event] = (acc[event] || 0) + 1;
                            return acc;
                        }, {});

                        for (const event in eventCounts) {
                            if (
                                !aggregatedInfo[number].mostPerformedEvent ||
                                eventCounts[event] > eventCounts[aggregatedInfo[number].mostPerformedEvent]
                            ) {
                                aggregatedInfo[number].mostPerformedEvent = event;
                            }

                            // Collect all different interactions for the current number
                            if (!aggregatedInfo[number].interactions[event]) {
                                aggregatedInfo[number].interactions[event] = 0;
                            }
                            aggregatedInfo[number].interactions[event] += eventCounts[event];
                        }
                    }
                });
            });

            // Display aggregated info in the mainContainer
            Object.keys(aggregatedInfo).forEach((number) => {
                const infoDiv = document.createElement("div");
                const interactionsList = Object.entries(aggregatedInfo[number].interactions).map(([interaction, count]) => `${interaction}: ${count}`).join(", ");
                infoDiv.textContent = `${number} : Most performed event: ${aggregatedInfo[number].mostPerformedEvent} - Total interactions: ${aggregatedInfo[number].count} - All Interactions: ${interactionsList}`;
                mainContainer.appendChild(infoDiv);
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
            const mainContainer = document.getElementById("mainContainerTime");
            mainContainer.innerHTML = "";
            console.log(JSON.parse(json[0].user_trace))

            if (json && json.groups) {  // Change here
                const groupSum = {};
                const groupCount = {};

                // Iterate through each group in the file
                Object.keys(json.groups).forEach((group) => {  // Change here
                    // Update the sum for the current group
                    if (!groupSum[group]) {
                        groupSum[group] = 0;
                        groupCount[group] = 0;
                    }

                    groupSum[group] += json.groups[group].total_time;  // Change here
                    groupCount[group]++;
                });

                // Display the results in the mainContainerTime
                Object.keys(groupSum).forEach((group) => {
                    const averageTime = (groupSum[group] / (groupCount[group] * 1000)).toFixed(2); // Convert milliseconds to seconds
                    const infoDiv = document.createElement("div");
                    infoDiv.textContent = `${group} : Sum of Total Time: ${groupSum[group] / 1000} seconds - Average Time: ${averageTime} seconds`;
                    mainContainer.appendChild(infoDiv);
                });
            } else {
                console.error("Error: 'groups' property is undefined or null in the JSON response.");  // Change here
            }
        })
    }

getUserTasks();
getUserTasksTime();


function getUserTasksViolations() {
    const url = "http://127.0.0.1:5000/get_violations";

    fetch(url)
        .then((response) => response.json())
        .then((json) => {
            
        });
}



