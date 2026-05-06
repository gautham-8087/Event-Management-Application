import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found.")
    exit(1)

supabase = create_client(url, key)

# SQL to create deletion_requests table
sql = """
CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    requested_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to deletion_requests" ON deletion_requests FOR ALL USING (true) WITH CHECK (true);
"""
