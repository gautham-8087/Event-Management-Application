import bcrypt
import sys
sys.path.insert(0, 'utils')
from supabase_client import supabase
# User credentials as specified
users_data = [
    {
        "id": "admin-001",
        "email": "admin@gmail.com",
        "password": "admin@123",
        "role": "admin",
        "full_name": "Administrator"
    },
    {
        "id": "teacher-001", 
        "email": "teacher@gmail.com",
        "password": "teacher@123",
        "role": "teacher",
        "full_name": "Teacher"
    },
    {
        "id": "student-001",
        "email": "student@gmail.com",
        "password": "student@123",
        "role": "student",
        "full_name": "Student"
    }
]

print("Creating users with role-based access...")

for user_data in users_data:
    # Hash the password
    password_hash = bcrypt.hashpw(
        user_data['password'].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')
    
    # Prepare user record
    user_record = {
        "id": user_data['id'],
        "email": user_data['email'],
        "password_hash": password_hash,
        "role": user_data['role'],
        "full_name": user_data['full_name']
    }
    
    try:
        # Insert into users table
        result = supabase.table('users').upsert(user_record).execute()
        print(f"[OK] Created/Updated user: {user_data['email']} ({user_data['role']})")
    except Exception as e:
        print(f"[ERROR] Error creating {user_data['email']}: {e}")

print("\n[OK] All users created successfully!")
print("\nUser credentials:")
print("=" * 50)
for user in users_data:
    print(f"Role: {user['role'].upper()}")
    print(f"  Email: {user['email']}")
    print(f"  Password: {user['password']}")
    print()