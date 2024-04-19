from flask import Flask, render_template, jsonify, make_response, request, send_file
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_caching import Cache
from configparser import ConfigParser
import pm4py
from pm4py.algo.conformance.alignments.edit_distance import algorithm as logs_alignments

import os, re
import subprocess
import json



from PathsGenerator import *
from PathsSimulator import *
from modifySvgApp import *

app = Flask(__name__,
            static_url_path='', 
            static_folder='static',
            template_folder='templates')

CORS(app)

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

config = ConfigParser()
config.read('config.ini')

#Removes XPath for now and sets font color to black
def graph_layout(name):
    input_file_path = 'static/files/statechartGV/' + name +'.gv'
    output_file_path = 'static/files/statechartGVLayout/' + name + '.gv'

    patternXPath = re.compile(r"\\n\([^)]*\)")
    patternBlack = re.compile(r'fontcolor="#FFFFFF"')
    replacement = 'fontcolor="#000000"'

    with open(input_file_path, 'r') as input_file:
        lines = input_file.readlines()
    
    modified_lines = [re.sub(patternXPath, "", line) for line in lines]
    modified_lines = [re.sub(patternBlack, replacement, line) for line in modified_lines]


    with open(output_file_path, 'w') as output_file:
        output_file.writelines(modified_lines)

    print(f"Modified content written to {output_file_path}")

    return modified_lines

@app.route("/visualizeStatechart",methods=['POST'])
def visualizeStatechart():
    # Get the JSON data from the request body
    request_data = request.get_json()

    # Extract the graph data list from the JSON data
    graph_data_list = request_data.get('graphData', [])

    # Ensure graph_data_list is not empty
    if not graph_data_list:
        return jsonify({'error': 'Empty graph data list'})

    # Construct the DOT content from the list
    graph_content = '\n'.join(graph_data_list)

    # Save the constructed graph content to a temporary file
    with open('input_graph.gv', 'w') as graph_file:
        graph_file.write(graph_content)

    # Run the dot command to generate the SVG file
    dot_command = "dot -Tsvg -o output.svg input_graph.gv"
    subprocess.run(dot_command, shell=True)

    # Read the generated SVG content
    with open('output.svg', 'r') as svg_file:
        svg_content = svg_file.read()

    # Optionally, you can remove the generated SVG file if needed
    # Uncomment the following line if you want to delete the file
    os.remove('output.svg')

    # Return the raw SVG content as a response
    return jsonify({'svgContent': svg_content})


def replace_string_in_file(file_path, output_path, old_string, new_string):
    with open(file_path, 'r') as file:
        file_content = file.read()

    # Replace the string
    new_content = file_content.replace(old_string, new_string)
    print(new_content)

    # Write the new content to the file
    with open(output_path, 'w') as file:
        file.write(new_content)

def generate_svg(file_path):
    # Read the content of the Graphviz file before modification
    with open(file_path, 'r') as graphviz_file:
        graphviz_content = graphviz_file.read()
        # Print the content of the Graphviz file in the console
        # print("Graphviz content before transformation:")
        # print(graphviz_content)

    #print(graphviz_content)

    # Execute the command to generate the SVG using Graphviz (dot)
    dot_command = f"dot -Tsvg -o output.svg {file_path}"
    subprocess.run(dot_command, shell=True)


@app.route("/changeLayout/<vis_name>/<layoutName>", methods=['POST'])
def change_layout(vis_name, layoutName):
    # Build the file path based on vis_name
    file_path = os.path.join("static", "files", "statechartGV", f"{vis_name}.gv")
    output_path = os.path.join("static", "files", "statechartGVLayout", f"{vis_name}.gv")
    # Check if the file exists
    if os.path.exists(file_path):
        print("okexists")
        # Modify the content of the file based on layoutName, for example
        if layoutName == "normal":
            
            # Do something with the "normal" layout
            generate_svg(file_path)

            # Read the content of the SVG file
            with open('output.svg', 'r') as svg_file:
                svg_content = svg_file.read()

            # Return the raw SVG content as a response
            return jsonify({'svgContent': svg_content})
    
        elif layoutName == "neato":
            # Replace the specific string in the file
            old_string = 'rankdir="LR";'
            string_to_remove = "splines=ortho;"
            new_string = '''
graph [
    layout = neato
    labelloc = b
    fontname = "Helvetica,Arial,sans-serif"
    start = regular
    normalize = 0
    overlap = false;  // or scalexy, scale, prism, ortho, or compress
]
node [
    shape = circle
    style = filled
    color = "#00000088"
    fontname = "Helvetica,Arial,sans-serif"
]
edge [
    len = 1
    color = "#00000088"
    fontname = "Helvetica,Arial,sans-serif"
]'''

            replace_string_in_file(file_path, output_path, string_to_remove, '')
            replace_string_in_file(file_path, output_path, old_string, new_string)

        # Generate the SVG after the modification, if it doesn't exist yet
        generate_svg(output_path)

        # Read the content of the SVG file
        with open('output.svg', 'r') as svg_file:
            svg_content = svg_file.read()

        # Return the raw SVG content as a response
        return jsonify({'svgContent': svg_content})
    else:
        # If the file doesn't exist, return an error message
        return jsonify({'status': 'error', 'message': f"File for {vis_name} not found"})


