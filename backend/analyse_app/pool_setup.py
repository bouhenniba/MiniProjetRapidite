try:
    import oracledb
except ImportError:
    oracledb = None


try:
    if oracledb:
        pool = oracledb.create_pool(
            user="rapidite",
            password="123",
            dsn="localhost/FREEPDB1",
            min=2,
            max=5,
            increment=1
        )
    else:
        pool = None
        print("Warning: oracledb module not found. Running in mock mode.")
except Exception as e:
    pool = None
    print(f"Warning: Database connection failed. Running in mock mode. Error: {e}")
