import asyncio
from google import genai
from google.genai.types import GenerateContentConfig

client = genai.Client(http_options={'timeout': 10000})
prompt = '\"What is the difference between kW and kWh?\" \"Explain how a smart grid works in simple terms.\"'

for max_tokens in [300, 2000]:
    print(f"--- max_output_tokens={max_tokens} ---")
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt,
        config=GenerateContentConfig(max_output_tokens=max_tokens),
    )
    print(repr(response.text))
