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
    target_task_id = "cfa0d46b-e6ef-4cd6-b0ef-5059158143fa" 
    
    try:
        # Poll for status
        for _ in range(15): # Try for ~75 seconds
            results = client.poll_research(notebook_id, target_task_id)
            
            if isinstance(results, dict) and results.get("status") == "completed":
                print(json.dumps(results, ensure_ascii=False, indent=2))
                return
            elif isinstance(results, dict) and results.get("status") == "no_research":
                sys.stderr.write("No research found yet...\n")
            else:
                sys.stderr.write(f"Status: {results.get('status')}...\n")
            
            time.sleep(5)
            
        print(json.dumps({"error": "Polling timed out", "last_results": results}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
