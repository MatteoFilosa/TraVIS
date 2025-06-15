import json
import os

# Percorsi ai due file JSON da confrontare
file1 = 'index/aggregatedByTypeAndPath_Falcon.json'
file2 = 'no_index/aggregatedByTypeAndPath_Falcon.json'

# Carica i due dataset
with open(file1, 'r', encoding='utf-8') as f:
    d1 = json.load(f)
with open(file2, 'r', encoding='utf-8') as f:
    d2 = json.load(f)

# Prepara la struttura per le differenze
diffs = {}  # { eventType: { path: diff (file1 - file2) } }

# Prendi l'unione di tutti gli eventType
for event_type in set(d1) | set(d2):
    diffs[event_type] = {}
    # unisci tutti i path per questo eventType
    paths = set(d1.get(event_type, {})) | set(d2.get(event_type, {}))
    for path in paths:
        v1 = d1.get(event_type, {}).get(path, 0.0)
        v2 = d2.get(event_type, {}).get(path, 0.0)
        diff = v1 - v2
        diffs[event_type][path] = diff

# Scrivi il risultato
out_file = 'time_differences.json'
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(diffs, f, indent=4)

print(f"Differences written to {out_file}")
