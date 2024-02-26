Flask folder structure:

In the root folder, there is the server;
In the templates folder you should put all the HTML files;
In static, you put everything else. In fact, there are other subdirectories that are pretty self-explanatory (css, files, js).


Steps to run the server for the first time:

1) Install the requirements running "pip install -r requirements.txt" (If you don't have pip installed, install it)
2) Create a virtual environment by running the command "python -m venv <name_of_the_virtual_environment>" in the terminal

3) Run the runApp file contained in the main directory to start the app: python runApp.py <name_of_the_virtual_environment>

4) In order to run all the functionalities of the framework, download and install GraphViz: https://graphviz.org/download/source/

How to run the main functionalities of the framework:

1) In the static/files/URLs folder there's the sampleUrls file. Copy a URL from the file and put it in the "Load System" placeholder: the
visualization system will be loaded on the left, the resulting state chart will be loaded on the right (for now, they are precomputed).

2) In the User Traces Tab you can see all user traces captured on the Falcon Visualization system and see other details.


-----REPLAY FEATURE-----

1) 
Install selenium 4.1.3 ----> pip install selenium==4.1.3

Download and put in any folder you like an updated chromedriver https://googlechromelabs.github.io/chrome-for-testing/#stable (Find the list here and download the version relative to your OS)

Add the chromedriver's path to PATH environmental variable

2)
Install node modules:

npm install selenium
npm install is-same-origin
npm install fs
npm install puppeteer




