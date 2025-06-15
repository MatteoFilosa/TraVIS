import re
from collections import Counter

def estrai_frequenza_attributi(path_file):
    """
    Legge un file di log SQL, estrae le clausole WHERE e conta la frequenza degli attributi usati.
    Restituisce un Counter con {attributo: frequenza}.
    """
    # Leggi l'intero contenuto del file
    with open(path_file, "r", encoding="utf-8") as f:
        log_text = f.read()
    
    # Estrai tutte le porzioni che iniziano con "WHERE" e finiscono prima di "GROUP BY"
    where_clauses = re.findall(
        r"WHERE\s+(.*?)\s+GROUP BY", log_text, flags=re.IGNORECASE | re.DOTALL
    )
    
    attribute_counter = Counter()
    # Parole chiave SQL da escludere (non attributi)
    sql_keywords = {"BETWEEN", "AND", "OR", "NOT", "ELSE", "END", "CASE", "AS"}

    for clause in where_clauses:
        # Suddividi la clausola WHERE su ogni "AND" per identificare condizioni separate
        conditions = re.split(r"\s+AND\s+", clause, flags=re.IGNORECASE)
        for cond in conditions:
            # Trova tutti i token in maiuscolo (ipotizzando che gli attributi siano scritti in maiuscolo)
            tokens = re.findall(r"\b[A-Z_]+\b", cond)
            for token in tokens:
                # Scarta le parole chiave SQL e i numeri puri
                if token.upper() not in sql_keywords and not token.isdigit():
                    attribute_counter[token] += 1
    
    return attribute_counter

if __name__ == "__main__":
    # Percorso del file di log (modifica se necessario)
    percorso_log = "queries.txt"
    
    frequenze = estrai_frequenza_attributi(percorso_log)
    print("Frequenza degli attributi nelle clausole WHERE:")
    for attr, freq in frequenze.most_common():
        print(f"{attr}: {freq}")
