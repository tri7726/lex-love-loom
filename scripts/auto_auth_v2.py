import os
import json
import base64
import sqlite3
import shutil
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from win32crypt import CryptUnprotectData

def get_master_key():
    local_state_path = os.path.join(os.environ["USERPROFILE"],
                                    "AppData", "Local", "Google", "Chrome",
                                    "User Data", "Local State")
    with open(local_state_path, "r", encoding="utf-8") as f:
        local_state = json.load(f)

    master_key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])
    master_key = master_key[5:]  # Remove DPAPI prefix
    master_key = CryptUnprotectData(master_key, None, None, None, 0)[1]
    return master_key

def decrypt_cookie(value, master_key):
    try:
        if value[:3] == b'v10' or value[:3] == b'v11':
            iv = value[3:15]
            payload = value[15:]
            cipher = AESGCM(master_key)
            decrypted_value = cipher.decrypt(iv, payload, None)
            return decrypted_value.decode()
        else:
            # Old DPAPI format
            return CryptUnprotectData(value, None, None, None, 0)[1].decode()
    except Exception as e:
        print(f"Decryption failed for a cookie: {e}")
        return None

def extract_cookies():
    db_path = os.path.join(os.environ["USERPROFILE"],
                           "AppData", "Local", "Google", "Chrome",
                           "User Data", "Default", "Network", "Cookies")
    
    # Fallback to other profiles
    if not os.path.exists(db_path):
         user_data = os.path.join(os.environ["USERPROFILE"], "AppData", "Local", "Google", "Chrome", "User Data")
         for folder in os.listdir(user_data):
             if folder.startswith("Profile") or folder == "Default":
                 temp_path = os.path.join(user_data, folder, "Network", "Cookies")
                 if os.path.exists(temp_path):
                     db_path = temp_path
                     print(f"Found cookies in {folder}")
                     break

    filename = "Cookies_temp"
    shutil.copyfile(db_path, filename)
    
    master_key = get_master_key()
    conn = sqlite3.connect(filename)
    cursor = conn.cursor()
    
    cursor.execute("SELECT host_key, name, value, encrypted_value FROM cookies WHERE host_key LIKE '%google.com%'")
    
    cookies = []
    for host_key, name, value, encrypted_value in cursor.fetchall():
        v = None
        if encrypted_value:
            v = decrypt_cookie(encrypted_value, master_key)
        elif value:
            v = value
            
        if v:
            cookies.append(f"{name}={v}")
    
    conn.close()
    os.remove(filename)
    
    cookie_string = "; ".join(cookies)
    with open("cookies.txt", "w", encoding="utf-8") as f:
        f.write(cookie_string)
    
    print(f"Successfully extracted {len(cookies)} cookies to cookies.txt")

if __name__ == "__main__":
    extract_cookies()
