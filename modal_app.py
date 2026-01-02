import modal
from pydantic import BaseModel

# Define the image with dependencies
image = (
    modal.Image.debian_slim()
    .pip_install(
        "transformers",
        "peft",
        "accelerate",
        "torch",
        "huggingface_hub",
        "sentencepiece",
        "fastapi[standard]"
    )
)

app = modal.App("sakshya-qwen-backend")

class GenerateRequest(BaseModel):
    prompt: str

@app.cls(
    image=image,
    gpu="A10G",  # A10G is usually sufficient and cost-effective
    timeout=600, # 10 minutes timeout for loading/generation
    secrets=[modal.Secret.from_name("hf-secret")]
)
class Model:
    @modal.enter()
    def load_model(self):
        import os
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel

        # Configuration
        base_model_name = "Qwen/Qwen2.5-7B-Instruct"
        adapter_repo = "Devadathan69/sakshya-qwen-lora" # Your uploaded repo
        
        print(f"Loading base model: {base_model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
        
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True
        )

        print(f"Loading LoRA adapters from: {adapter_repo}...")
        try:
            self.model = PeftModel.from_pretrained(base_model, adapter_repo)
            print("Adapters loaded successfully.")
        except Exception as e:
            print(f"Warning: Failed to load adapters ({e}). Using base model only.")
            self.model = base_model
        
        self.model.eval()

    @modal.method()
    def generate(self, prompt: str):
        # Format prompt with ChatML
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

        generated_ids = self.model.generate(
            **inputs,
            max_new_tokens=2048,
            temperature=0.2,
            top_p=0.9,
            repetition_penalty=1.1,
            do_sample=True
        )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
        ]

        response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response

@app.function(image=image)
@modal.web_endpoint(method="POST")
def generate_text(item: GenerateRequest):
    # Instantiate the model class (Modal handles the container/GPU provisioning)
    model = Model()
    response_text = model.generate.remote(item.prompt)
    return {"generated_text": response_text}
