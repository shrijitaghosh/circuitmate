from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import User
from .schemas import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    AuthResponse,
    MessageResponse,
)
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_user_id,
    bearer,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Create authentication tables
Base.metadata.create_all(bind=engine)


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        fullName=user.full_name,
        email=user.email,
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    existing = db.query(User).filter(User.email == email).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    user = User(
        full_name=payload.fullName.strip(),
        email=email,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)

    return AuthResponse(
        ok=True,
        message="Account created successfully",
        access_token=token,
        user=user_response(user),
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id)

    return AuthResponse(
        ok=True,
        message="Authentication successful",
        access_token=token,
        user=user_response(user),
    )


@router.get("/me", response_model=UserResponse)
def me(
    credentials=Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(credentials)

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user_response(user)


@router.post("/logout", response_model=MessageResponse)
def logout():
    # JWT is stateless.
    # Frontend removes the token.
    return MessageResponse(
        ok=True,
        message="Logged out",
    )