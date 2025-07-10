# database.py
import sqlite3
import os

def init_db():
    """Initializes the SQLite database and creates the logs table if it doesn't exist."""
    db_path = 'sessions.db'
    
    # Check if the DB file already exists to avoid re-initializing
    if os.path.exists(db_path):
        print("Database already exists.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create a table to log API calls
        cursor.execute('''
            CREATE TABLE session_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                calculator TEXT NOT NULL,
                request_data TEXT,
                result_data TEXT
            )
        ''')
        
        conn.commit()
        print(f"Database '{db_path}' created successfully with 'session_logs' table.")
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    init_db()