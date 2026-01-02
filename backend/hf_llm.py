import os
import requests
from config import HF_MODEL_ID, HF_TOKEN

class HFLLM:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HFLLM, cls).__new__(cls)
        return cls._instance

    def generate_content(self, prompt: str) -> str:
        if not HF_TOKEN or not HF_MODEL_ID:
            print("Error: HF_TOKEN or HF_MODEL_ID not set.")
            return "Error: Configuration missing."

        print(f"DEBUG: Querying HF API for model {HF_MODEL_ID}...")
        
        # Using the standard Inference API URL for the model
        api_url = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL_ID}"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        
        # Proper chat template formatting for Qwen/Instruct models
        # Note: Analysis tasks usually send a prompt "Extract... : text", so we 
        # wrap it in a user message.
        payload = {
            "inputs": f"<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n",
            "parameters": {
                "max_new_tokens": 2048,
                "temperature": 0.2,
                "top_p": 0.9,
                "do_sample": True,
                "return_full_text": False
            }
        }

        try:
            response = requests.post(api_url, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"HF API Error {response.status_code}: {response.text}")
                # Check for "model loading" state
                if "currently loading" in response.text:
                   return "Error: Model is currently loading. Please try again in a minute."
                return f"Error: HF API failed with {response.status_code}"

            result = response.json()
            
            # The API usually returns a list of dictionaries with 'generated_text'
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
                # Clean up if the model echoed the prompt (sometimes happens)
                # But with return_full_text=False it shouldn't.
                return generated_text.strip()
            
            return str(result)

        except Exception as e:
            print(f"HF API Request failed: {e}")
            return f"Error: {e}"

hf_llm_instance = HFLLM()
