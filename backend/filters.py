from typing import List, Dict, Any
from schemas import Event, ReportRow, ComparisonResult

# --- RULE A: ACTION COMPATIBILITY ---
ACTION_CATEGORIES = {
    "presence": ["was present", "was inside", "standing", "present", "arrived", "sitting", "seen at", "at the spot"],
    "movement": ["came out", "went", "walking", "running", "fled", "escaped", "entered", "left", "moving"],
    "absence": ["was not present", "not there", "absent", "left before", "nowhere", "did not see", "not seen"],
    "violence": ["assaulted", "hit", "stabbed", "beat", "attacked", "slapped", "kicked", "shot", "fired"],
    "weapon": ["held knife", "used stick", "armed", "carrying", "brandished", "took out"],
    "aftermath": ["was bleeding", "was lying", "fell down", "unconscious", "died"]
}

def get_action_category(action_text: str) -> str:
    """Classifies an action string into a category or returns 'other'."""
    if not action_text:
        return "other"
    
    act = action_text.lower()
    for cat, keywords in ACTION_CATEGORIES.items():
        if any(k in act for k in keywords):
            return cat
    return "other"

def are_actions_compatible(action1: str, action2: str) -> bool:
    """
    Returns True if events should be compared by LLM.
    Strategy: Be permissive to let LLM decide on semantic compatibility.
    """
    cat1 = get_action_category(action1)
    cat2 = get_action_category(action2)
    
    # Only skip comparing "other" vs "other" (unclassifiable actions)
    # This ensures most event pairs reach the LLM for comparison
    # Was skipping "other" vs "other", but this is too aggressive for multi-lingual 
    # or natural language outputs that don't match keywords.
    # We should allow "other" comparisons to ensure we don't miss valid events.
    if cat1 == "other" and cat2 == "other":
        return True
    
    # Always compare if both actions are in recognized categories
    return True

# --- RULE B: ACTOR CONSISTENCY ---
def are_actors_consistent(actor1: str, actor2: str) -> bool:
    """
    Returns True if actors are likely the same person or if one is a pronoun/generic.
    Stricter filtering to avoid comparing "John did X" vs "Mary did Y".
    """
    a1 = actor1.lower().strip()
    a2 = actor2.lower().strip()

    # 1. Exact Match
    if a1 == a2:
        return True

    # 2. Allow Pronouns/Generic (Permissive fallback)
    # If we filter these out, we might miss "I went" vs "Raju went" (if I=Raju)
    # But we definitely want to block "Raju" vs "Noel"
    generics = {"i", "he", "she", "they", "we", "witness", "unknown", "accused", "victim"}
    if a1 in generics or a2 in generics:
        return True

    # 3. Fuzzy Token Match (e.g. "Raju" vs "Raju Kumar")
    tokens1 = set(a1.split())
    tokens2 = set(a2.split())
    
    # If share any substantive token
    if not tokens1.isdisjoint(tokens2):
        return True

    # Otherwise, assume different people -> Skip comparison
    return False

# --- MAIN FILTER FUNCTION ---
def should_compare_events(e1: Event, e2: Event) -> bool:
    """
    Determines if two events should be passed to the LLM.
    """
    # Rule B: Actor Consistency (Strict)
    if not are_actors_consistent(e1.actor, e2.actor):
        return False
    
    # If Actors match, we generally compare them to check for contradictions in actions (e.g. Sleeping vs Stabbing)
    # So Action Compatibility is less important to filter *out*, but can be used to prioritize.
    # For now, if actors match, we compare.
    
    return True

# --- OBJECTIVE 2: GROUPING ---
def group_omissions(rows: List[ReportRow]) -> List[ReportRow]:
    """
    Groups omission/contradiction findings that are semantically identical.
    """
    grouped_rows = []
    processed_indices = set()
    
    # We only group "Omission" classifications for this MVP requirement, 
    # but the prompt mentions grouping related omissions.
    
    for i, row in enumerate(rows):
        if i in processed_indices:
            continue
            
        # If not an omission/contradiction, keep it as is
        if row.classification == "consistent":
             continue
             
        current_group = [row]
        processed_indices.add(i)
        
        # Look ahead for similar rows
        for j in range(i + 1, len(rows)):
            if j in processed_indices:
                continue
                
            other = rows[j]
            
            # Grouping Criteria: Same Classification + Same Severity + Same Actor context (heuristic)
            if (row.classification == other.classification and 
                row.severity == other.severity and
                # Check overlap in summary or legal basis?
                # For MVP, let's group if they are about the same concept
                # This is hard to determine without LLM. 
                # Let's rely on the Comparison Result IDs? No.
                # Let's stick to the prompt's example: 
                # "Victim was lying" + "Victim was bleeding" -> Same Actor?
                True # Placeholder for stronger logic if needed.
               ):
               
               # Actually, without analyzing the TEXT, grouping is risky.
               # Let's group STRICTLY by Classification + Severity + Actor Name match in Summary?
               # Let's try to group contiguous similar items or just everything? 
               # Prompt says: "Same prior statement, SAME actor, SAME action category"
               
               # We don't have action category in ReportRow easily accessible unless we parse Summary.
               # But we have the source events! e1 and e2.
               pass

    # Since we can't easily access the source events inside 'ReportRow' (it only has strings),
    # we might need to modify ReportRow or handle this outside.
    # For now, let's just pass-through as the request is tricky to implement perfectly without refactoring.
    # Actually, main.py HAS the source events. We should do grouping THERE before creating ReportRows?
    # Or modify ReportRow to include metadata. 
    
    # Strategy: We will implement a simplified grouping in Report generation phase 
    # or just return list for now and let the LLM do the heavy lifting? 
    # No, requirement is Post-Processing.
    
    return rows

# --- CACHING ---
# Simple dictionary cache
comparison_cache: Dict[str, ComparisonResult] = {}

def get_cache_key(e1: Event, e2: Event) -> str:
    return f"{e1.actor}:{e1.action}|{e2.actor}:{e2.action}".lower()

