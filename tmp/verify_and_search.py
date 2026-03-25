import json
import sys
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
    
    try:
        # Get notebook details to see sources
        notebook = client.get_notebook(notebook_id)
        
        # Also start a new research for more files
        research_result = client.start_research(
            notebook_id=notebook_id,
            query="Minna no Nihongo Lesson N5",
            source="drive",
            mode="fast"
        )
        
        # Extract sources list safely
        sources = []
        if notebook and isinstance(notebook, list) and len(notebook) > 0:
            if isinstance(notebook[0], list) and len(notebook[0]) > 1:
                sources_data = notebook[0][1]
                for s in sources_data:
                    if isinstance(s, list) and len(s) > 1:
                         sources.append(s[1]) # Just titles
        
        print(json.dumps({
            "notebook_sources": sources,
            "new_research_task_id": research_result.get("task_id") if research_result else None
        }, ensure_ascii=False, indent=2))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
