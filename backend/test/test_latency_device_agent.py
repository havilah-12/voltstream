import asyncio
import time
import os
import sys

# Add backend directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.device_agent import stream_device_agent

test_cases = [
    {"name": "Immediate Toggle", "message": "Turn on the Living Room AC"},
    {"name": "Already in State (Cached)", "message": "Turn on the Living Room AC"},
    {"name": "Bulk Operations", "message": "Turn off all devices"},
    {"name": "Scheduled Command", "message": "Turn on the fan in 10 minutes"},
    {"name": "Invalid Device (Error Path)", "message": "Turn on the blender"}
]

async def run_tests():
    print("Running Latency Tests for Device Agent...\n")
    for case in test_cases:
        start_time = time.time()
        
        # Consume the entire SSE stream until 'done'
        async for chunk in stream_device_agent(case["message"]):
            pass
            
        latency = round((time.time() - start_time) * 1000)
        print(f"Case: {case['name']}")
        print(f"Message: \"{case['message']}\"")
        print(f"Round Trip Time: {latency} ms")
        print("-" * 40)

if __name__ == "__main__":
    # Ensure Vertex AI environment variable is set
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
    asyncio.run(run_tests())
