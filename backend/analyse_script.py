from django.db import connection
import oracledb

year = 2025
client = 'CLIENT_ABC'
param3 = 'VALUE3'
param4 = 'VALUE4'

with connection.cursor() as cursor:
    # تعريف REF CURSOR
    out_cursor = cursor.var(oracledb.CURSOR)
    
    # تنفيذ البروسيدير مع المعلمات كقائمة بالترتيب
    cursor.execute("""
        BEGIN
            analyse(:1, :2, :3, :4, :5);
        END;
    """, [year, client, param3, param4, out_cursor])
    
    # جلب النتائج
    results = out_cursor.getvalue()

# طباعة النتائج
for row in results:
    print(row)