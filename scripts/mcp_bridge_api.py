from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import sys
import json
from typing import Optional, List, Dict, Any

# Ensure we use the .venv site-packages
sys.path.append(r"c:\Users\Pheo\OneDrive\Documents\NetBeansProjects\lex-love-loom\.venv\Lib\site-packages")

from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

app = FastAPI(title="NotebookLM MCP Bridge")

class QueryRequest(BaseModel):
    notebook_id: str
    query: str
    mistake_history: Optional[List[str]] = []

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/query")
async def query_notebook(request: QueryRequest):
    tokens = load_cached_tokens()
    if not tokens:
        raise HTTPException(status_code=401, detail="No NotebookLM tokens found. Please run authenticate first.")
    
    client = NotebookLMClient(
        cookies=tokens.cookies, 
        csrf_token=tokens.csrf_token, 
        session_id=tokens.session_id
    )
    
    # Enhance query with mistake history if provided
    enhanced_query = request.query
    if request.mistake_history:
        mistakes_str = ", ".join(request.mistake_history)
        enhanced_query = f"""
        Nối tiếp bối cảnh trước đó: Người dùng thường hay mắc lỗi ở các phần: {mistakes_str}.
        Hãy chú trọng giải thích kỹ hơn hoặc tạo tình huống lặp lại các kiến thức này.
        
        {request.query}
        """
    
    try:
        result = client.query(
            request.notebook_id,
            query_text=enhanced_query
        )
        return {"answer": result.get("answer", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
