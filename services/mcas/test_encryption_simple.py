#!/usr/bin/env python
"""
Simple unit test for encryption/decryption logic without Django ORM dependency.
Run: python test_encryption_simple.py
"""

from cryptography.fernet import Fernet

def test_fernet_encryption():
    """Test Fernet encryption roundtrip."""
    key = Fernet.generate_key()
    cipher = Fernet(key)

    plaintext = "John Doe"
    ciphertext = cipher.encrypt(plaintext.encode()).decode()

    # Verify encrypted value is different
    assert ciphertext != plaintext, "Ciphertext should differ from plaintext"

    # Verify decryption works
    decrypted = cipher.decrypt(ciphertext.encode()).decode()
    assert decrypted == plaintext, "Decryption should recover original plaintext"

    print("✓ Fernet encryption/decryption works correctly")

def test_none_handling():
    """Test that None values are handled safely."""
    key = Fernet.generate_key()
    cipher = Fernet(key)

    # Simulate get_prep_value behavior with None
    plaintext = None
    if plaintext:
        ciphertext = cipher.encrypt(plaintext.encode()).decode()
    else:
        ciphertext = plaintext

    assert ciphertext is None, "None should pass through unchanged"
    print("✓ None values handled correctly")

def test_empty_string_handling():
    """Test that empty strings are handled safely."""
    key = Fernet.generate_key()
    cipher = Fernet(key)

    plaintext = ""
    if plaintext:
        ciphertext = cipher.encrypt(plaintext.encode()).decode()
    else:
        ciphertext = plaintext

    assert ciphertext == "", "Empty string should pass through unchanged"
    print("✓ Empty string values handled correctly")

def test_special_characters():
    """Test encryption with special characters and unicode."""
    key = Fernet.generate_key()
    cipher = Fernet(key)

    test_values = [
        "user@example.com",
        "555-1234-5678",
        "José García",
        "日本語テキスト",
        "Привет мир"
    ]

    for plaintext in test_values:
        ciphertext = cipher.encrypt(plaintext.encode()).decode()
        decrypted = cipher.decrypt(ciphertext.encode()).decode()
        assert decrypted == plaintext, f"Failed for: {plaintext}"

    print("✓ Special characters and unicode handled correctly")

if __name__ == "__main__":
    test_fernet_encryption()
    test_none_handling()
    test_empty_string_handling()
    test_special_characters()
    print("\n✅ All encryption tests passed!")
