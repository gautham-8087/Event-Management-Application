
ROLES = {
    'admin': {
        'can_create_event': True,
        'can_edit_any_event': True,
        'can_delete_any_event': True,
        'can_approve_events': True,
        'can_view_pending': True,
        'requires_approval': False
    },
    'teacher': {
        'can_create_event': True,
        'can_edit_own_event': True,
        'can_delete_own_event': True,
        'can_approve_events': True,
        'can_view_pending': True,
        'requires_approval': False
    },
    'student': {
        'can_create_event': True,  # But goes to pending
        'can_edit_own_event': False,  # Only through new request
        'can_delete_own_event': False,
        'can_approve_events': False,
        'can_view_pending': False,  # Only own pending
        'requires_approval': True
    }
}

def can_user_do(role, action):
    """Check if a user role can perform an action"""
    if role not in ROLES:
        return False
    return ROLES[role].get(action, False)

def requires_approval(role):
    """Check if user's events require approval"""
    return ROLES.get(role, {}).get('requires_approval', True)

def can_approve(role):
    """Check if user can approve events"""
    return role in ['admin', 'teacher']

def can_edit_event(role, event_creator_id, current_user_id):
    """Check if user can edit a specific event"""
    if role == 'admin':
        return True
    if role == 'teacher' and event_creator_id == current_user_id:
        return True
    return False

def can_delete_event(role, event_creator_id, current_user_id):
    """Check if user can delete a specific event"""
    if role == 'admin':
        return True
    if role == 'teacher' and event_creator_id == current_user_id:
        return True
    return False
