import json
import sys
from pathlib import Path

# Add the package to sys.path if needed
sys.path.append(r"c:\Users\Pheo\OneDrive\Documents\NetBeansProjects\lex-love-loom\.venv\Lib\site-packages")

from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

def main():
    # Force UTF-8 encoding for script output if printed
    if sys.stdout.encoding != 'utf-8':
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
    
    try:
        notebooks = client.list_notebooks()
        if not notebooks:
            print(json.dumps({"notebooks": []}))
            return
            
        result = []
        for nb in notebooks:
            result.append({
                "id": nb.id,
                "title": nb.title,
                "source_count": nb.source_count,
                "is_owned": nb.is_owned,
                "created_at": nb.created_at,
                "modified_at": nb.modified_at
            })
            
        print(json.dumps({"notebooks": result}, ensure_ascii=False, indent=2))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
