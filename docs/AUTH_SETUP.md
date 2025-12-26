# Authentication & Authorization Setup Guide

## Overview
This platform uses JWT (JSON Web Tokens) for authentication and Role-Based Access Control (RBAC) for authorization.

## Environment Variables
Ensure the following variables are set in your `.env` file:
- `SECRET_KEY`: A secure random string for signing JWTs
- `ALGORITHM`: Usually `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token validity period (e.g., 30)

## Authentication Flow
1. **Registration**: POST `/api/v1/auth/register` with user details.
2. **Login**: POST `/api/v1/auth/login` with email and password. Returns `access_token` and `refresh_token`.
3. **Authorized Requests**: Include the `access_token` in the `Authorization` header: `Bearer <token>`.
4. **Token Refresh**: POST `/api/v1/auth/refresh` with the `refresh_token` to get a new `access_token`.

## Authorization (RBAC)
Roles are assigned to users to control access to various endpoints.
Use the `PermissionChecker` dependency in your routes to enforce specific permissions.

Example:
```python
@router.get("/admin-only", dependencies=[Depends(PermissionChecker(["admin:access"]))])
async def admin_only_route():
    return {"message": "Hello Admin"}
```

## Security Best Practices
- Passwords are hashed using `bcrypt`.
- Tokens should be stored securely on the frontend (e.g., in HttpOnly cookies).
- Always use HTTPS in production.
- Rate limiting is recommended on authentication endpoints.
