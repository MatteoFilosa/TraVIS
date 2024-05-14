import os

def remove_outer_brackets_from_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Rimuovi le parentesi quadre esterne
    content = content.strip()[1:-1]

    with open(file_path, 'w') as f:
        f.write(content)

def remove_outer_brackets_for_all_files():
    directory = "./"  # Directory contenente i file JSON
    files = [file for file in os.listdir(directory) if file.endswith('.json')]

    for file in files:
        remove_outer_brackets_from_file(os.path.join(directory, file))

if __name__ == "__main__":
    remove_outer_brackets_for_all_files()
