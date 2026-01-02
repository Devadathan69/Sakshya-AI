import requests
import json

url = "http://localhost:8005/analyze"

payload = {
    "statement_1_text": "John went to the market at 5 PM.",
    "statement_1_type": "stmt_161",
    "statement_2_text": "John was at home at 5 PM.",
    "statement_2_type": "stmt_164"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=60)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
