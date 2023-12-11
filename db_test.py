from flask import Flask, render_template
from flask_pymongo import PyMongo
from configparser import ConfigParser

app = Flask(__name__)

# Leggi il file di configurazione
config = ConfigParser()
config.read('config.ini')



@app.route("/")
def home_page():

    # Ottieni l'URI dal file di configurazione in base al database desiderato
    database_name = "sample_airbnb"  # Puoi cambiare il nome del database qui
    mongo_uri = config['DATABASES'][database_name]

    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)

    target_id = "10006546"
    
    try:
        # Prova ad accedere alla collezione e fare la query
        listings_and_reviews = mongo.db.listingsAndReviews.find_one({"_id": target_id})
        
        if listings_and_reviews:
            print(listings_and_reviews)
        
    except Exception as e:
        print(f"Error: {e}")

    mydict = { "name": "John", "address": "Highway 37" }

    return render_template("index.html")


@app.route("/database_test")
def database_test():
    # Ottieni l'URI dal file di configurazione in base al database desiderato
    database_name = "user_traces_test"  # Puoi cambiare il nome del database qui
    mongo_uri = config['DATABASES'][database_name]

    app.config["MONGO_URI"] = mongo_uri
    mongo = PyMongo(app)
    

    user_trace = { "xpath": "/html[1]/body[1]/div[2]/div[6]/canvas[1]", "interaction": "mousemove", "coordinates" : "347, 30" }
  
    try:
        # Inserisci il dizionario nel database
        mongo.db.user_traces.insert_one(user_trace)
        print("Data inserted successfully")
    except Exception as e:
        print(f"Error inserting data: {e}")
        
    return render_template("index.html")
    

if __name__ == "__main__":
    app.run(debug=True)
