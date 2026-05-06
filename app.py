from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from utils.data_manager import DataManager
from utils.scheduler import Scheduler
from utils.supabase_client import supabase
from utils.ai_assistant import AIAssistant
import json
import re
import os
import uuid
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_super_secret_key_123')

ai_assistant = AIAssistant()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            if request.path.startswith('/api/'):
                 return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/login')
def login_page():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    import bcrypt
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    try:
        if not supabase:
             return jsonify({"error": "Supabase client not initialized"}), 500
             
        result = supabase.table('users').select("*").eq('email', email).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({"error": "Invalid credentials"}), 401
        
        user = result.data[0]
        
        if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            session['user'] = user['id']
            session['email'] = user['email']
            session['role'] = user['role']
            session['full_name'] = user.get('full_name', '')
            
            return jsonify({
                "success": True, 
                "user": {
                    "id": user['id'], 
                    "email": user['email'],
                    "role": user['role'],
                    "full_name": user.get('full_name', '')
                }
            })
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "Login failed"}), 400
    
    

@app.route('/api/signup', methods=['POST'])
def api_signup():
    return jsonify({"error": "Signup is disabled. Please contact administrator."}), 403

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))

@app.route('/')
@login_required
def dashboard():
    return render_template('dashboard.html', 
                         user_email=session.get('email'),
                         user_role=session.get('role', 'student'),
                         user_name=session.get('full_name', ''))

@app.route('/api/resources', methods=['GET'])
@login_required
def get_resources():
    return jsonify(DataManager.get_resources())

@app.route('/api/events', methods=['GET'])
@login_required
def get_events():
    return jsonify(DataManager.get_events())

