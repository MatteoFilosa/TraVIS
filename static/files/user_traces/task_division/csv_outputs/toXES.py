import os
import pandas as pd
import pm4py

if __name__ == "__main__":
   
    output_folder = "xesFiles"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

   
    for i in range(1, 51):
        input_file = f"output_{i}_formatted.csv"
        output_file = os.path.join(output_folder, f"output_{i}_event_log.xes")

        dataframe = pd.read_csv(input_file, sep=',')
        dataframe = pm4py.format_dataframe(dataframe, case_id='taskID', activity_key='event', timestamp_key='formatted_timestamp')
        event_log = pm4py.convert_to_event_log(dataframe)

       
        pm4py.write_xes(event_log, output_file)
        print(f"Evento log salvato con successo in '{output_file}'")