import json
import csv
import os

def flatten_json(json_data, trace_id):
    flat_list = []
    timestamp = 0
    for task_id, events in enumerate(json_data.values()):
        for event in events:
            flat_list.append([event, trace_id, task_id, timestamp])
            timestamp += 1
    return flat_list

def json_to_csv(input_folder, output_folder):
    for file_name in os.listdir(input_folder):
        if file_name.startswith('task_division_falcon_7M_') and file_name.endswith('.json'):
            trace_id = file_name.split('_')[-1].split('.')[0]
            file_path = os.path.join(input_folder, file_name)
            output_file = os.path.join(output_folder, f'output_{trace_id}.csv')

            with open(file_path, 'r') as json_file, open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                csv_writer = csv.writer(csvfile)
                csv_writer.writerow(['event', 'traceID', 'taskID', 'timestamp'])

                json_data = json.load(json_file)

                flat_list = flatten_json(json_data, trace_id)
                csv_writer.writerows(flat_list)

def main():
    input_folder = "."  # Change this to your actual folder path if different
    output_folder = "csv_outputs"  # Change this to your desired output folder

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    json_to_csv(input_folder, output_folder)

if __name__ == "__main__":
    main()
