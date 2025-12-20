import oracledb


pool = oracledb.create_pool(
    user="rapidite",
    password="123",
    dsn="localhost/FREEPDB1",
    min=2,
    max=5,
    increment=1
)
