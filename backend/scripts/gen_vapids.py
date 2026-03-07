import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
private_key = ec.generate_private_key(ec.SECP256R1())
private_numbers = private_key.private_numbers()
public_numbers = private_numbers.public_numbers

x = public_numbers.x.to_bytes(32, byteorder='big')
y = public_numbers.y.to_bytes(32, byteorder='big')
d = private_numbers.private_value.to_bytes(32, byteorder='big')

public_key = base64.urlsafe_b64encode(b'\x04' + x + y).decode('ascii').strip('=')
private_key_str = base64.urlsafe_b64encode(d).decode('ascii').strip('=')

with open('d:/Desktop/SE Project/QuickChat/backend/.env', 'a') as f:
    f.write(f'\nVAPID_PUBLIC_KEY="{public_key}"\n')
    f.write(f'VAPID_PRIVATE_KEY="{private_key_str}"\n')
    f.write('VAPID_CLAIMS_EMAIL="mailto:panchalneel0504@gmail.com"\n')
