
#SCRIPT CHE METTE UN CAMPO TASK_ID A OGNI EVENTO DELLA TRACCIA ED ELIMINA SIBLINGS E STARTINGPATH
#


import os
import json

def add_task_id_to_json(file_path):
    with open(file_path, "r") as file:
        json_data = json.load(file)

    task_id = 0  # Inizializziamo il contatore task_id

    print(json_data)

    # Aggiungi il campo task_id a ciascun elemento della lista
    for events_list in json_data:
        for event_data in events_list:
            if isinstance(event_data, dict):
                event_data["task_id"] = task_id
        task_id += 1  # Incrementa il contatore task_id

    # Rimuovi i campi "startingPath" e "siblings" da ciascun elemento della lista
    for events_list in json_data:
        for event_data in events_list:
            if isinstance(event_data, dict):
                if "startingPath" in event_data:
                    del event_data["startingPath"]
                if "siblings" in event_data:
                    del event_data["siblings"]

    # Scrivi le modifiche nel file JSON
    with open(file_path, "w") as file:
        json.dump(json_data, file, indent=2)

# Directory contenente i 50 file JSON (directory corrente)
json_folder = "."

# Loop attraverso i file JSON nella cartella
for filename in os.listdir(json_folder):
    print(filename)
    if filename.endswith(".json"):
        file_path = os.path.join(json_folder, filename)
        add_task_id_to_json(file_path)

print("Task ID aggiunti e campi rimossi correttamente nei file JSON.")


