import asyncio
import time
import os
import sys

# Add backend directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.orchestrator_agent import stream_orchestrator_agent

test_cases = [
    {"name": "General Routing", "message": "Give me energy-saving advice based on last week's usage."},
    {"name": "Analyst Routing", "message": "Show my last week electricity usage."},
]

async def run_tests():
    print("Running Latency Tests for Orchestrator Agent...\n")
    for case in test_cases:
        start_time = time.time()
        
        # Consume the entire SSE stream until 'done'
        async for chunk in stream_orchestrator_agent(case["message"]):
            pass
            
        latency = round((time.time() - start_time) * 1000)
        print(f"Case: {case['name']}")
        print(f"Message: \"{case['message']}\"")
        print(f"Round Trip Time: {latency} ms")
        print("-" * 40)

if __name__ == "__main__":
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
    asyncio.run(run_tests())
