from models import get_db_connection
from config import Config

def update_constraint():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            try:
                print("Updating constraint...")
                cur.execute("ALTER TABLE social_account DROP CONSTRAINT social_account_type_social_check")
                cur.execute("ALTER TABLE social_account ADD CONSTRAINT social_account_type_social_check CHECK (type_social IN ('line','facebook','email','google'))")
                conn.commit()
                print("Constraint updated successfully!")
            except Exception as e:
                print(f"Error: {e}")
                conn.rollback()

if __name__ == "__main__":
    update_constraint()
