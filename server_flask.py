from flask import Flask, render_template
from flask_pymongo import PyMongo
import configparser
import os

app = Flask(__name__,
            static_url_path='', 
            static_folder='static',
            template_folder='templates')

@app.route("/")
def home():
    return render_template('index.html') 

app.config = configparser.ConfigParser()
app.config.read(os.path.abspath("config.ini"))
mongo = PyMongo(app)

def insert_sample_data():
    # Dati di esempio
    sample_data = [
        {"movie_id": 1, "name": "John Doe", "email": "john@example.com", "comment": "Great movie!", "date": "2023-01-01"},
        {"movie_id": 1, "name": "Jane Smith", "email": "jane@example.com", "comment": "I enjoyed it.", "date": "2023-01-02"},
        {"movie_id": 2, "name": "Alice Johnson", "email": "alice@example.com", "comment": "Interesting plot.", "date": "2023-01-03"}
    ]
    for data in sample_data:
        mongo.db.comments.insert_one(data)

if __name__ == "__main__":
    app.config['DEBUG'] = True
    app.config['MONGO_URI'] = app.config['PROD']['DB_URI']
    insert_sample_data()
    app.run(debug=True)
