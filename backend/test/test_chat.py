
from schemas.chat import ChatRequest
from services.chat_service import answer_chat

for _ in range(3):
    res = answer_chat(ChatRequest(question='"What is the difference between kW and kWh?" "Explain how a smart grid works in simple terms."'))
    print("---")
    print(res)
