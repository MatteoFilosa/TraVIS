from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from configparser import ConfigParser
import os

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

@app.route("/get_statecharts") #Gets all the statecharts from DB
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

    # Return JSON response
    return jsonify(statecharts_data)


if __name__ == "__main__":
    app.run(debug=True)
