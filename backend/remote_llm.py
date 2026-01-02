import requests
import os
from config import MODAL_API_URL

class RemoteLLM:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RemoteLLM, cls).__new__(cls)
        return cls._instance

    def generate_content(self, prompt: str) -> str:
        if not MODAL_API_URL:
            # Fallback for when URL is not yet set
            print("Error: MODAL_API_URL is not set in config.")
            return "Error: Backend not connected to Modal. Please configure MODAL_API_URL."

        print(f"DEBUG: Querying Remote LLM at {MODAL_API_URL}...")
        
        try:
            # Modal endpoint expects a JSON body matching the Pydantic model
            # defined in modal_app.py: class GenerateRequest(BaseModel): prompt: str
            payload = {"prompt": prompt}
            
            # Modal web endpoints are POST by default
            response = requests.post(MODAL_API_URL, json=payload, timeout=600)
            
            if response.status_code != 200:
                print(f"Remote LLM Error {response.status_code}: {response.text}")
                return f"Error: Remote API failed with {response.status_code}"

            data = response.json()
            # Expecting {"generated_text": "..."}
            return data.get("generated_text", "")

        except Exception as e:
            print(f"Remote LLM Request failed: {e}")
            return f"Error: {e}"
