import os
from fpdf import FPDF

documents = [
    {
        "filename": "solar_energy_basics.pdf",
        "title": "Solar Energy Basics",
        "content": "Solar panels convert sunlight into electricity using photovoltaic cells. The energy generated can be used immediately by your home appliances, or fed back into the grid for credits (net metering). During peak sunlight hours, usually between 10 AM and 2 PM, solar generation is at its highest. A solar surplus occurs when your panels generate more power than your home is currently consuming. Utilizing high-power appliances like washing machines during solar surplus hours maximizes your savings."
    },
    {
        "filename": "smart_grid_optimization.pdf",
        "title": "Smart Grid Optimization",
        "content": "A smart grid uses digital communication technology to detect and react to local changes in usage. VoltStream connects to your smart meter to provide real-time grid draw data. By shifting your energy usage to off-peak hours, you help stabilize the grid and reduce your electricity bill. Peak demand times are typically early evening when families return home. Grid optimization involves automated smart home routines, such as precooling your house in the afternoon before peak rates apply."
    },
    {
        "filename": "home_appliance_efficiency.pdf",
        "title": "Home Appliance Efficiency",
        "content": "Smart appliances can communicate their energy usage in real-time. Heating and cooling systems (like ACs) typically consume the most power in a household. Setting your AC thermostat to 24°C (75°F) instead of 20°C (68°F) can save up to 20% on cooling costs. Standby power, or 'vampire draw', can account for up to 10% of a home's energy use; smart plugs can completely cut off power to idle electronics."
    },
    {
        "filename": "time_of_use_tariffs.pdf",
        "title": "Time-of-Use (TOU) Tariffs",
        "content": "Under a Time-of-Use tariff, the price of electricity changes depending on the time of day. Off-peak rates are the cheapest, usually occurring overnight. Peak rates are the most expensive, often from 4 PM to 9 PM. Mid-peak rates apply during the remaining hours. Knowing your TOU schedule allows you to run heavy loads, such as electric vehicle charging or dishwashers, during off-peak windows, drastically reducing your monthly bill."
    },
    {
        "filename": "battery_storage_solutions.pdf",
        "title": "Battery Storage Solutions",
        "content": "Home battery systems store excess solar energy generated during the day for use at night or during grid outages. A typical lithium-ion home battery has a capacity of around 10 to 13 kWh. When combined with a Time-of-Use tariff, batteries can be charged from the grid during off-peak hours and discharged during peak hours to avoid high costs, a practice known as peak shaving. Batteries also provide energy independence and security during extreme weather events."
    }
]

def generate():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    for doc in documents:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(0, 10, doc["title"], ln=1, align='C')
        pdf.ln(10)
        pdf.set_font("Arial", size=12)
        pdf.multi_cell(0, 10, doc["content"])
        
        filepath = os.path.join(data_dir, doc["filename"])
        pdf.output(filepath)
        print(f"Generated {filepath}")

if __name__ == "__main__":
    generate()
