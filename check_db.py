from utils.supabase_client import supabase
if not supabase:
    print("Supabase not connected.")
else:
    try:
        print("Checking archived_events table...")
        res = supabase.table('archived_events').select('count', count='exact').execute()
        print("Table exists. Count:", res.count)
        test_id = "TEST-ARCH-001"
        try:
             supabase.table('archived_events').insert({
                "id": test_id,
                "title": "Test Event",
                "type": "Test"
             }).execute()
             print("Insert successful.")
             
             supabase.table('archived_events').delete().eq('id', test_id).execute()
             print("Cleanup successful.")
        except Exception as e:
            print(f"Insert failed: {e}")
            
    except Exception as e:
        print(f"Error accessing archived_events: {e}")