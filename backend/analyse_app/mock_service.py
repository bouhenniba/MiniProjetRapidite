
import random
from datetime import datetime
from collections import defaultdict

class MockOLAPService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MockOLAPService, cls).__new__(cls)
            cls._instance._generate_base_data()
        return cls._instance
    
    def _generate_base_data(self):
        """
        Generates a static detailed dataset (Fact Table) at the lowest granularity:
        - Date (Day)
        - Employee
        - Product
        - Client
        """
        self.base_data = []
        
        years = [2023, 2024]
        months = range(1, 13)
        
        clients = [
            {'id': 'C1', 'name': 'TechCorp', 'country': 'USA', 'region': 'North'},
            {'id': 'C2', 'name': 'BizSol', 'country': 'USA', 'region': 'South'},
            {'id': 'C3', 'name': 'EduInst', 'country': 'UK', 'region': 'Europe'},
            {'id': 'C4', 'name': 'GovSys', 'country': 'France', 'region': 'Europe'},
            {'id': 'C5', 'name': 'RetailCo', 'country': 'Germany', 'region': 'Europe'},
        ]
        
        employees = [
            {'id': 'E1', 'name': 'John Doe', 'dept': 'Sales'},
            {'id': 'E2', 'name': 'Jane Smith', 'dept': 'Sales'},
            {'id': 'E3', 'name': 'Bob Johnson', 'dept': 'Marketing'},
            {'id': 'E4', 'name': 'Alice Brown', 'dept': 'Support'},
            {'id': 'E5', 'name': 'Charlie Davis', 'dept': 'Operations'},
        ]
        
        products = [
            {'id': 'P1', 'name': 'Laptop X', 'category': 'Electronics', 'supplier': 'Dell'},
            {'id': 'P2', 'name': 'Monitor Y', 'category': 'Electronics', 'supplier': 'Samsung'},
            {'id': 'P3', 'name': 'Desk Chair', 'category': 'Furniture', 'supplier': 'IKEA'},
            {'id': 'P4', 'name': 'Office Table', 'category': 'Furniture', 'supplier': 'Herman Miller'},
            {'id': 'P5', 'name': 'ERP License', 'category': 'Software', 'supplier': 'Oracle'},
        ]
        
        # Generate ~2000 records
        for _ in range(2000):
            year = random.choice(years)
            month = random.choice(months)
            day = random.randint(1, 28)
            date_obj = datetime(year, month, day)
            
            # Quarters
            quarter = (month - 1) // 3 + 1
            season = ['Winter', 'Spring', 'Summer', 'Fall'][(month % 12 + 3) // 3 - 1] # Simplified season logic
            
            client = random.choice(clients)
            emp = random.choice(employees)
            prod = random.choice(products)
            
            # Metrics
            nb_cmd = random.randint(1, 5)
            # Logic: Sales/Marketing have fewer delays than Operations
            base_delay = random.uniform(0, 5) if emp['dept'] in ['Sales', 'Marketing'] else random.uniform(2, 10)
            avg_delay = round(base_delay + random.normalvariate(0, 1), 2)
            if avg_delay < 0: avg_delay = 0
            
            total_delay = avg_delay * nb_cmd
            
            planned = random.uniform(5, 15)
            real = planned + avg_delay
            
            self.base_data.append({
                # Dimensions
                'date_id': date_obj,
                'year': str(year),
                'month': date_obj.strftime('%b'),
                'trimestre': f"{year}-Q{quarter}",
                'saison': season,
                'jour': str(day),
                
                'client': client['name'],
                'pays': client['country'],
                'region': client['region'],
                
                'employe': emp['name'],
                'departement': emp['dept'],
                
                'produit': prod['name'],
                'categorie': prod['category'],
                'fournisseur': prod['supplier'],
                
                # Measures
                'nombre_commandes': nb_cmd,
                'total_retard': total_delay,
                'moyenne_retard': avg_delay, # This is per record, will need weighted avg on aggregate
                'min_retard': max(0, avg_delay - 1),
                'max_retard': avg_delay + 2,
                'moy_prevue': planned,
                'moy_reelle': real,
                'ecart_moyen': real - planned
            })
            
    def query(self, temp_level, clie_level, emp_level, prod_level, filters):
        """
        Aggregates the base data based on requested levels.
        """
        filtered_data = self._apply_filters(self.base_data, filters)
        
        # Determine Group By Keys
        group_keys = []
        
        # Time Dimension Hierarchy
        if temp_level == 'year':
            group_keys.append('year')
        elif temp_level == 'year+saison':
            group_keys.extend(['year', 'saison'])
        elif temp_level == 'year+month':
            group_keys.extend(['year', 'month']) # Simplification: Unique month needs year
        # 'ALL' means no grouping by this dim
        
        # Client Hierarchy
        if clie_level == 'pays':
            group_keys.append('pays')
        elif clie_level == 'pays+client':
            group_keys.extend(['pays', 'client'])
            
        # Employee Hierarchy
        if emp_level == 'DEPARTEMENT':
            group_keys.append('departement')
        elif emp_level == 'DEPARTEMENT+EMPLOYE':
            group_keys.extend(['departement', 'employe'])
        elif emp_level == 'EMPLOYE': # Direct access
            group_keys.append('employe')
            
        # Product Hierarchy
        if prod_level == 'categorie':
            group_keys.append('categorie')
        elif prod_level == 'categorie+produit':
            group_keys.extend(['categorie', 'produit'])
        elif prod_level == 'fournisseur':
            group_keys.append('fournisseur')
        elif prod_level == 'fournisseur+produit':
            group_keys.extend(['fournisseur', 'produit'])
        elif prod_level == 'categorie+produit+fournisseur':
             group_keys.extend(['categorie', 'produit', 'fournisseur'])

        if not group_keys:
            # Grand Total (ALL, ALL, ALL, ALL)
            return [self._aggregate_records(filtered_data, {})]
            
        # Grouping
        grouped = defaultdict(list)
        for row in filtered_data:
            key = tuple(row[k] for k in group_keys)
            grouped[key].append(row)
            
        # Aggregation
        results = []
        for key, rows in grouped.items():
            dim_dict = {k: v for k, v in zip(group_keys, key)}
            results.append(self._aggregate_records(rows, dim_dict))
            
        return results

    def _apply_filters(self, data, filters):
        if not filters:
            return data
        
        res = []
        for row in data:
            match = True
            for k, v in filters.items():
                k_lower = k.lower()
                # Try to match any key in row that resembles the filter key
                actual_val = row.get(k_lower)
                # Exact match string for simplicity in mock
                if str(actual_val) != str(v):
                    match = False
                    break
            if match:
                res.append(row)
        return res

    def _aggregate_records(self, rows, dim_Info):
        if not rows:
            return {}
            
        count = len(rows)
        sum_cmd = sum(r['nombre_commandes'] for r in rows)
        sum_total_retard = sum(r['total_retard'] for r in rows)
        
        # Weighted averages where appropriate
        # avg_delay = total_delay / total_commands (if we treat total_retard as sum of delays)
        # OR simple average of the rows if that's the business logic. 
        # Typically "Average Delay" = Sum(DelayDays) / Sum(AppointedTasks) or similar.
        # Here we have 'nombre_commandes' so let's say total_retard is the sum of delays.
        
        avg_retard = sum_total_retard / sum_cmd if sum_cmd > 0 else 0
        
        sum_prevue = sum(r['moy_prevue'] * r['nombre_commandes'] for r in rows)
        avg_prevue = sum_prevue / sum_cmd if sum_cmd > 0 else 0
        
        sum_reelle = sum(r['moy_reelle'] * r['nombre_commandes'] for r in rows)
        avg_reelle = sum_reelle / sum_cmd if sum_cmd > 0 else 0
        
        return {
            **dim_Info,
            'nombre_commandes': sum_cmd,
            'total_retard': round(sum_total_retard, 2),
            'moyenne_retard': round(avg_retard, 2),
            'min_retard': min(r['min_retard'] for r in rows),
            'max_retard': max(r['max_retard'] for r in rows),
            'moy_prevue': round(avg_prevue, 2),
            'moy_reelle': round(avg_reelle, 2),
            'ecart_moyen': round(avg_reelle - avg_prevue, 2)
        }
