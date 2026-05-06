import sys
sys.path.insert(0, 'utils')
from supabase_client import supabase
print("Checking users in database...")
try:
    result = supabase.table('users').select("id, email, role").execute()
    if result.data and len(result.data) > 0:
        print(f"\n[OK] Found {len(result.data)} users:")
        for user in result.data:
            print(f"  - {user['email']} ({user['role']})")
    else:
        print("\n[ERROR] No users found in database!")
        print("You need to run: python create_users.py")
except Exception as e:
    print(f"\n[ERROR] Error querying users table: {e}")
    print("\nPossible issues:")
    print("1. Did you run rbac_schema.sql in Supabase SQL Editor?")
    print("2. Did you run: python create_users.py")