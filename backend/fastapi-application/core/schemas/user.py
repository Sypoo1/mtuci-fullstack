from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    email: str
    password: str
    is_active: bool 

class UserCreate(UserBase):
    model_config = ConfigDict(
        from_attributes=True,
    )


class UserRead(UserBase):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int


class UserUpdate(UserBase):
    model_config = ConfigDict(
        from_attributes=True,
    )
