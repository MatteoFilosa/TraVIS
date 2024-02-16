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

                // Sort interactions by the number of interactions
                const sortedInteractions = Object.entries(aggregatedInfo[number].interactions)
                    .sort((a, b) => b[1] - a[1])
                    .map(([interaction, count]) => `${interaction}: ${count}`);

                infoDiv.textContent = `${number} : Most performed event: ${aggregatedInfo[number].mostPerformedEvent} - Total interactions: ${aggregatedInfo[number].count} - All Interactions: ${sortedInteractions.join(", ")}`;
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
                    const averageTime = (groupSum[group] / (groupCount[group] * 1000)).toFixed(2); // Converti millisecondi in secondi
                    const infoDiv = document.createElement("div");
                    infoDiv.textContent = `${group} : Somma del Tempo Totale: ${groupSum[group] / 1000} secondi - Tempo Medio: ${averageTime} secondi`;
                    mainContainer.appendChild(infoDiv);
                });
            } else {
                console.error("Errore: la proprietà 'groups' è indefinita o nulla nella risposta JSON.");
            }
        })
        .catch((error) => {
            console.error("Errore durante il recupero dei dati:", error);
        });
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