@app.route("/upload_tasks")
def upload_tasks():
    database_name = "user_traces"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    folder = "static/files/user_traces/task_division"
    collection_name = "task_division"

    # Connect to the MongoDB collection
    db = mongo.db[collection_name]

    # Iterate through files in the folder
    for filename in os.listdir(folder):
        if filename.endswith(".json"):
            file_path = os.path.join(folder, filename)
            
            # Read the JSON data from the file
            with open(file_path, 'r') as file:
                data = json.load(file)
            
            # Insert the data into the MongoDB collection
            db.insert_one(data)
            
    return "Traces uploaded!"

   

@app.route("/get_user_tasks")
def get_user_tasks():
    # Database configuration
    database_name = "visualizations"
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    # Collection name
    collection_name = "task_division"

    # Retrieve data from the MongoDB collection
    tasks = mongo.db[collection_name].find()

    # Convert ObjectId to string and convert the cursor to a list of dictionaries
    tasks_list = [{**task, '_id': str(task['_id'])} for task in tasks]

    # Convert data to JSON
    response_data = jsonify(tasks_list)

    # Set Cache-Control header to enable browser caching for 1 hour (3600 seconds)
    response = make_response(response_data)
    response.headers["Cache-Control"] = "max-age=3600"

    return response


""" # Nuova funzione per ottenere la conformità delle tracce utente rispetto alle tracce d'oro
@app.route("/get_user_trace_conformity")
def get_user_trace_conformity():
    # Database configuration
    database_name = "visualizations"
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    # Collection name
    collection_name = "task_division"

    # Load golden traces from local files
    golden_traces_dir = "static/files/user_traces/golden_traces"
    golden_traces = {}
    for i in range(5):
        file_path = os.path.join(golden_traces_dir, f"task_{i}.json")
        with open(file_path, "r") as golden_file:
            golden_traces[f"{i}"] = json.load(golden_file)

    # Retrieve user traces data from the MongoDB collection
    user_traces_cursor = mongo.db[collection_name].find()

    # Convert user traces ObjectId to string and cursor to a list of dictionaries
    user_traces_list = [{**trace, '_id': str(trace['_id'])} for trace in user_traces_cursor]

    # Convert data to JSON
    response_data = {}

    for user_trace in user_traces_list:
        user_trace_id = user_trace['_id']

        # Assuming the array structure directly represents user trace parts
        user_trace_parts = user_trace

        # Calculate conformance for each golden trace
        conformity_info = {}
        for golden_trace_id, golden_trace_data in golden_traces.items():
            # Consider only the part of the user trace corresponding to the current golden trace
            user_trace_part = user_trace_parts.get(golden_trace_id, [])  # Use an empty list if key not present

            # Create XES log for user trace part
            user_xes_log = pm4py.new_log()
            user_trace_event = pm4py.new_trace()
            for event_name in user_trace_part:
                user_trace_event.append(pm4py.new_event(attributes={"concept:name": event_name}))
            user_xes_log.append(user_trace_event)

            # Create XES log for golden trace
            golden_xes_log = pm4py.new_log()
            golden_trace_event = pm4py.new_trace()
            for event_name in golden_trace_data:
                golden_trace_event.append(pm4py.new_event(attributes={"concept:name": event_name}))
            golden_xes_log.append(golden_trace_event)

            # Discover Petri net for the golden trace
            golden_net, golden_initial_marking, golden_final_marking = pm4py.discover_petri_net_inductive(golden_xes_log)

            # Align user trace with the golden trace Petri net
            aligned_traces = pm4py.conformance_diagnostics_alignments(user_xes_log, golden_net, golden_initial_marking, golden_final_marking)

            # Calculate conformance information (you may adjust this based on your needs)
            conformity_info[golden_trace_id] = {
                "alignment_info": aligned_traces
                # Add more information as needed
            }

        response_data[user_trace_id] = {"conformity_info": conformity_info}

    # Return the response
    return jsonify(response_data) """


