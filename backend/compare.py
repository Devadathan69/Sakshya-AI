import json
from config import GEMINI_API_KEY, GEMINI_MODEL_NAME, USE_LOCAL_LLM, USE_HF_API, USE_MODAL_API
from prompts import COMPARISON_PROMPT
from filters import comparison_cache, get_cache_key
import google.generativeai as genai
from schemas import Event, ComparisonResult

if USE_LOCAL_LLM:
    from local_llm import LocalLLM
if USE_HF_API:
    from hf_llm import HFLLM
if USE_MODAL_API:
    from remote_llm import RemoteLLM

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def compare_events(event1: Event, event2: Event) -> ComparisonResult:
    # --- OBJECTIVE 4: RATE LIMIT & DEDUPLICATION (CACHE) ---
    cache_key = get_cache_key(event1, event2)
    if cache_key in comparison_cache:
        print(f"DEBUG: Cache Hit for {cache_key}")
        cached_result = comparison_cache[cache_key]
        # Return a copy with correct IDs
        return ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification=cached_result.classification,
            explanation=cached_result.explanation
        )

    if not GEMINI_API_KEY and not USE_LOCAL_LLM and not USE_HF_API and not USE_MODAL_API:
        return ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification="consistent",
            explanation="Mock consistency check (No API Key)"
        )

    print(f"DEBUG: Comparing Event {event1.event_id} vs {event2.event_id}")
    
    # --- DETERMINISTIC CHECK FOR IDENTICAL EVENTS ---
    # If the core components are identical (or very close), skip LLM and return consistent.
    # This prevents hallucinated contradictions for identical statements.
    def normalize(s: str): return (s or "").lower().strip()
    
    if (normalize(event1.actor) == normalize(event2.actor) and
        normalize(event1.action) == normalize(event2.action) and
        normalize(event1.target) == normalize(event2.target)):
        
        print(f"DEBUG: Events {event1.event_id} and {event2.event_id} are identical. Returning consistent.")
        return ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification="consistent",
            explanation="Both statements describe the exact same event details."
        )
    
    prompt = COMPARISON_PROMPT.format(
        type_1=event1.statement_type,
        actor_1=event1.actor,
        action_1=event1.action,
        target_1=event1.target,
        time_1=event1.time,
        location_1=event1.location,
        type_2=event2.statement_type,
        actor_2=event2.actor,
        action_2=event2.action,
        target_2=event2.target,
        time_2=event2.time,
        location_2=event2.location
    )

    try:
        response_text = ""
        # Prioritize Modal (Fine-Tuned Model) for comparison
        if USE_MODAL_API:
            response_text = RemoteLLM().generate_content(prompt)
        elif USE_HF_API:
             response_text = HFLLM().generate_content(prompt)
        elif USE_LOCAL_LLM:
            response_text = LocalLLM().generate_content(prompt)
        elif GEMINI_API_KEY:
             # Fallback to Gemini only if Modal is not configured
            model = genai.GenerativeModel(GEMINI_MODEL_NAME)
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            response_text = response.text
        else:
            return ComparisonResult(
                event_1_id=event1.event_id,
                event_2_id=event2.event_id,
                classification="consistent",
                explanation="No valid model configuration found."
            )
            
        # print(f"DEBUG: Comparison LLM Response: {response_text}")
        
        # Clean response
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result_json = json.loads(response_text)
        
        result = ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification=result_json.get("classification", "consistent"),
            explanation=result_json.get("explanation", "No explanation provided.")
        )
        
        # Save to cache
        comparison_cache[cache_key] = result
        return result

    except json.JSONDecodeError as je:
        print(f"JSON Decode Error during comparison: {je}")
        return ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification="consistent",
            explanation="JSON parsing error; treating as consistent for stability."
        )
    except Exception as e:
        print(f"Error during LLM comparison: {e}")
        import traceback
        traceback.print_exc()
        # --- OBJECTIVE 5: SAFETY FALLBACK ---
        # Use a valid classification literal as defined in schemas.py to avoid
        # Pydantic validation errors when constructing the response.
        return ComparisonResult(
            event_1_id=event1.event_id,
            event_2_id=event2.event_id,
            classification="consistent",
            explanation="Skipped analysis due to LLM error; treating as consistent for stability."
        )
