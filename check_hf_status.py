import os
from huggingface_hub import HfApi
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
load_dotenv(env_path)

token = os.getenv("HF_TOKEN")
repo_id = "Devadathan69/sakshya-qwen-lora"

api = HfApi(token=token)

try:
    info = api.model_info(repo_id)
    print(f"Model ID: {info.modelId}")
    print(f"Private: {info.private}")
    print(f"Files: {[f.rfilename for f in info.siblings]}")
    print("✅ Model repository exists and is accessible.")
except Exception as e:
    print(f"❌ Error accessing model info: {e}")