@app.route("/perform_trace_alignment")
def perform_trace_alignment():
    log_folder = "static/files/user_traces/task_division/csv_outputs/xesFiles/"
    output_folder = "static/files/user_traces/trace_alignment"

    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for i in range(1, 51):
        log_filename = "golden_trace_formatted_event_log.xes"
        simulated_log_filename = f"output_{i}_event_log.xes"

        log_path = os.path.join(log_folder, log_filename)
        simulated_log_path = os.path.join(log_folder, simulated_log_filename)

        log = pm4py.read_xes(log_path)
        simulated_log = pm4py.read_xes(simulated_log_path)
        alignments = logs_alignments.apply(log, simulated_log)
        net, im, fm = pm4py.discover_petri_net_inductive(log)

        # Convert alignments to a Python data structure
        alignments_data = [
            {"alignment": [(str(key), str(value)) for key, value in alignment.items()],
             "cost": alignment["cost"],
             "fitness": alignment["fitness"],
             "bwc": alignment["bwc"]} for alignment in alignments]

        # Save alignments in JSON format
        alignment_result_path = os.path.join(output_folder, f"alignment_result_{i}.json")
        with open(alignment_result_path, "w") as file:
            json.dump(alignments_data, file, indent=2)

        # Print to console
        print(f"Alignment result for output_{i}: {alignments_data}")

    return jsonify(message="Alignment process completed for all files.")


@app.route("/get_trace_alignment")
def get_trace_alignment():
    input_folder = "static/files/user_traces/trace_alignment"
    fitness_values = {}

    for file_number in range(1, 51):
        file_name = f"alignment_result_{file_number}.json"
        file_path = os.path.join(input_folder, file_name)

        with open(file_path, 'r') as file:
            data = json.load(file)

            # ABS (change if needed.)
            fitness_values[file_name] = [abs(entry['fitness']) for entry in data[:5]]  

    # Restituisci la risposta JSON
    return json.dumps(fitness_values)



@app.route("/upload_statechart") #Function that uploads all the statecharts
def upload_statechart():
    
    
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    


    svg_folder = "static/files/statechartGV"
    visualization_names = ["radviz", "crosswidget", "crumbs", "datavis", "idmvis", "influence_map", "ivan", "nemesis", "summit", "wasp", "falcon"]
    collection_name = "graphviz" 

    try:
        for vis_name in visualization_names:
            svg_path = os.path.join(svg_folder, f"{vis_name}.gv")

            # Verifying if the state chart was already added to the db
            existing_document = mongo.db[collection_name].find_one({"name": vis_name})

            if existing_document:
                print(f"{vis_name} is already in the database. Skipping...")
            else:
                with open(svg_path, "r") as file:
                    svg_data = file.read()

                # Inserisci il documento nella collezione
                documento = {"name": vis_name, "svg": svg_data}
                mongo.db[collection_name].insert_one(documento)
                print(f"{vis_name} inserted into the database.")

        print("Process complete!")

    except Exception as e:
        print(f"Error: {e}")

    #Simple query test
    
    target_vis = "radviz" #Change as you like
    
    try:

        statechart = mongo.db.state_charts.find_one({"name": target_vis})
        
        if statechart:
            print(statechart)

        else:
            print("Nothing found!")
        
    except Exception as e:
        print(f"Error: {e}")

    return "Statecharts correctly uploaded!"




@app.route("/upload_statechart_comparison")
def upload_statechart_comparison():
    
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    svg_folder = "static/files/statechart_comparison"
    collection_name = "state_chart_comparison" 

    try:
        # Iterate over files in the folder
        for filename in os.listdir(svg_folder):
            if filename.endswith(".svg"):  # Ensure it's an SVG file
                print("wewwe")

                svg_path = os.path.join(svg_folder, f"{filename}")
                with open(svg_path, "r") as file:
                    svg_data = file.read()

                # Inserisci il documento nella collezione
                documento = {"name": filename, "svg": svg_data}
                mongo.db[collection_name].insert_one(documento)
                print(f"{filename} inserted into the database.")

        print("Process complete!")

    except Exception as e:
        print(f"Error: {e}")
        return f"Error occurred: {e}"

    return "Statecharts correctly uploaded!"


