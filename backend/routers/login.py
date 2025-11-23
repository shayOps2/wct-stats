from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from models import User, UserRole
from crud import get_user_by_username, add_user  
import jwt
import os
import re
from database import get_db
import logging

if os.environ.get("ENV", "development") == "development":
    from dotenv import load_dotenv
    load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login/token")

# Add logger setup at the top (if not already present)
logger = logging.getLogger("jwt")
logging.basicConfig(level=logging.INFO)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def authenticate_user(username: str, password: str, db):
    user = await get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_db)
):
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "team_id": user.team_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register")
async def register_user(
    username: str = Body(...),
    password: str = Body(...),
    role: UserRole = Body(UserRole.user),
    db = Depends(get_db)
):
    # Password strength check
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters and contain both letters and numbers.")
    existing = await get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(password)
    user = User(username=username, hashed_password=hashed_password, role=role, created_at=datetime.now())
    await add_user(db, user)
    return {"msg": "User created", "username": username}

# Dependency to get current user from token
def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.info(f"Validating JWT token: {token[:30]}...")  # Log the start of validation (truncate for safety)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        team_id: str = payload.get("team_id")
        logger.info(f"JWT payload: username={username}, role={role}, team_id={team_id}")
        if username is None or role is None:
            logger.warning("JWT token missing username or role")
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role, "team_id": team_id}
    except jwt.PyJWTError as e:
        logger.error(f"JWT validation failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/")
def user_login(current_user: dict = Depends(get_current_user)):
    """
    Returns the current logged-in user's info if the token is valid.
    """
    return current_user