import os
from huggingface_hub import HfApi, login

def upload_model():
    print("--- Upload Model to Hugging Face Hub ---")
    
    # 0. Load .env from subdirectory
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), "sakshya-qwen-lora", ".env")
    load_dotenv(env_path)
    
    # 1. Get Token
    token = os.getenv("HF_TOKEN")
    if not token:
        print("\nTip: You can set the HF_TOKEN environment variable to skip this step.")
        token = input("Enter your Hugging Face Write Token: ").strip()
        if not token:
            print("Token is required.")
            return

    # 2. Login & Get Username
    try:
        login(token=token, add_to_git_credential=True)
        user_info = HfApi(token=token).whoami()
        username = user_info['name']
        print(f"Successfully logged in as: {username}")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 3. Get Repo Name
    default_repo_id = f"{username}/sakshya-qwen-lora"
    print(f"\nEnter the desired Repository ID (default: {default_repo_id})")
    repo_id = input(f"Repository ID [{default_repo_id}]: ").strip()
    if not repo_id:
        repo_id = default_repo_id

    # 4. Upload
    folder_path = os.path.join(os.path.dirname(__file__), "sakshya-qwen-lora")
    if not os.path.exists(folder_path):
        print(f"Error: Directory {folder_path} does not exist.")
        return

    api = HfApi()
    
    print(f"\nUploading contents of '{folder_path}' to '{repo_id}'...")
    print("This may take a moment depending on your internet speed.")

    try:
        api.create_repo(repo_id=repo_id, exist_ok=True, private=True) # Defaulting to private for safety
        print(f"Repository '{repo_id}' created (or already exists).")
        
        api.upload_folder(
            folder_path=folder_path,
            repo_id=repo_id,
            repo_type="model"
        )
        print("\n✅ Upload Complete!")
        print(f"View your model at: https://huggingface.co/{repo_id}")
        
    except Exception as e:
        print(f"\n❌ Upload failed: {e}")

if __name__ == "__main__":
    upload_model()