@app.route("/get_statechart_comparison")
def get_statechart_comparison():
    
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    collection_name = "state_chart_comparison" 

    try:
        # Query all documents from the collection
        documents = mongo.db[collection_name].find()

        # Prepare a list to store file data
        files_data = []

        # Iterate over the documents
        for document in documents:
            filename = document["name"]
            svg_data = document["svg"]
            
            # Append file data to the list
            files_data.append({"filename": filename, "svg": svg_data})

        print("Process complete!")

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": f"Error occurred: {e}"}), 500

    return jsonify({"files": files_data})


#Function to upload the user traces we already had from Falcon Crossfilter
@app.route("/upload_user_traces")
def upload_user_traces():
    database_name = "user_traces"  
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    folder = "static/files/user_traces/user_traces_falcon_with_time" #Change folder to change which user traces to upload
    collection_name = "time" 

    try:
        # List all files in the specified folder
        all_files = os.listdir(folder)

        for file_name in all_files:
            svg_path = os.path.join(folder, file_name)

            # Verifying if the file was already added to the db
            existing_document = mongo.db[collection_name].find_one({"name": file_name})

            if existing_document:
                print(f"{file_name} is already in the database. Skipping...")
            else:
                with open(svg_path, "r") as file:
                    user_trace_data = file.read()

                # Insert the document into the collection
                document = {"name": file_name, "user_trace": user_trace_data}
                mongo.db[collection_name].insert_one(document)
                print(f"{file_name} inserted into the database.")

        print("Process complete!")

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

    return "User traces correctly uploaded!"


#Upload formatted violations

@app.route("/upload_violations_formatted")
def upload_violations_formatted():
    try:
        database_name = "user_traces"  
        mongo_uri = config['DATABASES'][database_name]
        app.config["MONGO_URI"] = mongo_uri
        mongo = PyMongo(app)

        folder = "static/files/user_traces/formatted_violations" #Change folder to change which user traces to upload
        collection_name = "formatted_violations" 

        # List all files in the specified folder
        all_files = os.listdir(folder)

        for file_name in all_files:
            path = os.path.join(folder, file_name)

            # Verifying if the file was already added to the db
            existing_document = mongo.db[collection_name].find_one({"name": file_name})

            if existing_document:
                print(f"{file_name} is already in the database. Skipping...")
            else:
                with open(path, "r") as file:
                    user_trace_data = file.read()

                # Using regex to extract the number after "7M_"
                match = re.search(r"7M_(\d+)", file_name)

                if match:
                    # Extracting the matched number
                    number = match.group(1)

                    # Insert the document into the collection
                    document = {"name": file_name, "number": number, "violations": user_trace_data}
                    mongo.db[collection_name].insert_one(document)
                    print(f"{file_name} inserted into the database with number {number}.")
                else:
                    print(f"No number found in {file_name}. Skipping insertion.")

        print("Process complete!")

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

    return "Formatted violations correctly uploaded!"


# Function to download the user_traces with caching
@app.route("/get_violations_formatted")
@cache.cached(timeout=300) 
def get_violations_formatted():
    try:
        database_name = "user_traces"  
        mongo_uri = config['DATABASES'][database_name]
        app.config["MONGO_URI"] = mongo_uri
        mongo = PyMongo(app)

        collection_name = "formatted_violations" 

        # Recupera tutti i documenti dalla collezione
        all_documents = mongo.db[collection_name].find()

        # Lista per memorizzare i dati dei file
        files_data = []

        # Itera su tutti i documenti e aggiungili alla lista
        for document in all_documents:
            files_data.append({
                "name": document["name"],
                "number": document["number"],
                "violations": document["violations"]
            })

        return files_data

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# Function to download the user_traces with caching
@app.route("/get_user_traces")
@cache.cached(timeout=300)  # Cache timeout set to 300 seconds (adjust as needed)
def get_user_traces():
    database_name = "user_traces"  
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)
    collection_name = "falcon"

    try:
        # Fetch all documents from the collection and convert cursor to a list
        user_traces_data = list(mongo.db[collection_name].find({}, {"_id": 0}))

        # Remove newline characters and extra spaces from each document
        cleaned_data = [
            {k: re.sub(r'\s+', ' ', v.strip().replace("\n", "").replace("\\", "")) if isinstance(v, str) else v
             for k, v in doc.items()}
            for doc in user_traces_data
        ]

        # Return the cleaned data as JSON response
        print(cleaned_data)
        print("----")
        print(jsonify(cleaned_data))
        return jsonify(cleaned_data)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# Function to download the violations for user traces with caching
