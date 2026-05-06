import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.scheduler import Scheduler
from utils.data_manager import DataManager

print("--- Testing Scheduler ---")

# 1. Find a room for 50 people
print("\nFinding room for 50 people...")
rooms = Scheduler.find_suitable_resources('Room', '2025-12-10T10:00:00', '2025-12-10T12:00:00', min_capacity=50)
print(f"Found {len(rooms)} rooms.")
if rooms:
    print(f"First room: {rooms[0]['name']} (Capacity: {rooms[0]['capacity']})")

# 2. Schedule an event
if rooms:
    room_id = rooms[0]['id']
    event_data = {
        "id": "TEST_EVT_1",
        "title": "Test Workshop",
        "type": "Workshop",
        "start_time": "2025-12-10T10:00:00",
        "end_time": "2025-12-10T12:00:00",
        "description": "A test event"
    }
    
    print(f"\nScheduling event in {room_id}...")
    success, msg = Scheduler.schedule_event(event_data, [room_id])
    print(f"Result: {success} - {msg}")

# 3. Try to schedule another event at the same time in same room
    print("\nTrying conflict...")
    event_data_2 = {
        "id": "TEST_EVT_2",
        "title": "Conflict Event",
        "type": "Workshop",
        "start_time": "2025-12-10T11:00:00", # Overlaps
        "end_time": "2025-12-10T13:00:00",
        "description": "Should fail"
    }
    success, msg = Scheduler.schedule_event(event_data_2, [room_id])
    print(f"Result: {success} - {msg}")

# 4. Clean up (Manual for now, or just leave it as seed for dev)
print("\nDone.")
