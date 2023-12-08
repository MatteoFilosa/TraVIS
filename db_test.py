from flask import Flask, render_template
from flask_pymongo import PyMongo
from configparser import ConfigParser

app = Flask(__name__)

# Leggi il file di configurazione
config = ConfigParser()
config.read('config.ini')

# Ottieni l'URI dal file di configurazione in base al database desiderato
database_name = "sample_airbnb"  # Puoi cambiare il nome del database qui
mongo_uri = config['DATABASES'][database_name]

app.config["MONGO_URI"] = mongo_uri
mongo = PyMongo(app)

@app.route("/")
def home_page():
    target_id = "10006546"
    
    try:
        # Prova ad accedere alla collezione e fare la query
        listings_and_reviews = mongo.db.listingsAndReviews.find_one({"_id": target_id})
        
        if listings_and_reviews:
            print(listings_and_reviews)
        
    except Exception as e:
        print(f"Error: {e}")

    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
