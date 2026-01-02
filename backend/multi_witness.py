import asyncio
from typing import List, Tuple
from itertools import combinations
from schemas import WitnessInput, MultiAnalyzeResponse, ReportRow, Event, ComparisonResult
from extraction import extract_events_from_text
from compare import compare_events
from filters import should_compare_events
from heuristics import apply_legal_heuristics
from report import generate_final_report
from translation import refine_legal_explanation, detect_language

async def process_multi_witness_analysis(request_witnesses: List[WitnessInput]) -> MultiAnalyzeResponse:
    """
    Orchestrates the N*N analysis of witness statements.
    """
    
    # 1. Language Detection (Use the first non-empty text)
    full_text = " ".join([w.text for w in request_witnesses])
    detected_lang = detect_language(full_text)
    print(f"DEBUG: Detected consolidated language: {detected_lang}")

    # 2. Extract Events for ALL witnesses
    # We map Witness ID -> List[Event]
    witness_events_map: dict[str, List[Event]] = {}
    
    # Run extractions in parallel
    extraction_tasks = []
    for w in request_witnesses:
        extraction_tasks.append(extract_events_from_text(w.text, w.type))
        
    results = await asyncio.gather(*extraction_tasks)
    
    for i, events in enumerate(results):
        w_id = request_witnesses[i].id
        witness_events_map[w_id] = events
        print(f"DEBUG: Extracted {len(events)} events for witness {w_id}")

    # 3. Pairwise Comparison Loop
    all_report_rows: List[ReportRow] = []
    
    # Get all unique pairs of witnesses
    # e.g., (w1, w2), (w1, w3), (w2, w3)
    pairs = list(combinations(request_witnesses, 2))
    print(f"DEBUG: Analyzing {len(pairs)} witness pairs")
    
    for w1, w2 in pairs:
        events1 = witness_events_map[w1.id]
        events2 = witness_events_map[w2.id]
        
        # Compare events1 vs events2
        # Use existing logic from main.py but adapted
        
        for e1 in events1:
            for e2 in events2:
                # Use Filters
                if not should_compare_events(e1, e2):
                    continue
                
                # Compare
                # print(f"DEBUG: Comparing {w1.name}:{e1.event_id} vs {w2.name}:{e2.event_id}")
                comparison_result = await compare_events(e1, e2)
                
                # Apply Heuristics
                row = apply_legal_heuristics(comparison_result, e1, e2)
                
                # Override Source Names to include Witness Names
                # Heuristics puts "FIR: Actor Action"
                # We want "PW-1 (FIR): Actor Action"
                row.source_1 = f"{w1.name} ({w1.type}): {e1.actor} {e1.action}"
                row.source_2 = f"{w2.name} ({w2.type}): {e2.actor} {e2.action}"
                
                if row.classification != "consistent":
                    # Refine and Translate
                    # Note: We do this sequentially here to respect rate limits potentially? 
                    # Or we can gather them later. For now, sequential await to be safe.
                    if detected_lang != "en" or True: # Always refine for better quality
                         row = await refine_legal_explanation(row, detected_lang)

                    all_report_rows.append(row)

    # 4. Generate Final Response
    # Apply global aggregation if needed (e.g., removing duplicates)
    # Reuse generate_final_report logic for disclaimer/structure
    final_report = generate_final_report(all_report_rows, detected_lang)
    
    return MultiAnalyzeResponse(
        input_language=detected_lang,
        analysis_language=detected_lang,
        consolidated_report=final_report.rows,
        disclaimer=final_report.disclaimer
    )
