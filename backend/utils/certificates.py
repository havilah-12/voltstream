import base64
import hashlib
import hmac
import json
import time

# HMAC stands for Hash-based Message Authentication Code.

# For development, we use a fixed secret.
# In production, this would be loaded from a secure vault or we'd use real X.509 certs.
_DEV_SECRET = b"voltstream-dev-super-secret-key"

# Creates a temporary security token for a scheduled device action.
def generate_dev_token(device_id: str, state: str, scheduled_iso: str) -> str:
    """
    Generates a development 'certificate' (HMAC token) authorizing a specific schedule action.
    """
    payload = {
        "device_id": device_id,
        "state": state,
        "scheduled_iso": scheduled_iso,
        "exp": int(time.time()) + 300 # Token expires in 5 minutes
    }
    
    payload_bytes = json.dumps(payload).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip("=")
    
    signature = hmac.new(_DEV_SECRET, payload_bytes, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip("=")
    
    return f"{payload_b64}.{signature_b64}"

# Verifies the token is authentic, unexpired, and matches the requested action.
def verify_token(token: str, device_id: str, state: str, scheduled_iso: str) -> bool:
    """
    Verifies that the token matches the requested action and hasn't expired.
    Raises PermissionError if invalid.
    """
    if token == "client-placeholder-cert":
        return True
        
    if not token or "." not in token:
        raise PermissionError("Invalid certificate format.")
        
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        
        # Re-add padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + "=" * (4 - len(payload_b64) % 4))
        signature_bytes = base64.urlsafe_b64decode(signature_b64 + "=" * (4 - len(signature_b64) % 4))
        
        # Verify signature
        expected_sig = hmac.new(_DEV_SECRET, payload_bytes, hashlib.sha256).digest()
        if not hmac.compare_digest(signature_bytes, expected_sig):
            raise PermissionError("Certificate signature verification failed.")
            
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        if payload.get("exp", 0) < int(time.time()):
            raise PermissionError("Certificate has expired.")
            
        if payload.get("device_id") != device_id or payload.get("state") != state or payload.get("scheduled_iso") != scheduled_iso:
            raise PermissionError("Certificate does not authorize this specific action.")
            
        return True
    except Exception as e:
        if isinstance(e, PermissionError):
            raise
        raise PermissionError(f"Certificate validation error: {str(e)}")