@app.route('/api/events/<event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    user_role = session.get('role', 'student')
    
    # Only admins can delete events
    if user_role != 'admin':
        return jsonify({"error": "Unauthorized. Only administrators can delete events."}), 403

    # Admin deletes directly
    try:
        DataManager.delete_event(event_id)
        return jsonify({"success": True, "message": "Event deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Deletion failed: {str(e)}"}), 500

def extract_json(text):
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    user_message = request.json.get('message')
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    ai_response = ai_assistant.send_message(user_message)
    command = extract_json(ai_response)
    
    if command:
        action = command.get('action')
        
        if action == 'check_resources':
            event_type = command.get('type')
            capacity = command.get('capacity', 0)
            start = command.get('start')
            end = command.get('end')
            
            rooms = Scheduler.find_suitable_resources('Room', start, end, min_capacity=capacity)
            instructors = Scheduler.find_suitable_resources('Instructor', start, end)
            equipment = Scheduler.find_suitable_resources('Equipment', start, end)
            
            context_data = {
                "rooms": rooms[:5],
                "instructors": instructors[:5],
                "equipment": equipment[:3]
            }
            
            follow_up = ai_assistant.send_message("", system_context=str(context_data))
            return jsonify({"response": follow_up})
            
        elif action == 'book_event':
            event_details = command.get('event_details')
            resources = command.get('resources')
            
            new_event = {
                "id": f"EVT-{uuid.uuid4()}",
                "title": event_details.get('title', 'AI Scheduled Event'),
                "type": event_details.get('type'),
                "start_time": event_details.get('start'),
                "end_time": event_details.get('end'),
                "description": f"AI Booking. {event_details.get('purpose', '')}"
            }
            
            success, msg = Scheduler.schedule_event(new_event, resources)
            
            if success:
                return jsonify({"response": f"✅ Event Confirmed! {msg}\n\n**Details:**\n- {new_event['title']}\n- {new_event['start_time']}"})
            else:
                retry_response = ai_assistant.send_message(f"Booking failed: {msg}. Please ask user for alternative.")
                return jsonify({"response": retry_response})
                
    return jsonify({"response": ai_response})

@app.route('/api/check-availability', methods=['POST'])
@login_required
def check_availability():
    try:
        data = request.json
        start = data.get('start')
        end = data.get('end')
        
        cap_str = data.get('capacity')
        min_capacity = int(cap_str) if cap_str and cap_str.strip() else 0
        limit = 20
        
        rooms = Scheduler.find_suitable_resources('Room', start, end, min_capacity=min_capacity)
        instructors = Scheduler.find_suitable_resources('Instructor', start, end)
        equipment = Scheduler.find_suitable_resources('Equipment', start, end)
        
        return jsonify({
            "rooms": rooms[:limit],
            "instructors": instructors[:limit],
            "equipment": equipment[:limit]
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/book-manual', methods=['POST'])
@login_required
def book_manual():
    try:
        data = request.json
        event_details = data.get('event')
        resource_ids = data.get('resources')
        user_role = session.get('role', 'student')
        user_id = session.get('user')
        
        # Students create pending events
        if user_role == 'student':
            import json as json_lib
            
            # Handle capacity conversion safely
            capacity_str = event_details.get('capacity', '0')
            capacity = int(capacity_str) if capacity_str and capacity_str.strip() else 0
            
            pending_event = {
                "id": f"PEND-{uuid.uuid4()}",
                "title": event_details.get('title'),
                "type": event_details.get('type'),
                "start_time": event_details.get('start'),
                "end_time": event_details.get('end'),
                "description": f"Purpose: {event_details.get('purpose')}. Attendees: {capacity}",
                "capacity": capacity,
                "requested_by": user_id,
                "requested_resources": json_lib.dumps(resource_ids),
                "status": "pending"
            }
            
            result = supabase.table('pending_events').insert(pending_event).execute()
            
            if result.data:
                return jsonify({
                    "success": True, 
                    "message": "Event request submitted for approval! Admin/Teacher will review it soon.",
                    "pending": True
                })
            else:
                return jsonify({"success": False, "message": "Failed to submit request"}), 500
        
        # Admin/Teacher create directly
        else:
            new_event = {
                "id": f"EVT-{uuid.uuid4()}",
                "title": event_details.get('title'),
                "type": event_details.get('type'),
                "start_time": event_details.get('start'),
                "end_time": event_details.get('end'),
                "description": f"Purpose: {event_details.get('purpose')}. Attendees: {event_details.get('capacity')}",
                "created_by": user_id
            }
            
            success, msg = Scheduler.schedule_event(new_event, resource_ids)
            
            if success:
                return jsonify({"success": True, "message": "Event Booked Successfully!"})
            else:
                return jsonify({"success": False, "message": msg}), 400
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"System Error: {str(e)}"}), 500

@app.route('/api/event/<event_id>', methods=['GET'])
@login_required
def get_event_details(event_id):
    events = {e['id']: e for e in DataManager.get_events()}
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    
    allocs = DataManager.get_allocations()
    resources = {r['id']: r for r in DataManager.get_resources()}
    
    allocated_resources = []
    for a in allocs:
        if a['event_id'] == event_id:
            res = resources.get(a['resource_id'])
            if res:
               allocated_resources.append(res)
               
    return jsonify({
        "event": event,
        "resources": allocated_resources
    })

# --- Approval Endpoints ---

@app.route('/api/pending-events', methods=['GET'])
@login_required
def get_pending_events():
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    try:
        if user_role in ['admin', 'teacher']:
            result = supabase.table('pending_events')\
                .select('*')\
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
        return jsonify([])

@app.route('/api/approve-event/<event_id>', methods=['POST'])
@login_required
def approve_event(event_id):
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    if user_role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        import json as json_lib
        
        result = supabase.table('pending_events').select('*').eq('id', event_id).execute()
        
        if not result.data or len(result.data) == 0:
            return jsonify({"error": "Pending event not found"}), 404
        
        pending = result.data[0]
        
        new_event = {
            "id": f"EVT-{uuid.uuid4()}",
            "title": pending['title'],
            "type": pending['type'],
            "start_time": pending['start_time'],
            "end_time": pending['end_time'],
            "description": pending.get('description', ''),
            "created_by": pending['requested_by']
        }
        
        resource_ids = json_lib.loads(pending['requested_resources'])
        success, msg = Scheduler.schedule_event(new_event, resource_ids)
        
        if success:
            supabase.table('pending_events').update({
                "status": "approved",
                "reviewed_by": user_id
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
    user_role = session.get('role', 'student')
    user_id = session.get('user')
    
    if user_role not in ['admin', 'teacher']:
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        data = request.json or {}
        reason = data.get('reason', 'No reason provided')
        
        result = supabase.table('pending_events').update({
            "status": "rejected",
            "reviewed_by": user_id,
            "rejection_reason": reason
        }).eq('id', event_id).execute()
        
        if result.data:
            return jsonify({"success": True, "message": "Event request rejected"})
        else:
            return jsonify({"error": "Failed to reject event"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Deletion Approval Endpoints ---

@app.route('/api/deletion-requests', methods=['GET'])
@login_required
def get_deletion_requests():
    user_role = session.get('role', 'student')
    if user_role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        requests = supabase.table('deletion_requests').select('*').eq('status', 'pending').execute()
        
        enriched_requests = []
        if requests.data:
            for req in requests.data:
          
                evt_res = supabase.table('events').select('title, type').eq('id', req['event_id']).execute()
                evt_info = evt_res.data[0] if evt_res.data else {"title": "Unknown Event", "type": "Unknown"}
                
                user_res = supabase.table('users').select('full_name, email').eq('id', req['requested_by']).execute()
                user_info = user_res.data[0] if user_res.data else {"full_name": "Unknown", "email": "Unknown"}
                
                req['event_title'] = evt_info['title']
                req['event_type'] = evt_info['type']
                req['requested_by_name'] = user_info['full_name']
                enriched_requests.append(req)
                
        return jsonify(enriched_requests)
    except Exception as e:
        print(f"Error fetching deletion requests: {e}")
        return jsonify([])

@app.route('/api/approve-deletion/<request_id>', methods=['POST'])
@login_required
def approve_deletion(request_id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        req = supabase.table('deletion_requests').select('*').eq('id', request_id).execute()
        if not req.data:
            return jsonify({"error": "Request not found"}), 404
            
        event_id = req.data[0]['event_id']
        
        
        DataManager.delete_event(event_id)
        
       
        supabase.table('deletion_requests').update({"status": "approved"}).eq('id', request_id).execute()
        
        return jsonify({"success": True, "message": "Deletion approved and event removed."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/events', methods=['POST'])
@login_required
def create_event():
    data = request.json
    description = data.get("description", "")
 

    if len(description) > 20: 
        return jsonify({
            "error": "Description must be 20 characters or less"
        }), 400
    DataManager.create_event(data)
    return jsonify({"message": "Event created successfully"}), 201


@app.route('/api/reject-deletion/<request_id>', methods=['POST'])
@login_required
def reject_deletion(request_id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        supabase.table('deletion_requests').update({"status": "rejected"}).eq('id', request_id).execute()
        return jsonify({"success": True, "message": "Deletion request rejected."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/archived-events', methods=['GET'])
@login_required
def get_archived_events():
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        response = supabase.table('archived_events').select("*").order('deleted_at', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Error fetching archived events: {e}")
        return jsonify([])

if __name__ == '__main__':
    if not supabase:
        print("\n" + "="*60)
        print("WARNING: Supabase client not initialized!")
        print("Please check your .env file for SUPABASE_URL and SUPABASE_KEY")
        print("="*60 + "\n")
    
    app.run(
        debug=True, 
        port=5000,
        use_reloader=True,
        extra_files=[]  
    )

