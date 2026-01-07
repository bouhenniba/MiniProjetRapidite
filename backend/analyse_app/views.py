from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .pool_setup import pool
import json
import logging
from decimal import Decimal

# Configure logger
logger = logging.getLogger(__name__)

try:
    import oracledb
except ImportError:
    oracledb = None

@csrf_exempt
@require_http_methods(["POST", "GET"])
def get_analyse_data(request):
    """
    Enhanced OLAP endpoint - relies entirely on Oracle Procedure
    """
    connection = None
    try:
        # 1. Extract Parameters
        if request.method == 'POST':
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)
        else:
            data = request.GET
        
        temp = data.get('temp', 'ALL')
        clie = data.get('clie', 'ALL')
        emp = data.get('emp', 'ALL')
        prod = data.get('prod', 'ALL')
        filters = data.get('filters', {}) # Specific member filters (Slice)
        
        # 2. Connect to Oracle (Using Pool if available, or error out)
        if not pool:
             return JsonResponse({'success': False, 'error': 'Database connection pool not available'}, status=500)

        connection = pool.acquire()
        cursor = connection.cursor()
        
        # 3. Call ANALYSE Procedure
        if oracledb:
            ref_cursor = cursor.var(oracledb.CURSOR)
        else:
            import cx_Oracle
            ref_cursor = cursor.var(cx_Oracle.CURSOR)

        cursor.callproc('ANALYSE', [temp, clie, emp, prod, ref_cursor])
        
        # 4. Read Results
        result_cursor = ref_cursor.getvalue()
        if not result_cursor:
             return JsonResponse({
                'success': True,
                'data': [],
                'dimensions': {'temp': temp, 'clie': clie, 'emp': emp, 'prod': prod},
                'metadata': {'dimension_count': 0, 'record_count': 0, 'dimension_columns': []}
            })

        # Get column names
        columns = [desc[0].lower() for desc in result_cursor.description]
        rows = result_cursor.fetchall()
        
        # 5. Convert to List of Dictionaries
        data_list = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                if isinstance(value, Decimal):
                    value = float(value)
                row_dict[col] = value
            
            # 5b. Apply Slices (Slicer filtering)
            match = True
            for f_col, f_val in filters.items():
                target_col = f_col.lower()
                if target_col in row_dict:
                    val_in_data = row_dict[target_col]
                    val_to_filter = f_val
                    
                    # Numeric-safe comparison
                    try:
                        # If both can be floats, compare as floats
                        if float(val_in_data) == float(val_to_filter):
                            continue
                        else:
                            match = False
                            break
                    except (ValueError, TypeError):
                        # Fallback to string comparison
                        actual_val = str(val_in_data).strip() if val_in_data is not None else ""
                        required_val = str(val_to_filter).strip()
                        if actual_val != required_val:
                            match = False
                            break
            
            if match:
                data_list.append(row_dict)
        
        # 6. Extract Dimension Columns (all columns that are not measures)
        measure_columns = {
            'nombre_commandes', 'moyenne_retard', 'total_retard',
            'min_retard', 'max_retard', 'moy_prevue',
            'moy_reelle', 'ecart_moyen'
        }
        dimension_columns = [col for col in columns if col not in measure_columns]
        
        # 7. Return JSON
        return JsonResponse({
            'success': True,
            'data': data_list,
            'dimensions': {
                'temp': temp, 'clie': clie, 'emp': emp, 'prod': prod, 'filters': filters
            },
            'metadata': {
                'dimension_count': sum(1 for d in [temp, clie, emp, prod] if d != 'ALL'),
                'record_count': len(data_list),
                'dimension_columns': dimension_columns
            }
        }, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        logger.error(f"Error in get_analyse_data: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if connection:
            pool.release(connection)