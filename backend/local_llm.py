import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from config import LOCAL_MODEL_PATH, BASE_MODEL_NAME

class LocalLLM:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalLLM, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.tokenizer = None
        return cls._instance

    def load_model(self):
        if self.model is not None:
            return

        print("Loading local model logic...")
        base_model_name = BASE_MODEL_NAME
        adapter_path = LOCAL_MODEL_PATH

        print(f"Base Model: {base_model_name}")
        print(f"Adapter Path: {adapter_path}")

        try:
            # Load Tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
            
            # Load Base Model
            # Device map "auto" helps use GPU if available
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                device_map="auto",
                trust_remote_code=True,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
            )

            # Load LoRA Adapter
            if os.path.exists(adapter_path):
                self.model = PeftModel.from_pretrained(base_model, adapter_path)
                print("Successfully loaded LoRA adapters.")
            else:
                print(f"Warning: Adapter path {adapter_path} not found. Using base model only.")
                self.model = base_model

            self.model.eval()

        except Exception as e:
            print(f"Failed to load local model: {e}")
            raise e

    def generate_content(self, prompt: str) -> str:
        if self.model is None:
            self.load_model()

        # ChatML format for Qwen
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
        
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

        generated_ids = self.model.generate(
            **model_inputs,
            max_new_tokens=2048,
            temperature=0.2,
            top_p=0.9,
            repetition_penalty=1.1
        )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]

        response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response

local_llm_instance = LocalLLM()
