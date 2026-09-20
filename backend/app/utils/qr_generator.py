import io
import base64
import json
import qrcode
from typing import Union, Dict, Any

def generate_qr_code_base64(data: Union[str, Dict[Any, Any]]) -> str:
    """
    Generates a high-contrast PNG QR Code as a Base64 Data URI string.
    Suitable for rendering directly in <img> tags in frontend.
    """
    if isinstance(data, dict):
        payload_text = json.dumps(data, separators=(",", ":"))
    else:
        payload_text = str(data)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(payload_text)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#090d16", back_color="#ffffff")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_b64}"
