import json
import sys
import time
from pathlib import Path

# Add the package to sys.path if needed
sys.path.append(r"c:\Users\Pheo\OneDrive\Documents\NetBeansProjects\lex-love-loom\.venv\Lib\site-packages")

from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

def main():
    # Force UTF-8 encoding for script output
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    tokens = load_cached_tokens()
    if not tokens:
        print(json.dumps({"error": "No tokens found in cache."}))
        return

    client = NotebookLMClient(
        cookies=tokens.cookies, 
        csrf_token=tokens.csrf_token, 
        session_id=tokens.session_id
    )
    
    notebook_id = "a6d31377-ccf1-45ac-8801-afed97f31426"
    target_task_id = "6f4797df-7d2d-42ba-a629-5f2e6ce9fb58" 
    
    try:
        # Poll for status
        for _ in range(15): # Try for ~75 seconds
            # The method name is poll_research, not get_research_status
            results = client.poll_research(notebook_id, target_task_id)
            
            # Check if our task is in the results and completed
            # poll_research returns a dict with 'status' or a list of tasks
            if isinstance(results, dict) and results.get("status") == "no_research":
                sys.stderr.write("No research found yet...\n")
            else:
                # If it's a list or more complex object, let's print it to see
                # based on source code, it returns a dict with status/sources
                # but it might also be a list of tasks if it's still running
                print(json.dumps(results, ensure_ascii=False, indent=2))
                # For now, let's assume if it returns something containing our task, we're good
                # or if it has 'status': 'completed' (need to verify result format)
                return
            
            time.sleep(5)
            
        print(json.dumps({"error": "Polling timed out", "last_results": results}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
