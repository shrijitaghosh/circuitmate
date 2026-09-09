from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserResponse(BaseModel):
    id: int
    fullName: str
    email: EmailStr

class AuthResponse(BaseModel):
    ok: bool
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    ok: bool
    message: str
