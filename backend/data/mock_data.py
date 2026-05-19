mock_db = {
    "dashboard_live": {
        "grid_draw_kw": 2.4,
        "solar_generation_kw": 3.1,
        "net_usage_kw": -0.7
    },
    "analytics_history": {
        "daily": [
            {"label": "Mon", "grid": 12, "solar": 8},
            {"label": "Tue", "grid": 10, "solar": 9},
            {"label": "Wed", "grid": 14, "solar": 7},
            {"label": "Thu", "grid": 11, "solar": 8},
            {"label": "Fri", "grid": 13, "solar": 10},
            {"label": "Sat", "grid": 15, "solar": 12},
            {"label": "Sun", "grid": 9, "solar": 11}
        ],
        "weekly": [
            {"label": "Week 1", "grid": 80, "solar": 55},
            {"label": "Week 2", "grid": 84, "solar": 60},
            {"label": "Week 3", "grid": 75, "solar": 50},
            {"label": "Week 4", "grid": 82, "solar": 58}
        ],
        "monthly": [
            {"label": "Jan", "grid": 320, "solar": 210},
            {"label": "Feb", "grid": 290, "solar": 240},
            {"label": "Mar", "grid": 310, "solar": 260},
            {"label": "Apr", "grid": 305, "solar": 255}
        ]
    },
    "devices": [
        {"id": "ac-1", "type": "AC", "name": "AC 1", "location": "Bedroom 1", "status": "ON", "power_usage_w": 1500},
        {"id": "ac-2", "type": "AC", "name": "AC 2", "location": "Living Room", "status": "OFF", "power_usage_w": 1500},
        {"id": "fan-1", "type": "Fan", "name": "Fan 1", "location": "Bedroom 1", "status": "OFF", "power_usage_w": 50},
        {"id": "fan-2", "type": "Fan", "name": "Fan 2", "location": "Bedroom 2", "status": "ON", "power_usage_w": 50},
        {"id": "fan-3", "type": "Fan", "name": "Fan 3", "location": "Living Room", "status": "OFF", "power_usage_w": 50},
        {"id": "cooler-1", "type": "Cooler", "name": "Cooler 1", "location": "Living Room", "status": "OFF", "power_usage_w": 220},
        {"id": "wm-1", "type": "Washing Machine", "name": "Washing Machine 1", "location": "Utility Area", "status": "ON", "power_usage_w": 500},
        {"id": "fridge-1", "type": "Fridge", "name": "Fridge 1", "location": "Kitchen", "status": "ON", "power_usage_w": 200},
        {"id": "heater-1", "type": "Heater", "name": "Heater 1", "location": "Bedroom 2", "status": "OFF", "power_usage_w": 2000},
        {"id": "water-heater-1", "type": "Water Heater", "name": "Water Heater 1", "location": "Bathroom", "status": "OFF", "power_usage_w": 3000},
        {"id": "light-1", "type": "Light", "name": "Living Room Light", "location": "Living Room", "status": "ON", "power_usage_w": 18},
        {"id": "light-2", "type": "Light", "name": "Bedroom Light", "location": "Bedroom 1", "status": "OFF", "power_usage_w": 18},
        {"id": "bulb-1", "type": "Bulb", "name": "Kitchen Bulb", "location": "Kitchen", "status": "ON", "power_usage_w": 12},
        {"id": "tv-1", "type": "TV", "name": "TV 1", "location": "Living Room", "status": "OFF", "power_usage_w": 120},
        {"id": "laptop-1", "type": "Laptop", "name": "Laptop Charger", "location": "Study", "status": "ON", "power_usage_w": 65},
        {"id": "microwave-1", "type": "Microwave", "name": "Microwave 1", "location": "Kitchen", "status": "OFF", "power_usage_w": 1000},
        {"id": "cooker-1", "type": "Cooker", "name": "Electric Cooker", "location": "Kitchen", "status": "OFF", "power_usage_w": 700}
    ],
    "billing": {
        "current_balance": 1850,
        "projected_bill": 3200,
        "budget_limit": 2500,
        "current_grid_data_usage": 320,
        "solar_energy_usage": 210
    },
    "invoice_history": [
        {"month": "April 2026", "amount": 2450, "status": "Paid", "invoice_number": "INV-1042"},
        {"month": "March 2026", "amount": 2600, "status": "Paid", "invoice_number": "INV-1041"},
        {"month": "February 2026", "amount": 2320, "status": "Paid", "invoice_number": "INV-1040"}
    ]
}
