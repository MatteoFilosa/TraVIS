import pandas as pd
from datetime import datetime, timedelta
import os

def convert_timestamps(input_file, output_file):
    # Leggi il file CSV
    df = pd.read_csv(input_file)

    # Converti i timestamp e crea una nuova colonna 'formatted_timestamp'
    base_timestamp = datetime(2022, 12, 7, 16, 0)  # 20221207T1600
    df['formatted_timestamp'] = (base_timestamp + df['timestamp'].cumsum().apply(lambda x: timedelta(seconds=x))).dt.strftime('%Y%m%dT%H%M')

    # Salva il risultato nel nuovo file CSV
    df.to_csv(output_file, index=False)

# Elabora tutti i file CSV nell'intervallo da 1 a 50
for i in range(1, 51):
    input_file = f"golden_{i}.csv"
    output_file = f"output_{i}_formatted.csv"
    convert_timestamps(input_file, output_file)
    print(f"File {input_file} elaborato con successo. Risultato salvato in {output_file}")
