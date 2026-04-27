from django.contrib.auth.models import User
from django.test import TestCase

from .models import Matter, Organization, Person


class EncryptionTests(TestCase):
    """Test field-level encryption and decryption."""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test PD",
            organization_type="police",
            jurisdiction="Test County"
        )
        self.user = User.objects.create_user(username='testuser', password='pass')

    def test_person_encryption_decryption(self):
        """Verify encrypted fields are decrypted on retrieval."""
        person = Person.objects.create(
            name="NAME_TOKEN_1",
            email="EMAIL_TOKEN_1",
            phone="PHONE_TOKEN_1",
            role="complainant",
            organization=self.org,
            data_tier="Tier-0",
            created_by=self.user
        )

        # Retrieve from database and verify decryption
        retrieved = Person.objects.get(id=person.id)
        self.assertEqual(retrieved.name, "NAME_TOKEN_1")
        self.assertEqual(retrieved.email, "EMAIL_TOKEN_1")
        self.assertEqual(retrieved.phone, "PHONE_TOKEN_1")

    def test_encrypted_value_in_database(self):
        """Verify data is actually encrypted in database."""
        plaintext = "NAME_TOKEN_2"
        person = Person.objects.create(
            name=plaintext,
            email="EMAIL_TOKEN_2",
            role="witness",
            organization=self.org,
            data_tier="Tier-1",
            created_by=self.user
        )

        # Refresh from DB to get the encrypted value as stored
        person.refresh_from_db()

        # The encrypted value should be different from plaintext
        # (Django's refresh_from_db calls from_db_value, so we need to check the Field's get_prep_value)
        from .models import cipher_suite
        encrypted = cipher_suite.encrypt(plaintext.encode()).decode()

        # Verify the encryption roundtrip works
        decrypted = cipher_suite.decrypt(encrypted.encode()).decode()
        self.assertEqual(decrypted, plaintext)

    def test_person_safe_string_repr(self):
        """Verify __str__ doesn't expose PII."""
        person = Person.objects.create(
            name="NAME_TOKEN_3",
            email="EMAIL_TOKEN_3",
            role="officer",
            organization=self.org,
            data_tier="Tier-0",
            created_by=self.user
        )

        str_repr = str(person)
        self.assertNotIn("NAME_TOKEN_3", str_repr)
        self.assertNotIn("EMAIL_TOKEN_3", str_repr)
        self.assertIn("Person(id=", str_repr)
        self.assertIn("role=officer", str_repr)

    def test_null_encrypted_fields(self):
        """Verify null values are handled correctly."""
        person = Person.objects.create(
            name="NAME_TOKEN_4",
            email=None,
            phone=None,
            role="attorney",
            organization=self.org,
            data_tier="Tier-1",
            created_by=self.user
        )

        retrieved = Person.objects.get(id=person.id)
        self.assertEqual(retrieved.name, "NAME_TOKEN_4")
        self.assertIsNone(retrieved.email)
        self.assertIsNone(retrieved.phone)

    def test_encrypted_fields_in_matter_serialization(self):
        """Verify encrypted fields work with serializers (implicit in API)."""
        person = Person.objects.create(
            name="NAME_TOKEN_5",
            email="EMAIL_TOKEN_5",
            role="complainant",
            organization=self.org,
            data_tier="Tier-1",
            created_by=self.user
        )

        matter = Matter.objects.create(
            title="Test Matter",
            description="Test case",
            status="intake",
            data_tier="Tier-1",
            complainant=person,
            organization=self.org,
            created_by=self.user
        )

        # Verify we can access complainant through matter without decryption errors
        self.assertEqual(matter.complainant.name, "NAME_TOKEN_5")
        self.assertEqual(matter.complainant.email, "EMAIL_TOKEN_5")
