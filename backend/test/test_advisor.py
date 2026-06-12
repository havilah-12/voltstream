import asyncio
from backend.agents.advisor_agent import call_advisor_agent
import sys

async def main():
    try:
        res = await call_advisor_agent("How do I save energy?")
        print("RESULT:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
