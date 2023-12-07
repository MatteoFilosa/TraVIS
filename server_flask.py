from flask import Flask, render_template
import os


app = Flask(__name__,
            static_url_path='', 
            static_folder='static',
            template_folder='templates')



@app.route("/")
def home():
    return render_template('index.html') #change this do 'design.html' in order to design a new questionnaire.


if __name__ == '__main__':
    app.run(debug=True)
