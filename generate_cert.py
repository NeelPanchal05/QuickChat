import os
import subprocess
from OpenSSL import crypto
from datetime import datetime, timedelta

def create_self_signed_cert(cert_file="cert.pem", key_file="key.pem"):
    # Create a key pair
    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 2048)

    # Create a self-signed cert
    cert = crypto.X509()
    cert.get_subject().C = "US"
    cert.get_subject().ST = "Local"
    cert.get_subject().L = "Localhost"
    cert.get_subject().O = "QuickChat"
    cert.get_subject().OU = "Development"
    cert.get_subject().CN = "localhost"

    cert.set_serial_number(1000)
    cert.gmtime_adj_notBefore(0)
    # Valid for 365 days
    cert.gmtime_adj_notAfter(365 * 24 * 60 * 60)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha256')

    # Save certificate
    with open(cert_file, "wt") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert).decode('utf-8'))

    # Save private key
    with open(key_file, "wt") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k).decode('utf-8'))

    print(f"Generated self-signed certificates: {cert_file}, {key_file}")
    
if __name__ == "__main__":
    try:
        if not os.path.exists("cert.pem") or not os.path.exists("key.pem"):
            print("Generating new self-signed certificates for local HTTPS development...")
            create_self_signed_cert()
        else:
            print("Certificates already exist.")
    except Exception as e:
        print(f"Error generating certificates: {e}")
        # If pyOpenSSL is missing, fallback or notify user
        print("Please ensure pyOpenSSL is installed: pip install pyOpenSSL")
