import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from extraction import extract_events_from_text
from compare import compare_events
from schemas import Event

async def main():
    text1 = """
    On 25th December 2024 at 10:00 PM, I, John Doe, was at the central park.
    I saw Jane Smith arguing with a man. The man pushed Jane exactly once.
    Then he ran away towards the north gate.
    """
    
    text2 = """
    On 25th December 2024 around 10 PM, I was near the park.
    I saw a man arguing with Jane. He did not push her, he just walked away.
    """

    print("Testing English Extraction...")
    events1 = await extract_events_from_text(text1, "FIR")
    print(f"Statement 1 Events: {len(events1)}")
    for e in events1:
        print(f"1: {e.action} | {e.source_sentence}")

    events2 = await extract_events_from_text(text2, "Court Deposition")
    print(f"Statement 2 Events: {len(events2)}")
    for e in events2:
        print(f"2: {e.action} | {e.source_sentence}")
        
    if events1 and events2:
        print("\nTesting Comparison (All Pairs)...")
        found_contradiction = False
        for e1 in events1:
            for e2 in events2:
                # Naive check to reduce API cost in loop: only compare relevant ones by actor/action?
                # For reproduction, just compare the 'push' related ones explicitly if possible, or all.
                # Let's compare all to match backend logic.
                print(f"Comparing {e1.action} vs {e2.action}")
                res = await compare_events(e1, e2)
                if res.classification != "consistent":
                    print(f"!!! Found {res.classification}: {res.explanation}")
                    found_contradiction = True
        
        if not found_contradiction:
            print("No contradictions found in any pair.")

if __name__ == "__main__":
    asyncio.run(main())
