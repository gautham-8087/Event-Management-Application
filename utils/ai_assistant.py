import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class AIAssistant:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("Warning: GOOGLE_API_KEY not found in environment variables.")
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')

    def send_message(self, message, system_context=None):
        if not hasattr(self, 'model'):
             return "AI Assistant is not configured. Please check API key."

        try:
            prompt = message
            if system_context:
                prompt = f"System Context: {system_context}\n\nUser Message: {message}"
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating AI response: {e}")
            return "Sorry, I encountered an error processing your request."
