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
    
    notebook_id = "73b8aa15-3234-41ba-99f0-4465a43d1bbd" # Japanese Lesson 6: Making Plans
    query = """
    Dựa trên tài liệu 'Making Plans and Confirming Information' trong notebook này, hãy soạn 10 câu hội thoại và từ vựng liên quan đến việc hỏi đường, mua vé tàu, xác nhận thông tin (ví dụ: xác nhận giờ tàu, xác nhận đặt phòng khách sạn).
    Mỗi mục cần:
    - Tiếng Nhật (Kanji N5/N4 + Hiragana)
    - Cách đọc (Romaji)
    - Nghĩa tiếng Việt
    Trả về dưới dạng JSON list các object { "japanese": "...", "romaji": "...", "vietnamese": "..." }.
    Chỉ trả về JSON, không thêm nội dung khác.
    """
    
    try:
        result = client.query(
            notebook_id,
            query_text=query
        )
        print(result.get("answer", ""))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
