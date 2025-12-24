import random
from datetime import datetime

def generate_mock_data():
    """
    Generates realistic mock data for the analysis dashboard.
    Returns a list of dictionaries.
    """
    clients = [
        {"nom": "Entreprise A", "ville": "Paris"},
        {"nom": "TechCorp", "ville": "Lyon"},
        {"nom": "Innovate Ltd", "ville": "Marseille"},
        {"nom": "Global Solutions", "ville": "Lille"},
        {"nom": "Alpha Industries", "ville": "Bordeaux"}
    ]
    
    employees = [
        {"nom": "Alice Martin", "dept": "Sales"},
        {"nom": "Bob Dupont", "dept": "Logistics"},
        {"nom": "Charlie Durand", "dept": "IT"},
        {"nom": "Diana Leroy", "dept": "Sales"},
        {"nom": "Eve Moreau", "dept": "Logistics"}
    ]
    
    products = [
        {"nom": "Server Rack X1", "cat": "Hardware"},
        {"nom": "Cloud License Pro", "cat": "Software"},
        {"nom": "Maintenance Plan", "cat": "Service"},
        {"nom": "Router Y2", "cat": "Hardware"},
        {"nom": "Consulting Hour", "cat": "Service"}
    ]
    
    data = []
    
    # Generate data for 2023 and 2024
    for year in [2023, 2024]:
        for month in range(1, 13):
            # Generate 10-20 records per month
            num_records = random.randint(10, 20)
            for _ in range(num_records):
                client = random.choice(clients)
                employee = random.choice(employees)
                product = random.choice(products)
                
                duree_prevue = random.randint(1, 10)
                # Introduce some variance for real duration
                variance = random.randint(-2, 5) 
                duree_reelle = max(1, duree_prevue + variance)
                retard = max(0, duree_reelle - duree_prevue)
                
                record = {
                    "TEMPS_MOIS": month,
                    "TEMPS_ANNEE": year,
                    "CLIE_NOM": client["nom"],
                    "CLIE_VILLE": client["ville"],
                    "EMP_NOM": employee["nom"],
                    "EMP_DEPT": employee["dept"],
                    "PROD_NOM": product["nom"],
                    "PROD_CAT": product["cat"],
                    "DUREE_PREVUE": duree_prevue,
                    "DUREE_REELLE": duree_reelle,
                    "RETARD": retard
                }
                data.append(record)
                
    return data
