"""
Secure credential storage module
Handles encryption and storage of API keys
"""

import os
from cryptography.fernet import Fernet
from typing import Dict, Optional

class CredentialManager:
    def __init__(self, key_file: str = "../data/.key"):
        """Initialize credential manager with encryption key"""
        self.key_file = key_file
        self.key = self._load_or_create_key()
        self.cipher = Fernet(self.key)
    
    def _load_or_create_key(self) -> bytes:
        """Load existing encryption key or create a new one"""
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(self.key_file), exist_ok=True)
        
        if os.path.exists(self.key_file):
            with open(self.key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()
            with open(self.key_file, 'wb') as f:
                f.write(key)
            # Secure the key file (readable only by owner)
            os.chmod(self.key_file, 0o600)
            print(f"✅ Created new encryption key at {self.key_file}")
            return key
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    def store_credentials(self, creds_file: str, credentials: Dict[str, str]):
        """Store encrypted credentials to a file"""
        os.makedirs(os.path.dirname(creds_file), exist_ok=True)
        
        encrypted_creds = {}
        for key, value in credentials.items():
            encrypted_creds[key] = self.encrypt(value)
        
        # Write encrypted credentials
        with open(creds_file, 'w') as f:
            for key, encrypted_value in encrypted_creds.items():
                f.write(f"{key}={encrypted_value}\n")
        
        # Secure the credentials file
        os.chmod(creds_file, 0o600)
        print(f"✅ Credentials stored securely at {creds_file}")
    
    def load_credentials(self, creds_file: str) -> Dict[str, str]:
        """Load and decrypt credentials from a file"""
        if not os.path.exists(creds_file):
            return {}
        
        credentials = {}
        with open(creds_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line:
                    key, encrypted_value = line.split('=', 1)
                    credentials[key] = self.decrypt(encrypted_value)
        
        return credentials
    
    def get_api_keys_from_env(self) -> Dict[str, str]:
        """Get API keys from environment variables"""
        return {
            'ALPACA_API_KEY': os.getenv('ALPACA_API_KEY', ''),
            'ALPACA_SECRET_KEY': os.getenv('ALPACA_SECRET_KEY', ''),
            'ALPACA_BASE_URL': os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')
        }
    
    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """Validate that required credentials are present"""
        required_keys = ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY']
        for key in required_keys:
            if not credentials.get(key) or credentials[key] == 'your_api_key_here' or credentials[key] == 'your_secret_key_here':
                return False
        return True
