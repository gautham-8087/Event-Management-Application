from datetime import datetime
from .data_manager import DataManager

class Scheduler:
    @staticmethod
    def _parse_time(time_str):
        dt = datetime.fromisoformat(time_str)
        if dt.tzinfo is not None:
             dt = dt.replace(tzinfo=None)
        return dt

    @classmethod
    def is_available(cls, resource_id, start_time_str, end_time_str):
        
        allocations = DataManager.get_allocations()
        events = {e['id']: e for e in DataManager.get_events()}
        
        start = cls._parse_time(start_time_str)
        end = cls._parse_time(end_time_str)

        for alloc in allocations:
            if alloc['resource_id'] == resource_id:
                event = events.get(alloc['event_id'])
                if not event:
                    continue
                
                event_start = cls._parse_time(event['start_time'])
                event_end = cls._parse_time(event['end_time'])
                
                if start < event_end and end > event_start:
                    return False
        return True
    
    @classmethod
    def find_suitable_resources(cls, resource_type, start_time, end_time, **criteria):
        resources = DataManager.get_resources()
        available = []

        for r in resources:
            if r['type'] != resource_type:
                continue
            
            if resource_type == 'Room' and 'min_capacity' in criteria:
                if r.get('capacity', 0) < criteria['min_capacity']:
                    continue
            
            if resource_type == 'Instructor' and 'specialization' in criteria:
                if criteria['specialization'].lower() not in r.get('specialization', '').lower():
                    continue

            # Check availability
            if cls.is_available(r['id'], start_time, end_time):
                available.append(r)
        
        return available

    @classmethod
    def schedule_event(cls, event_data, resource_ids):
        start = event_data['start_time']
        end = event_data['end_time']
        
        # Double check all resources
        count_conflicts = 0
        for rid in resource_ids:
            if not cls.is_available(rid, start, end):
                count_conflicts += 1
                return False, f"Resource {rid} is already booked for this time."
        
        # Save Event
        DataManager.add_event(event_data)
        
        import uuid
        #  Save Allocations
        for rid in resource_ids:
            alloc = {
                "id": f"A-{uuid.uuid4()}",
                "event_id": event_data['id'],
                "resource_id": rid
            }
            DataManager.add_allocation(alloc)
            
        msg = "Event scheduled successfully."
        if count_conflicts > 0:
            msg += f" Note: {count_conflicts} resource conflicts detected but allowed."
            
        return True, msg