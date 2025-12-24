from django.http import JsonResponse
from .pool_setup import pool
try:
    import oracledb
except ImportError:
    oracledb = None
import logging
from .mock_data import generate_mock_data
from functools import reduce

logger = logging.getLogger(__name__)


def get_analyse_data(request):
    temp = request.GET.get('temp', '')
    clie = request.GET.get('clie', '')
    emp = request.GET.get('emp', '')
    prod = request.GET.get('prod', '')
    
    # New parameter for general search
    search = request.GET.get('search', '').lower()
    
    # New parameter for aggregation
    group_by = request.GET.get('group_by', '')

    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = max(1, int(request.GET.get('page_size', 100)))
    except ValueError:
        return JsonResponse({"error": "Page and page_size must be integers"}, status=400)

    page_size = min(page_size, 100)

    start = (page - 1) * page_size
    end = start + page_size

    data = []
    used_mock = False

    if pool and oracledb:
        try:
            with pool.acquire() as connection:
                cursor = connection.cursor()
                out_cursor = cursor.var(oracledb.CURSOR)
                # Pass 'search' as temp or empty if needed, or update stored proc call
                # For now, we use existing signature
                cursor.callproc('ANALYSE', [temp or search, clie, emp, prod, out_cursor])
                rows = out_cursor.getvalue().fetchall()
                colnames = [desc[0] for desc in out_cursor.getvalue().description]
                data = [dict(zip(colnames, row)) for row in rows]
        except Exception as e:
            logger.error("Database error: %s", str(e))
            used_mock = True
    else:
        used_mock = True

    if used_mock:
        data = generate_mock_data()
        
        # Filter by temp/year/month first
        if temp:
             if temp.isdigit():
                 data = [d for d in data if str(d.get('TEMPS_ANNEE')) == temp]
             elif '-' in temp:
                 try:
                     y, m = temp.split('-')
                     data = [d for d in data if str(d.get('TEMPS_ANNEE')) == y and str(d.get('TEMPS_MOIS')) == str(int(m))]
                 except ValueError:
                     pass

        # General search filter across multiple fields
        if search:
            data = [d for d in data if 
                    search in str(d.get('CLIE_NOM', '')).lower() or 
                    search in str(d.get('EMP_NOM', '')).lower() or 
                    search in str(d.get('PROD_NOM', '')).lower() or
                    search in str(d.get('TEMPS_ANNEE', '')).lower()
            ]

        # Specific filters
        if clie:
            data = [d for d in data if clie.lower() in d['CLIE_NOM'].lower()]
        if emp:
            data = [d for d in data if emp.lower() in d['EMP_NOM'].lower()]
        if prod:
            data = [d for d in data if prod.lower() in d['PROD_NOM'].lower()]
    # Aggregation Logic
    if group_by:
        aggregated_data = {}
        for row in data:
            key = ""
            if group_by == 'year':
                key = str(row.get('TEMPS_ANNEE', 'Unknown'))
            elif group_by == 'month':
                 # Combine Year and Month for unique key
                year = row.get('TEMPS_ANNEE', '')
                month = row.get('TEMPS_MOIS', '')
                key = f"{year}-{month:02d}" if year and month else f"{month}"
            elif group_by == 'employee':
                key = row.get('EMP_NOM', 'Unknown')
            elif group_by == 'department':
                key = row.get('EMP_DEPT', 'Unknown')
            elif group_by == 'client':
                key = row.get('CLIE_NOM', 'Unknown')
            
            if key not in aggregated_data:
                aggregated_data[key] = {
                    'key': key,
                    'count': 0,
                    'total_retard': 0,
                    'total_duree_prevue': 0,
                    'total_duree_reelle': 0,
                    # Keep some metadata for display if needed
                    'TEMPS_ANNEE': row.get('TEMPS_ANNEE'),
                    'TEMPS_MOIS': row.get('TEMPS_MOIS'),
                    'EMP_NOM': row.get('EMP_NOM') if group_by == 'employee' else None,
                    'EMP_DEPT': row.get('EMP_DEPT') if group_by == 'department' else None,
                    'CLIE_NOM': row.get('CLIE_NOM') if group_by == 'client' else None,
                }
            
            agg = aggregated_data[key]
            agg['count'] += 1
            agg['total_retard'] += row.get('RETARD', 0)
            agg['total_duree_prevue'] += row.get('DUREE_PREVUE', 0)
            agg['total_duree_reelle'] += row.get('DUREE_REELLE', 0)

        # Convert back to list and calculate averages
        data = []
        for key, agg in aggregated_data.items():
            data.append({
                'label': key, # Generic label for charts
                'count': agg['count'],
                'RETARD': agg['total_retard'], # Sum or Avg? Let's use Sum for "Total Delay" and calculate Avg
                'AVG_RETARD': round(agg['total_retard'] / agg['count'], 2),
                'DUREE_PREVUE': agg['total_duree_prevue'],
                'DUREE_REELLE': agg['total_duree_reelle'],
                # Preserve original keys for compatibility
                'TEMPS_ANNEE': agg['TEMPS_ANNEE'],
                'TEMPS_MOIS': agg['TEMPS_MOIS'],
                'EMP_NOM': agg['EMP_NOM'],
                'EMP_DEPT': agg['EMP_DEPT'],
                'CLIE_NOM': agg['CLIE_NOM'],
            })
        
        # Sort by key (Year/Month usually chronological)
        data.sort(key=lambda x: x['label'])

    total_rows = len(data)
    # If aggregated, we might ignore pagination or paginate the aggregated results
    paginated_data = data[start:end]

    return JsonResponse({
        "data": paginated_data,
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "is_last_page": end >= total_rows,
        "source": "mock" if used_mock else "database",
        "is_aggregated": bool(group_by)
    }, safe=False, json_dumps_params={'ensure_ascii': False})
