from django.http import JsonResponse
from .pool_setup import pool
import oracledb
import logging

logger = logging.getLogger(__name__)


def get_analyse_data(request):
    temp = request.GET.get('temp', '')
    clie = request.GET.get('clie', '')
    emp = request.GET.get('emp', '')
    prod = request.GET.get('prod', '')

    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = max(1, int(request.GET.get('page_size', 100)))
    except ValueError:
        return JsonResponse({"error": "Page and page_size must be integers"}, status=400)

    page_size = min(page_size, 100)

    start = (page - 1) * page_size
    end = start + page_size

    try:
        with pool.acquire() as connection:
            cursor = connection.cursor()
            out_cursor = cursor.var(oracledb.CURSOR)
            cursor.callproc('ANALYSE', [temp, clie, emp, prod, out_cursor])
            rows = out_cursor.getvalue().fetchall()
            colnames = [desc[0] for desc in out_cursor.getvalue().description]

        data = [dict(zip(colnames, row)) for row in rows]
        total_rows = len(data)
        paginated_data = data[start:end]

        return JsonResponse({
            "data": paginated_data,
            "page": page,
            "page_size": page_size,
            "total_rows": total_rows,
            "is_last_page": end >= total_rows
        }, safe=False, json_dumps_params={'ensure_ascii': False})

    except oracledb.DatabaseError as e:
        logger.error("Database error: %s", str(e))
        return JsonResponse({
            'error': 'تعذر الاتصال بقاعدة البيانات أو استعلام خاطئ.',
            'details': str(e)
        }, safe=False, status=500, json_dumps_params={'ensure_ascii': False})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return JsonResponse({
            'error': 'حدث خطأ غير متوقع.',
            'details': str(e)
        }, safe=False, status=500, json_dumps_params={'ensure_ascii': False})
