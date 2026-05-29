import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import asyncio
from services.multi_agent import call_advisor_agent, call_analyst_agent
import time

async def main():
    print("Testing call_analyst_agent...")
    start = time.time()
    res = await call_analyst_agent("What was the peak grid usage last week?")
    print(f"Result: {res}")
    print(f"Analyst took: {time.time() - start:.2f} seconds\n")

    print("Testing call_advisor_agent...")
    start = time.time()
    res = await call_advisor_agent("How can I reduce my AC usage?")
    print(f"Result: {res}")
    print(f"Advisor took: {time.time() - start:.2f} seconds\n")

if __name__ == '__main__':
    asyncio.run(main())
