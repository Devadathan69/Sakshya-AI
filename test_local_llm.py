import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.local_llm import LocalLLM
    print("Successfully imported LocalLLM.")
except ImportError as e:
    print(f"ImportError: {e}")
    print("Make sure you are running this from the project root or adjust sys.path")
    sys.exit(1)

def test_generation():
    print("Attempting to load model...")
    llm = LocalLLM()
    llm.load_model()
    print("Model loaded.")
    
    prompt = "Extract events from: 'John went to the market at 5 PM.'"
    print(f"Testing generation with prompt: {prompt}")
    response = llm.generate_content(prompt)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_generation()
