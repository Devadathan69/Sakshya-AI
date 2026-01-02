import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import os

def merge_and_save():
    print("--- Merge LoRA Adapters into Base Model ---")
    
    adapter_path = os.path.join(os.path.dirname(__file__), "sakshya-qwen-lora")
    output_path = os.path.join(os.path.dirname(__file__), "sakshya-qwen-merged")
    
    # Read base model from config (or hardcode based on what we saw in adapter_config.json)
    base_model_name = "Qwen/Qwen2.5-7B-Instruct"
    
    print(f"Base Model: {base_model_name}")
    print(f"Adapter Path: {adapter_path}")
    print(f"Output Path: {output_path}")
    
    print("\nLoading base model (this requires downloading ~15GB and loading into RAM)...")
    try:
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True
        )
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
        
        print("Loading adapters...")
        model = PeftModel.from_pretrained(base_model, adapter_path)
        
        print("Merging weights...")
        model = model.merge_and_unload()
        
        print(f"Saving merged model to {output_path}...")
        model.save_pretrained(output_path)
        tokenizer.save_pretrained(output_path)
        
        print("\n✅ Merge Complete!")
        print(f"Now you can upload '{output_path}' to Hugging Face as a FULL model.")
        print("Use the 'upload_to_hf.py' script but change the folder_path to 'sakshya-qwen-merged'.")
        
    except Exception as e:
        print(f"\n❌ Merge failed: {e}")
        print("Ensure you have enough RAM (32GB+) and GPU VRAM if using CUDA.")

if __name__ == "__main__":
    merge_and_save()
