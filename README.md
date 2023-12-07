Flask folder structure:

In the root folder, there is the server;
In the templates folder you should put all the HTML files;
In static, you put everything else. In fact, there are other subdirectories that are pretty self-explanatory (css, files, js).


Steps to run the server for the first time:

1) Install the requirements running "pip install -r requirements.txt" (If you don't have pip installed, install it)
2) Create a virtual environment by running the command "python -m venv <name_of_the_virtual_environment>" in the terminal
3) Activate the virtual environment by running <name_of_the_virtual_environment>\Scripts\activate 
4) If an error appears in the console telling that the execution of Scripts is not allowed, open a Windows
Powershell terminal in admin mode and enter the command "Set-ExecutionPolicy unrestricted". This will allow the policy of scripts execution in your machine to be unrestricted, so be careful
5) In the terminal, execute the command "set FLASK_APP=server_flask.py" or " $env:FLASK_APP = "server_flask" "
6) In the terminal, execute the command "flask run"

The server should now be running in localhost. Press the key combination "CTRL+C" to interrupt it. If it is not the first time running the server, follow only from point 3) to point 6).

