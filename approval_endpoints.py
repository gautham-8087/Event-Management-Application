
@app.route('/api/pending-events', methods=['GET'])
@login_required
def get_pending_events():
    """Get pending events for approval (admin/teacher) or own requests (student)"""
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    try:
        if user_role in ['admin', 'teacher']:
            
            result = supabase.table('pending_events')\
                .select('*, users!pending_events_requested_by_fkey(email, full_name)')\
                .eq('status', 'pending')\
                .execute()
        else:
            
            result = supabase.table('pending_events')\
                .select('*')\
                .eq('requested_by', user_id)\
                .execute()
        
        return jsonify(result.data if result.data else [])
    except Exception as e:
        print(f"Error fetching pending events: {e}")
        return jsonify([]), 500

@app.route('/api/approve-event/<event_id>', methods=['POST'])
@login_required
def approve_event(event_id):
    """Approve a pending event and move it to events table"""
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    
    if user_role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        import json
        from utils.scheduler import Scheduler
        
        result = supabase.table('pending_events').select('*').eq('id', event_id).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({"error": "Pending event not found"}), 404
        
        pending = result.data[0]
        
        new_event = {
            "id": f"EVT-{len(DataManager.get_events()) + 500}",  # Different range for approved events
            "title": pending['title'],
            "type": pending['type'],
            "start_time": pending['start_time'],
            "end_time": pending['end_time'],
            "description": pending.get('description', ''),
            "created_by": pending['requested_by']
        }
        
        
        resource_ids = json.loads(pending['requested_resources'])
        
     
        success, msg = Scheduler.schedule_event(new_event, resource_ids)
        
        if success:
        
            supabase.table('pending_events').update({
                "status": "approved",
                "reviewed_by": user_id,
                "reviewed_at": "now()"
            }).eq('id', event_id).execute()
            
            return jsonify({"success": True, "message": "Event approved and created!"})
        else:
            return jsonify({"success": False, "message": f"Failed to create event: {msg}"}), 400
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/reject-event/<event_id>', methods=['POST'])
@login_required
def reject_event(event_id):
    """Reject a pending event"""
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    # Only admin/teacher can reject
    if user_role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        data = request.json or {}
        reason = data.get('reason', 'No reason provided')
        
        # Update pending event status
        result = supabase.table('pending_events').update({
            "status": "rejected",
            "reviewed_by": user_id,
            "reviewed_at": "now()",
            "rejection_reason": reason
        }).eq('id', event_id).execute()
        
        if result.data:
            return jsonify({"success": True, "message": "Event request rejected"})
        else:
            return jsonify({"error": "Failed to reject event"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500