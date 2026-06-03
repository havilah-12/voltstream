import time
import os
import sys

# Add backend directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from schemas.chat import ChatRequest
from services.chat_service import answer_chat
from services.rag_service import answer_qa

chat_cases = [
    {"name": "Simple Chat Bot (No DB)", "func": answer_chat, "message": "What is electricity?"},
    {"name": "RAG Bot (SQL + ChromaDB Context)", "func": answer_qa, "message": "Based on my dashboard, how can I save money?"},
    {"name": "RAG Bot (PDF Knowledge Only)", "func": answer_qa, "message": "How can I reduce my cooling costs?"},
    {"name": "RAG Bot (Out of Scope / Short-Circuit)", "func": answer_qa, "message": "Who won the super bowl in 2021?"}
]

def run_tests():
    print("Running Latency Tests for Chat and RAG Bots...\n")
    for case in chat_cases:
        req = ChatRequest(question=case["message"])
        start_time = time.time()
        
        # Call the appropriate service function
        res = case["func"](req)
        
        latency = round((time.time() - start_time) * 1000)
        print(f"Case: {case['name']}")
        print(f"Message: \"{case['message']}\"")
        print(f"Round Trip Time: {latency} ms")
        print(f"API Call Used: {res.used_gemini}")
        print("-" * 40)

if __name__ == "__main__":
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
    run_tests()
