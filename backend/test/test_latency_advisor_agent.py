import asyncio
import time
import os
import sys

# Add backend directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.advisor_agent import call_advisor_agent

test_cases = [
    {"name": "General Advice", "message": "How can I reduce my cooling costs?"},
    {"name": "Solar Advice", "message": "What advice do you have for maximizing my solar surplus?"},
]

async def run_tests():
    print("Running Latency Tests for Advisor Agent...\n")
    for case in test_cases:
        start_time = time.time()
        
        await call_advisor_agent(case["message"])
            
        latency = round((time.time() - start_time) * 1000)
        print(f"Case: {case['name']}")
        print(f"Message: \"{case['message']}\"")
        print(f"Round Trip Time: {latency} ms")
        print("-" * 40)

if __name__ == "__main__":
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
    asyncio.run(run_tests())
