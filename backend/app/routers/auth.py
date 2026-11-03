from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    # 1. Validate password match
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # 2. Check duplicate email
    existing_user = db.query(User).filter(User.email.ilike(request.email.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Disallow public admin registration
    if request.role.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration for Admin role is not permitted."
        )

    # 4. Hash password with bcrypt
    hashed = hash_password(request.password)

    # 5. Create user record
    new_user = User(
        name=request.name.strip(),
        email=request.email.strip().lower(),
        phone=request.phone.strip(),
        password_hash=hashed,
        role=request.role.lower(),
        address=request.address.strip(),
        latitude=float(request.latitude),
        longitude=float(request.longitude),
        vehicle_number=request.vehicle_number.strip() if request.vehicle_number else (f"TN-27-BF-{datetime.datetime.utcnow().strftime('%S%f')[:4]}" if request.role.lower() == "collector" else None),
        vehicle_type=request.vehicle_type.strip() if request.vehicle_type else ("Tata Ace Bio-Carrier" if request.role.lower() == "collector" else None),
        vehicle_capacity_kg=float(request.vehicle_capacity_kg or 250.0) if request.role.lower() == "collector" else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 6. Generate JWT token
    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    email_clean = request.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out. Client token cleared.", "user_id": current_user.id}
