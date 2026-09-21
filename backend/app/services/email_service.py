import re
import random
import threading
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "yopmail.com", "sharklasers.com", "throwawaymail.com", "dispostable.com",
    "getairmail.com", "fakemailgenerator.com", "trashmail.com",
    "temp-mail.org", "fakeinbox.com", "trashmail.net", "burnermail.io",
    "crazymailing.com", "mytemp.email", "maildrop.cc", "spamgourmet.com",
    "spam4.me", "trashmail.me", "wegwerfmail.de", "tempr.email",
}

# Stricter dummy domains to block
_DUMMY_DOMAINS = {
    "asdf.com", "qwerty.com", "abc.com", "xyz.com", "fake.org",
    "test.com", "example.com", "random.com", "fake.com",
}

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

# In-memory OTP store:  email.lower() -> {code, expires_at, verified}
_otp_store: Dict[str, Dict[str, Any]] = {}
_store_lock = threading.Lock()


def validate_email_deliverability(email: str) -> Tuple[bool, str]:
    """
    Validates email format and blocks disposable / throwaway addresses.
    DNS lookup is intentionally omitted to avoid rejecting valid corporate
    or lesser-known domains in dev/staging environments.
    """
    if not email or not isinstance(email, str):
        return False, "Email address is required."

    email = email.strip().lower()

    if not EMAIL_REGEX.match(email):
        return False, "Invalid email format. Please use a standard address (e.g. name@company.com)."

    parts = email.split("@")
    if len(parts) != 2:
        return False, "Invalid email format."

    user_part, domain_part = parts

    if len(user_part) < 2:
        return False, "Email username is too short."

    domain_segments = domain_part.split(".")
    if len(domain_segments) < 2:
        return False, "Email must have a valid top-level domain (e.g. .com, .org, .in)."

    tld = domain_segments[-1]
    if len(tld) < 2 or not tld.isalpha():
        return False, f"Invalid top-level domain '.{tld}'."

    if domain_part in DISPOSABLE_DOMAINS:
        return (
            False,
            "Temporary or disposable email addresses are not allowed. "
            "Please use a real business or personal email.",
        )

    if domain_part in _DUMMY_DOMAINS:
        return (
            False,
            f"The domain '@{domain_part}' is not accepted. Please enter a valid email address.",
        )

    return True, "Email is valid."


def create_and_send_verification_otp(email: str) -> Tuple[str, str]:
    """
    Generates a 6-digit OTP, stores it with a 10-minute expiry,
    and logs it to the server console (local/dev mode — no SMTP required).
    Returns (code, message).
    """
    email_clean = email.strip().lower()
    is_valid, err_msg = validate_email_deliverability(email_clean)
    if not is_valid:
        raise ValueError(err_msg)

    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    with _store_lock:
        _otp_store[email_clean] = {
            "code": code,
            "expires_at": expires_at,
            "verified": False,
        }

    print(f"\n=======================================================")
    print(f"📧 [EMAIL VERIFICATION CODE]")
    print(f"   Target : {email_clean}")
    print(f"   Code   : {code}")
    print(f"   Valid  : 10 min (expires {expires_at.strftime('%H:%M:%S UTC')})")
    print(f"=======================================================\n")

    return code, f"Verification code sent to {email_clean}."


def verify_email_otp(email: str, code: str) -> Tuple[bool, str]:
    """
    Checks that the submitted 6-digit code matches the stored one and is not expired.
    """
    email_clean = email.strip().lower()
    code_clean  = code.strip()

    with _store_lock:
        entry = _otp_store.get(email_clean)
        if not entry:
            return False, "No verification code was requested for this email. Please click 'Send Code' first."

        if datetime.utcnow() > entry["expires_at"]:
            return False, "The verification code has expired. Please request a new one."

        if entry["code"] != code_clean:
            return False, "Incorrect code. Please check and try again."

        entry["verified"] = True
        return True, "Email verified successfully."


def is_email_verified(email: str) -> bool:
    """Returns True if this email successfully passed OTP verification within the last 30 min."""
    email_clean = email.strip().lower()
    with _store_lock:
        entry = _otp_store.get(email_clean)
        if entry and entry.get("verified") is True:
            if datetime.utcnow() <= entry["expires_at"] + timedelta(minutes=20):
                return True
    return False
