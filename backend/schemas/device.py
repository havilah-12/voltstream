from pydantic import BaseModel


class DeviceStatusUpdate(BaseModel):
    status: str


class DevicePayload(BaseModel):
    type: str
    name: str
    location: str = ""
    status: str = "OFF"
    power_usage_w: int = 0
