CREATE TABLE IF NOT EXISTS archived_events (
    id TEXT PRIMARY KEY,
    original_id TEXT,
    title TEXT,
    type TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE archived_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to archived_events" ON archived_events FOR ALL USING (true) WITH CHECK (true);
