import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.ai_assistant import AIAssistant

print("--- Testing AI Assistant ---")
try:
    ai = AIAssistant()
    print("Initializing chat...")
    response = ai.start_chat()
    print(f"AI Response: {response}")
    
    msg = "I want to schedule a workshop for 20 people on Python."
    print(f"\nUser: {msg}")
    reply = ai.send_message(msg)
    print(f"AI Reply: {reply}")

except Exception as e:
    print(f"ERROR: {e}")