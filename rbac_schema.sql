CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pending events table for approval workflow
CREATE TABLE IF NOT EXISTS pending_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 0,
  requested_by TEXT REFERENCES users(id) ON DELETE CASCADE,
  requested_resources TEXT, -- JSON array of resource IDs as string
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Add created_by column to events table (for tracking who created approved events)
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id);

-- Row Level Security for users
-- Since we're using custom authentication (not Supabase Auth),
-- we'll handle permissions in the application layer
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to users" ON users
  FOR UPDATE USING (true);

-- Row Level Security for pending_events
ALTER TABLE pending_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to pending_events" ON pending_events
  FOR ALL USING (true);

-- Insert default users
-- Password hashes are bcrypt hashes of the specified passwords
-- admin@123, teacher@123, student@123

-- Note: These will be populated by create_users.py script
-- Placeholder entries to be updated

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_events_status ON pending_events(status);
CREATE INDEX IF NOT EXISTS idx_pending_events_requested_by ON pending_events(requested_by);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
