import os
import sys

def activate_environment(env_name):
    activate_script = os.path.join(env_name, 'Scripts', 'activate')
    activate_command = f'call {activate_script}' if os.name == 'nt' else f'source {activate_script}'
    
    try:
        os.system(activate_command)
        print(f'Activated virtual environment: {env_name}')

         # Change this to your preferred server file
        flask_app_name = "server_flask"

        os.environ['FLASK_APP'] = flask_app_name
        print(f'Set FLASK_APP to: {flask_app_name}')
        
        # Run 'flask run' command
        run_command = 'flask run'
        os.system(run_command)
    except Exception as e:
        print(f'Error activating virtual environment: {env_name}')
        print(f'Error message: {e}')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python activate_env.py <environment_name>')
        sys.exit(1)

    env_name = sys.argv[1]
    activate_environment(env_name)

