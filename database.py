import sqlite3
import json
import hashlib
import os
from datetime import datetime

DB_PATH = "genre_sense.db"

class Database:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        
        # Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                default_genre TEXT,
                profile_pic TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Analysis History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                image_name TEXT,
                top_genre TEXT,
                confidence REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                full_result_json TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        
        self.conn.commit()

    # -----------------------------
    # User Methods
    # -----------------------------
    def create_user(self, username, email, password, default_genre="entertainment"):
        cursor = self.conn.cursor()
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        try:
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, default_genre)
                VALUES (?, ?, ?, ?)
            """, (username, email, password_hash, default_genre))
            self.conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

    def temp_login(self, username, password):
        # NOTE: In a real app, use JWT. For this scope, returning ID is simple.
        cursor = self.conn.cursor()
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute("""
            SELECT id, username, email, default_genre FROM users 
            WHERE username = ? AND password_hash = ?
        """, (username, password_hash))
        row = cursor.fetchone()
        return dict(row) if row else None

    # -----------------------------
    # History Methods
    # -----------------------------
    def save_analysis(self, user_id, image_name, result):
        cursor = self.conn.cursor()
        top_genre = result.get("top_genre", "unknown")
        confidence = result.get("confidence", 0.0)
        full_json = json.dumps(result)
        
        cursor.execute("""
            INSERT INTO analysis_history (user_id, image_name, top_genre, confidence, full_result_json)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, image_name, top_genre, confidence, full_json))
        self.conn.commit()

    def get_user_history(self, user_id):
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM analysis_history WHERE user_id = ? ORDER BY id DESC
        """, (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_stats(self, user_id):
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT top_genre, COUNT(*) as count 
            FROM analysis_history 
            WHERE user_id = ? 
            GROUP BY top_genre
        """, (user_id,))
        return {row['top_genre']: row['count'] for row in cursor.fetchall()}

db = Database()
