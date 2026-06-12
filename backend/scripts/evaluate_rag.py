import asyncio
import os
import json
from google import genai
from agents.advisor_agent import call_advisor_agent
from services.chroma_service import retrieve_chroma_chunks
from config import get_settings
from prompts import JUDGE_PROMPT

settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
client = genai.Client(http_options={'timeout': 10000})
model_name = settings.gemini_model.removeprefix("models/")

test_cases = [
    {"question": "What advice do you have for maximizing my solar surplus?", "expected": "Run high-power appliances between 10 AM and 2 PM."},
    {"question": "How can I optimize my smart grid usage?", "expected": "Shift energy usage to off-peak hours and precool the house."},
    {"question": "What are some tips for home appliance efficiency?", "expected": "Set AC to 24C/75F and use smart plugs to stop vampire draw."},
    {"question": "How can I take advantage of Time-of-Use tariffs?", "expected": "Run heavy loads overnight during off-peak windows."},
    {"question": "What are the best practices for using home battery storage?", "expected": "Charge off-peak and discharge during peak hours."},
    {"question": "How can I reduce my cooling costs?", "expected": "Set thermostat to 24C (75F) instead of 20C."},
    {"question": "What should I do about vampire draw?", "expected": "Use smart plugs to cut off power to idle electronics."},
    {"question": "When is the best time to run a dishwasher to save money?", "expected": "Overnight during off-peak rates."},
    {"question": "How can I achieve peak shaving with my home battery?", "expected": "Charge from the grid during off-peak hours and discharge during peak hours."},
    {"question": "How can I help stabilize the grid during peak demand times?", "expected": "Shift energy usage like EV charging to off-peak hours."}
]

async def evaluate():
    print("Starting RAG Evaluation...")
    passed = 0
    total = len(test_cases)
    
    for i, test in enumerate(test_cases):
        print(f"\nEvaluating Q{i+1}: {test['question']}")
        
        # Prevent 429 Rate Limit Exhaustion
        await asyncio.sleep(5)
        
        # 1. Retrieve the context that the agent would see
        chunks = retrieve_chroma_chunks(test['question'])
        context = "\n".join(chunks) if chunks else "No context retrieved."
        
        # 2. Invoke the agent
        agent_answer_raw = await call_advisor_agent(test['question'])
        try:
            agent_answer = json.loads(agent_answer_raw)["answer"]
        except (json.JSONDecodeError, TypeError):
            agent_answer = agent_answer_raw
        
        print(f"Agent Answer: {agent_answer}")
        
        # 3. LLM as a judge
        prompt = JUDGE_PROMPT.format(
            question=test['question'],
            context=context,
            answer=agent_answer
        )
        
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            # clean json
            result_text = response.text.replace("```json", "").replace("```", "").strip()
            score = json.loads(result_text)
            
            f_score = score.get("faithfulness", 0)
            r_score = score.get("relevance", 0)
            
            print(f"Faithfulness: {f_score}, Relevance: {r_score}")
            if f_score == 1 and r_score == 1:
                passed += 1
                print("-> PASS")
            else:
                print("-> FAIL")
                
        except Exception as e:
            print(f"Error evaluating Q{i+1}: {e}")
            print("-> FAIL (Error)")
            
    print("\n" + "="*40)
    print(f"EVALUATION COMPLETE: {passed}/{total} passed.")
    if passed >= 7:
        print("RESULT: SUCCESS (>= 7/10 pass rate)")
    else:
        print("RESULT: FAILED (< 7/10 pass rate)")

if __name__ == "__main__":
    asyncio.run(evaluate())
