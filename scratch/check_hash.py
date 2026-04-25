import hashlib
def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
print(_hash_password("Test1234."))
