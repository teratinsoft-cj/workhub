# PostgreSQL Enum Query Fix

## Issue

When querying PostgreSQL enum columns using SQLAlchemy enum objects, you may encounter:

```
psycopg2.errors.InvalidTextRepresentation: invalid input value for enum userrole: "SUPER_ADMIN"
```

This happens because SQLAlchemy uses the enum **name** (`SUPER_ADMIN`) instead of the enum **value** (`super_admin`) when querying.

## Root Cause

PostgreSQL enum types store the **values** (e.g., `'super_admin'`), but SQLAlchemy sometimes uses the enum **name** (e.g., `SUPER_ADMIN`) in queries when the enum is not properly configured.

## Solution

### For Queries

Use the enum **value string** directly instead of the enum object:

```python
# ❌ Wrong - uses enum name
existing_user = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()

# ✅ Correct - uses enum value
existing_user = db.query(User).filter(User.role == "super_admin").first()
```

### For Inserts/Updates

Using the enum object is fine for inserts and updates:

```python
# ✅ This works correctly
user = User(
    role=UserRole.SUPER_ADMIN,  # SQLAlchemy converts to "super_admin"
    ...
)
```

## Enum Values Reference

| Enum Name | Enum Value (Database) |
|----------|---------------------|
| `UserRole.SUPER_ADMIN` | `"super_admin"` |
| `UserRole.PROJECT_LEAD` | `"project_lead"` |
| `UserRole.PROJECT_OWNER` | `"project_owner"` |
| `UserRole.DEVELOPER` | `"developer"` |
| `TimesheetStatus.PENDING` | `"pending"` |
| `TimesheetStatus.APPROVED` | `"approved"` |
| `TimesheetStatus.REJECTED` | `"rejected"` |
| `PaymentStatus.PENDING` | `"pending"` |
| `PaymentStatus.PAID` | `"paid"` |
| `PaymentStatus.PARTIAL` | `"partial"` |
| `ProjectStatus.OPEN` | `"open"` |
| `ProjectStatus.ACTIVE` | `"active"` |
| `ProjectStatus.HOLD` | `"hold"` |
| `ProjectStatus.CLOSED` | `"closed"` |

## Alternative: Use Enum Value Property

You can also use the enum's `.value` property:

```python
# This also works
existing_user = db.query(User).filter(User.role == UserRole.SUPER_ADMIN.value).first()
```

However, using the string directly is more explicit and avoids potential issues.

## Files Updated

- `backend/create_admin.py` - Updated query to use string value

## Related

- [Enum Fix Instructions](./enum-fix-instructions.md)
- [Migration Fix Summary](./migration-fix-summary.md)

