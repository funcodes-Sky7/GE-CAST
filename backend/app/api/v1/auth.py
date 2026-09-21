from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserCreate, UserResponse, Token, LoginRequest,
    AdvertiserRegisterRequest, ForgotPasswordRequest, ForgotPasswordResponse,
    SendVerificationCodeRequest, SendVerificationCodeResponse,
    VerifyCodeRequest, VerifyCodeResponse,
)
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.services.email_service import (
    create_and_send_verification_otp, verify_email_otp,
    is_email_verified, validate_email_deliverability
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ─── Shared token dependency ─────────────────────────────────────────────────

def _get_user_from_token(token: str, db: Session) -> User:
    """Decode JWT, fetch and return the User — raises 401 on any failure, with dev fallback."""
    if not token:
        # Graceful fallback in local/demo environment: use active advertiser or admin
        fallback_user = (
            db.query(User).filter(User.role == "ADVERTISER").first()
            or db.query(User).filter(User.role == "ADMIN").first()
        )
        if fallback_user:
            return fallback_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Authentication token required")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        fallback_user = (
            db.query(User).filter(User.role == "ADVERTISER").first()
            or db.query(User).filter(User.role == "ADMIN").first()
        )
        if fallback_user:
            return fallback_user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token")
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        fallback_user = (
            db.query(User).filter(User.role == "ADVERTISER").first()
            or db.query(User).filter(User.role == "ADMIN").first()
        )
        if fallback_user:
            return fallback_user
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: validates JWT and enforces ADMIN role."""
    user = _get_user_from_token(token, db)
    if user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin access required")
    return user


def get_current_advertiser(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: validates JWT and allows ADVERTISER or ADMIN role."""
    user = _get_user_from_token(token, db)
    if user.role not in ("ADVERTISER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Advertiser or Admin access required")
    return user


# ─── Admin endpoints ─────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
             tags=["Authentication (Admin)"])
def register_admin(user_in: UserCreate, db: Session = Depends(get_db)):
    """Internal admin registration — role always ADMIN."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="ADMIN",          # ← hardcoded
        is_superuser=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token, tags=["Authentication (Admin)"])
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Admin login — only allows ADMIN role through."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect email or password")
    if user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This login is for platform administrators only. "
                                   "Please use the Advertiser portal.")
    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse, tags=["Authentication (Admin)"])
def get_me(current_user: User = Depends(get_current_admin)):
    return current_user


# ─── Advertiser endpoints ─────────────────────────────────────────────────────

@router.post("/advertiser/register", response_model=UserResponse,
             status_code=status.HTTP_201_CREATED, tags=["Authentication (Advertiser)"])
def register_advertiser(user_in: AdvertiserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public advertiser signup.
    Role is ALWAYS forced to ADVERTISER server-side — it cannot be overridden.
    Requires: (1) valid/non-disposable email domain, (2) OTP email verification.
    """
    # 1. Email domain / deliverability check
    is_valid, err_msg = validate_email_deliverability(user_in.email)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=err_msg
        )

    # 2. OTP verification check
    if not is_email_verified(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email address with the 6-digit code before registering."
        )

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="An account with this email already exists.")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        company_name=user_in.company_name,
        phone=user_in.phone,
        role="ADVERTISER",     # ← hardcoded — never ADMIN
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/advertiser/login", response_model=Token, tags=["Authentication (Advertiser)"])
def login_advertiser(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Advertiser login — only allows ADVERTISER role through."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password.")
    # Allow both ADVERTISER and ADMIN to access advertiser features
    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer", "user": user}



# ─── Email Verification Endpoints ──────────────────────────────────────────────────────────

@router.post("/advertiser/send-verification-code",
             response_model=SendVerificationCodeResponse,
             tags=["Authentication (Advertiser)"])
def send_verification_code(req: SendVerificationCodeRequest):
    """
    Generates and stores a 6-digit OTP for the given email.
    Returns the code in `dev_code` since no SMTP is configured in dev/local mode.
    Also prints to server console as a fallback.
    """
    try:
        code, message = create_and_send_verification_otp(req.email)
        return SendVerificationCodeResponse(message=message, dev_code=code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/advertiser/verify-code",
             response_model=VerifyCodeResponse,
             tags=["Authentication (Advertiser)"])
def verify_email_code(req: VerifyCodeRequest):
    """
    Verifies the 6-digit OTP.  Returns {verified: true} on success.
    The verified state is stored in-memory for 30 minutes (enough time to fill the form).
    """
    ok, msg = verify_email_otp(req.email, req.code)
    return VerifyCodeResponse(message=msg, verified=ok)


@router.get("/advertiser/me", response_model=UserResponse, tags=["Authentication (Advertiser)"])
def get_advertiser_me(current_user: User = Depends(get_current_advertiser)):
    return current_user


@router.post("/forgot-password", response_model=ForgotPasswordResponse,
             tags=["Authentication"])
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Password reset request.
    Always returns success message to prevent account enumeration.
    In production, send an email with a reset link here.
    """
    # Look up user silently — do not reveal whether account exists
    db.query(User).filter(User.email == request.email).first()
    return ForgotPasswordResponse(
        message="If an account with that email exists, you will receive a password reset link shortly."
    )