@app.route("/get_violations")
@cache.cached(timeout=300)  # Cache timeout set to 300 seconds (adjust as needed)
def get_violations():
    database_name = "user_traces"  
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)
    collection_name = "violations"

    try:
        # Fetch all documents from the collection and convert cursor to a list
        user_traces_data = list(mongo.db[collection_name].find({}, {"_id": 0}))

        # Remove newline characters and extra spaces from each document
        cleaned_data = [
            {k: re.sub(r'\s+', ' ', v.strip().replace("\n", "").replace("\\", "")) if isinstance(v, str) else v
             for k, v in doc.items()}
            for doc in user_traces_data
        ]

        # Return the cleaned data as JSON response
        # print(cleaned_data)
        # print("----")
        # print(jsonify(cleaned_data))
        return jsonify(cleaned_data)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# Function to download the user_traces with caching
@app.route("/get_userTraceTime")
@cache.cached(timeout=300)  # Cache timeout set to 300 seconds (adjust as needed)
def get_userTraceTime():
    database_name = "user_traces"  
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)
    collection_name = "time"

    try:
        # Fetch all documents from the collection and convert cursor to a list
        user_traces_data = list(mongo.db[collection_name].find({}, {"_id": 0}))

        # Remove newline characters and extra spaces from each document
        cleaned_data = [
            {k: re.sub(r'\s+', ' ', v.strip().replace("\n", "").replace("\\", "")) if isinstance(v, str) else v
             for k, v in doc.items()}
            for doc in user_traces_data
        ]

        # Return the cleaned data as JSON response
        # print(cleaned_data)
        # print("----")
        # print(jsonify(cleaned_data))
        return jsonify(cleaned_data)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

'''
if __name__ == "__main__":
    app.run(debug=True)
'''

@app.route("/get_statecharts")
def get_statecharts():
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    statecharts_data = []

    try:
        # Gets all docs from collection
        statecharts = mongo.db.state_charts.find()

        for statechart in statecharts:
            name = statechart["name"]
            svg_data = statechart["svg"]

            statechart_info = {
                "name": name,
                "svg": svg_data
            }  

            #print(statechart_info)

            statecharts_data.append(statechart_info)

        print("Statecharts data collected successfully!")
        
       
    except Exception as e:
        print(f"Error: {e}")
        

    # Convert data to JSON
    response_data = jsonify(statecharts_data)

    # Set Cache-Control header to enable browser caching for 1 hour (3600 seconds)
    response = make_response(response_data)
    response.headers["Cache-Control"] = "max-age=3600"

    return response

#Get statecharts in graphviz format
@app.route("/get_statecharts_gv")
def get_statecharts_gv():
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)
    collection_name = "graphviz"

    statecharts_data = []

    try:
        # Gets all docs from collection
        statecharts = mongo.db[collection_name].find()

        for statechart in statecharts:
            name = statechart["name"]
            svg_data = statechart["svg"]

            statechart_info = {
                "name": name,
                "svg": graph_layout(name)
            }  

          
            
            statecharts_data.append(statechart_info)
    

            #print(statechart_info["svg"])

        print("Statecharts data collected successfully!")

        #Graph Layout

            

    except Exception as e:
        print(f"Error: {e}")
        

    # Convert data to JSON
    response_data = jsonify(statecharts_data)

    # Set Cache-Control header to enable browser caching for 1 hour (3600 seconds)
    response = make_response(response_data)
    response.headers["Cache-Control"] = "max-age=3600"

    return response



