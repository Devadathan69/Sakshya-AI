import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Mock env setup to ensure configs load if running standalone
from dotenv import load_dotenv
load_dotenv('backend/.env')

try:
    from backend.hf_llm import HFLLM
    print("Successfully imported HFLLM.")
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

def test_generation():
    llm = HFLLM()
    
    prompt = "Extract events from: 'John went to the market at 5 PM.'"
    print(f"Testing generation with prompt: {prompt}")
    
    response = llm.generate_content(prompt)
    print("--- Response ---")
    print(response)
    print("----------------")

if __name__ == "__main__":
    test_generation()
