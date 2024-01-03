from flask import Flask, render_template, jsonify, make_response
from flask_cors import CORS
from flask_pymongo import PyMongo
from configparser import ConfigParser
import os, re

app = Flask(__name__,
            static_url_path='', 
            static_folder='static',
            template_folder='templates')

CORS(app)

config = ConfigParser()
config.read('config.ini')


@app.route("/")
def home():
    return render_template('index.html')

@app.route("/userTraces")
def userTraces():
    return render_template('userTraces.html')

@app.route("/upload_statechart") #Function that uploads all the statecharts
def upload_statechart():
    
    
    database_name = "visualizations"  # You can change db name here
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    


    svg_folder = "static/files/statechartSVGS"
    visualization_names = ["radviz", "crosswidget", "crumbs", "datavis", "idmvis", "influence_map", "ivan", "nemesis", "summit", "wasp"]

    try:
        for vis_name in visualization_names:
            svg_path = os.path.join(svg_folder, f"{vis_name}.svg")

            # Verifying if the state chart was already added to the db
            existing_document = mongo.db.state_charts.find_one({"name": vis_name})

            if existing_document:
                print(f"{vis_name} is already in the database. Skipping...")
            else:
                with open(svg_path, "r") as file:
                    svg_data = file.read()

                # Inserisci il documento nella collezione
                documento = {"name": vis_name, "svg": svg_data}
                mongo.db.state_charts.insert_one(documento)
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


#Function to upload the user traces we already had from Falcon Crossfilter
@app.route("/upload_user_traces")
def upload_user_traces():
    database_name = "user_traces"  
    mongo_uri = config['DATABASES'][database_name]
    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    svg_folder = "static/files/user_traces_falcon"
    collection_name = "falcon"

    try:
        # List all files in the specified folder
        all_files = os.listdir(svg_folder)

        for file_name in all_files:
            svg_path = os.path.join(svg_folder, file_name)

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

#Function to download the user_traces
@app.route("/get_user_traces")
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

if __name__ == "__main__":
    app.run(debug=True)