# TODO MATTEO
# Call the functions to create the statechart.
# In order to do so, we take in POST the url of the vis so that we can 
# write it in the 'system_url.txt' file beforehand.
@app.route("/create_statechart_files", methods=['POST'])
def create_statechart_files():
    # We write the current vis URL (inputted via POST) in the 'system_url.txt' file.
    request_data = request.get_json()
    system_url = request_data.get('newUrl')
    system_url_file = open("./static/js/material/system_url.txt", "w")
    system_url_file.write(system_url)
    system_url_file.close()

    # We call the generalization function via Node JS.
    subprocess.call("node ./static/js/generalization.js", shell=True)

    # DA TENERE?
    # We call the first validation function via Python.
    #configFunction()

    # DA TENERE?
    # We call the second validation function via a Python subprocess.
    #subprocess.run(['python3', 'PathsSimulator.py'])
    #pathsSimulatorContainer([])

    database_name = "visualizations"
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    # The graphviz file is saved in the db.
    mongo = PyMongo(app)
    collection_name = "graphviz"
    
    gv_folder = "static/files/statechartGV"
    gv_path = os.path.join(gv_folder, f"statechart_graphviz.gv")

    # Verifying if the state chart was already added to the db
    existing_document = mongo.db[collection_name].find_one({"name": system_url})

    if existing_document:
        print(f"{system_url} is already in the database. Skipping...")
    else:
        with open(gv_path, "r") as file:
            gv_data = file.read()

        documento = {"name": system_url, "svg": gv_data}
        mongo.db[collection_name].insert_one(documento)
        print(f"{system_url} inserted into the database.")

    #gv_folder = "static/files/statechartGV"
    gv_path = os.path.join(gv_folder, "statechart_graphviz.gv")
    generate_svg(gv_path)
    modifySvg()

    # Verifying if the state chart was already added to the db
    collection_name = "state_charts"
    existing_document = mongo.db[collection_name].find_one({"name": system_url})

    if existing_document:
        print(f"{system_url} is already in the database. Skipping...")
    else:
        with open("./output.svg", "r") as file:
            gv_data = file.read()

        documento = {"name": system_url, "svg": gv_data}
        mongo.db[collection_name].insert_one(documento)
        print(f"{system_url} inserted into the database.")

    # Verifying if the state chart was already added to the db
    collection_name = "replay_json"
    existing_document = mongo.db[collection_name].find_one({"name": system_url})

    if existing_document:
        print(f"{system_url} is already in the database. Skipping...")
    else:
        with open("./output.json", "r") as file:
            gv_data = file.read()

        documento = {"name": system_url, "json": gv_data}
        mongo.db[collection_name].insert_one(documento)
        print(f"{system_url} inserted into the database.")

    return "finished statechart files creation"



import time

# The route to start the replay.
@app.route("/replay", methods=['POST'])
def replay_user_trace():
    request_data = request.get_json()
    current_trace = request_data.get('current_trace')
    current_name = request_data.get('name')

    try:
        # Add a sleep of 10 seconds
        

        current_trace_file = open("./static/files/user_traces/current_trace.json", "w")
        current_trace_file.write(current_trace)
        current_trace_file.close()

        # Take replay json from db.
        database_name = "visualizations"  # You can change db name here
        mongo_uri = config['DATABASES'][database_name]
        app.config["MONGO_URI"] = mongo_uri
        mongo = PyMongo(app)
        collection_name = "replay_json"
        replayJsons = mongo.db[collection_name].find_one({ "name": current_name })
        replayJsonified = json.loads(replayJsons['replay'])

        #result = subprocess.run(['py', 'PathsSimulator.py'])
        pathsSimulatorContainer(current_trace, replayJsonified)
        output = "Simulation finished"
    except subprocess.CalledProcessError as e:
        # Handle any errors during execution
        output = f'Error during the execution of the external program: {e.stderr}'
    
    return output




# The route to change the replay state.
@app.route("/change_replay_state", methods=['POST'])
def change_replay_state():
    request_data = request.get_json()
    newState = request_data.get('new_state')
    try:
        PathSimulator_changeReplayState(newState)
        output = "change_replay_state - OK"
    except Exception as e:
        output = "change_replay_state - KO"
    return output

@app.route("/")
def home():
    return render_template('index.html')

@app.route("/home")
def index():
    return render_template('index.html')

@app.route("/userTraces")
def userTraces():
    return render_template('userTraces.html')

@app.route("/userTasks")
def userTasks():
    return render_template('userTasks.html')
    
@app.route("/versionHistory")
def versionHistory():
    return render_template('versionHistory.html')




if __name__ == "__main__":
    app.run(debug=True)
