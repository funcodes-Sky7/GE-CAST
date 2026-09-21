from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime

# ─── Shared ─────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ─── Admin Registration (internal) ──────────────────────────────────────────

class UserCreate(UserBase):
    password: str

# ─── Advertiser Registration ─────────────────────────────────────────────────

class AdvertiserRegisterRequest(BaseModel):
    full_name: str
    company_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "AdvertiserRegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self

# ─── Email Verification (Advertiser Registration) ───────────────────────────

class SendVerificationCodeRequest(BaseModel):
    email: EmailStr

class SendVerificationCodeResponse(BaseModel):
    message: str
    dev_code: str = ""  # OTP shown in UI because no SMTP is configured in dev mode

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class VerifyCodeResponse(BaseModel):
    message: str
    verified: bool

# ─── Forgot Password ─────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
