# ADR-004: Migrate from SHA-256 to bcrypt for Password Hashing

**Status:** ✅ Accepted

**Date:** 2026-02-16

**Deciders:** Tech Lead, Security Team, Backend Team

**Priority:** 🔴 Critical (Security Vulnerability)

---

## Context

### Current Authentication: SHA-256 without Salt

```python
# utils.py:110 and auth_service.py:48
def _hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

# Usage
password_hash = _hash_password("admin123")
# Output: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
```

### Problems with Current Approach:

#### 1. **No Salt → Vulnerable to Rainbow Tables**

**Rainbow Table Attack:**
```
Attacker has pre-computed hashes:
"admin"    → "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
"admin123" → "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
"password" → "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"

If database is compromised:
SELECT username, password_hash FROM users;
| username | password_hash                                                      |
|----------|---------------------------------------------------------------------|
| admin    | 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9  |

Attacker looks up in rainbow table → "admin123" ✅ CRACKED
```

**Time to crack:**
- Rainbow table lookup: **Instant** (milliseconds)
- 100 million common passwords pre-computed

#### 2. **Fast Hashing → Vulnerable to Brute Force**

SHA-256 is **designed to be fast** (for checksums, not passwords).

**Brute Force Attack:**
```python
# Attacker's script
import hashlib

common_passwords = ["123456", "password", "admin123", ...]
stolen_hash = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"

for password in common_passwords:
    if hashlib.sha256(password.encode()).hexdigest() == stolen_hash:
        print(f"Password found: {password}")
        break

# With modern GPU: ~1 billion SHA-256 hashes/second
# Common password list (10 million): Cracked in ~0.01 seconds
```

#### 3. **No Per-User Salt → Same Password = Same Hash**

```sql
SELECT username, password_hash FROM users;

| username | password_hash                                                      |
|----------|---------------------------------------------------------------------|
| alice    | 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8  |
| bob      | 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8  |

# Same hash → Both users have same password "password"
# Crack one → Crack all with same password
```

#### 4. **Code Duplication**

```python
# utils.py:168-186
def authenticate_portal_user(username, password):
    # Implementation with SHA-256

# auth_service.py:106-121
def authenticate_portal_user(username, password):
    # SAME implementation duplicated (DRY violation)
```

#### 5. **No Rate Limiting**

- No protection against brute force login attempts
- Attacker can try unlimited passwords
- No lockout after N failed attempts

---

## Decision

We will migrate from SHA-256 to **bcrypt** for password hashing.

### Why bcrypt?

1. **Built-in Salt**
   - Unique salt generated per password
   - Salt stored in hash (no separate storage)

2. **Slow by Design**
   - Computationally expensive (tunable work factor)
   - Resistant to brute force attacks

3. **Industry Standard**
   - Used by: Django, Ruby on Rails, Spring Security, etc.
   - Audited and battle-tested

4. **Tunable Work Factor**
   - Can increase difficulty over time as hardware improves

### New Implementation:

```python
# app/infrastructure/security/bcrypt_auth_service.py
import bcrypt
from app.domain.ports.i_auth_service import IAuthService

class BcryptAuthService(IAuthService):
    def hash_password(self, raw_password: str) -> str:
        """Hash password with bcrypt (includes random salt)"""
        salt = bcrypt.gensalt(rounds=12)  # Work factor = 12
        hashed = bcrypt.hashpw(raw_password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_password(self, raw_password: str, hashed_password: str) -> bool:
        """Verify password against bcrypt hash"""
        return bcrypt.checkpw(
            raw_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
```

### Usage:

```python
# Hashing
auth_service = BcryptAuthService()
password_hash = auth_service.hash_password("admin123")
# Output: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7Jw8rqGQry"
#          ^^ ^^  ^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#          |  |   |                     |
#          |  |   Salt (22 chars)       Hash (31 chars)
#          |  Work factor (2^12 = 4096 iterations)
#          bcrypt version

# Verifying
is_valid = auth_service.verify_password("admin123", password_hash)
# Output: True
```

---

## Consequences

### ✅ Positive

#### 1. **Protection Against Rainbow Tables**

```python
# Same password → Different hashes (due to random salt)
hash1 = bcrypt.hashpw("admin123", bcrypt.gensalt())
# "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7Jw8rqGQry"

hash2 = bcrypt.hashpw("admin123", bcrypt.gensalt())
# "$2b$12$KQw2b8xpCVWGyjd1MGBjDPZy5UuyNRKriO9/MfxZ6OV8Kx9sqHRsz"

# Rainbow tables useless ✅
```

#### 2. **Protection Against Brute Force**

```python
# SHA-256:  1 billion hashes/sec → 10M passwords in 0.01 sec
# bcrypt:   10,000 hashes/sec   → 10M passwords in 1000 sec (16 min)

# With work factor = 12:
# - 1 password verification: ~100ms (acceptable for login)
# - Brute force: ~100ms per attempt → 10 attempts/sec max

# With rate limiting (5 attempts/min):
# - Attacker needs 33,333 hours (3.8 years) to try 10M passwords
```

#### 3. **Unique Hash per User**

```sql
SELECT username, password_hash FROM users;

| username | password_hash                                                      |
|----------|---------------------------------------------------------------------|
| alice    | $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7Jw8rqGQry      |
| bob      | $2b$12$KQw2b8xpCVWGyjd1MGBjDPZy5UuyNRKriO9/MfxZ6OV8Kx9sqHRsz      |

# Even if both have "password", hashes are different ✅
```

#### 4. **Future-Proof (Tunable Work Factor)**

```python
# 2026: Work factor = 12 (4096 iterations)
# 2030: Hardware 10x faster → Increase to 14 (16384 iterations)
# Just change one parameter:
salt = bcrypt.gensalt(rounds=14)
```

#### 5. **Industry Standard**

- Used by millions of applications
- Well-documented, many libraries
- Security audits and peer review

#### 6. **Clean Architecture Integration**

```python
# Domain Interface (Port)
class IAuthService(ABC):
    @abstractmethod
    def hash_password(self, raw_password: str) -> str:
        pass

    @abstractmethod
    def verify_password(self, raw_password: str, hashed_password: str) -> bool:
        pass

# Infrastructure Implementation (Adapter)
class BcryptAuthService(IAuthService):
    # bcrypt implementation

# Future: Can swap to Argon2 without touching use cases
class Argon2AuthService(IAuthService):
    # Argon2 implementation
```

### ⚠️ Negative

#### 1. **Slower Login (100ms vs. <1ms)**

- SHA-256: <1ms per verification
- bcrypt: ~100ms per verification (with work factor 12)

**Mitigation:**
- 100ms is acceptable for login (user won't notice)
- Prevents brute force (security > speed)

#### 2. **Migration Complexity**

- Cannot "decrypt" old SHA-256 hashes
- Must migrate users on next login

**Migration Strategy:**
```python
def authenticate_user(username: str, password: str):
    user = user_repo.find_by_username(username)

    # Check if old SHA-256 hash (legacy)
    if user.password_hash.startswith("$2b$"):
        # bcrypt hash
        is_valid = bcrypt_auth.verify_password(password, user.password_hash)
    else:
        # Legacy SHA-256 hash
        sha_hash = hashlib.sha256(password.encode()).hexdigest()
        is_valid = (sha_hash == user.password_hash)

        if is_valid:
            # Migrate to bcrypt
            new_hash = bcrypt_auth.hash_password(password)
            user.password_hash = new_hash
            user_repo.update(user)

    return is_valid
```

#### 3. **Dependency Added**

- Must add `bcrypt` to `requirements.txt`
- Small increase in Docker image size (~500KB)

**Mitigation:**
- Minimal cost for significant security improvement

---

## Implementation Plan

### Phase 1: Infrastructure (Week 3)

1. Add bcrypt dependency:
   ```bash
   pip install bcrypt
   echo "bcrypt==4.1.2" >> requirements.txt
   ```

2. Create `IAuthService` interface:
   ```python
   # app/domain/ports/i_auth_service.py
   class IAuthService(ABC):
       @abstractmethod
       def hash_password(self, raw_password: str) -> str: pass

       @abstractmethod
       def verify_password(self, raw_password: str, hashed_password: str) -> bool: pass
   ```

3. Implement `BcryptAuthService`:
   ```python
   # app/infrastructure/security/bcrypt_auth_service.py
   class BcryptAuthService(IAuthService):
       def hash_password(self, raw_password: str) -> str:
           salt = bcrypt.gensalt(rounds=12)
           return bcrypt.hashpw(password.encode(), salt).decode()

       def verify_password(self, raw_password: str, hashed_password: str) -> bool:
           return bcrypt.checkpw(password.encode(), hashed_password.encode())
   ```

### Phase 2: Migration Logic (Week 3)

1. Update `AuthenticateUserUseCase` to support both SHA-256 (legacy) and bcrypt:
   ```python
   def execute(self, username: str, password: str) -> AuthResult:
       user = self.user_repo.find_by_username(username)

       # Detect hash type
       if user.password_hash.startswith("$2b$"):
           is_valid = self.auth_service.verify_password(password, user.password_hash)
       else:
           # Legacy SHA-256
           is_valid = self._verify_legacy(password, user.password_hash)
           if is_valid:
               # Migrate to bcrypt
               user.password_hash = self.auth_service.hash_password(password)
               self.user_repo.update(user)

       if not is_valid:
           raise AuthenticationError()

       return AuthResult(...)
   ```

2. Add migration script for admin users (optional):
   ```python
   # scripts/migrate_passwords.py
   # Force admin to reset password on next login
   admin = user_repo.find_by_username("admin")
   admin.must_reset_password = True
   user_repo.update(admin)
   ```

### Phase 3: Add Rate Limiting (Week 4)

1. Implement rate limiter using Redis:
   ```python
   # app/infrastructure/security/redis_rate_limiter.py
   class RedisRateLimiter:
       def check_rate_limit(self, identifier: str, max_attempts: int, window_seconds: int) -> bool:
           key = f"rate_limit:{identifier}"
           current = self.redis.incr(key)
           if current == 1:
               self.redis.expire(key, window_seconds)
           return current <= max_attempts
   ```

2. Integrate with login endpoint:
   ```python
   @app.route("/api/auth/login", methods=["POST"])
   def login():
       username = request.json["username"]

       # Rate limit: 5 attempts per 5 minutes
       if not rate_limiter.check_rate_limit(username, max_attempts=5, window_seconds=300):
           return jsonify({"error": "Too many attempts"}), 429

       # Authenticate
       use_case = container.authenticate_user()
       result = use_case.execute(username, password)
       return jsonify(result)
   ```

### Phase 4: Testing (Week 4)

1. Unit tests:
   ```python
   def test_bcrypt_hash_generates_different_salts():
       service = BcryptAuthService()
       hash1 = service.hash_password("password")
       hash2 = service.hash_password("password")
       assert hash1 != hash2

   def test_bcrypt_verify_correct_password():
       service = BcryptAuthService()
       hash = service.hash_password("password")
       assert service.verify_password("password", hash) is True

   def test_bcrypt_verify_incorrect_password():
       service = BcryptAuthService()
       hash = service.hash_password("password")
       assert service.verify_password("wrong", hash) is False
   ```

2. Integration tests:
   ```python
   def test_migrate_legacy_sha256_to_bcrypt():
       # Create user with SHA-256 hash
       user = User(username="test", password_hash="sha256hash...")
       user_repo.create(user)

       # Login (triggers migration)
       result = authenticate_use_case.execute("test", "password")

       # Verify migrated to bcrypt
       user = user_repo.find_by_username("test")
       assert user.password_hash.startswith("$2b$")
   ```

### Phase 5: Deployment (Week 5)

1. Deploy to staging, test with 10 users
2. Monitor login latency (should be ~100ms)
3. Deploy to production
4. Monitor for 1 week

### Phase 6: Deprecation (Week 6)

1. After all users migrated (no SHA-256 hashes left), remove legacy code
2. Update database schema to enforce bcrypt format (optional)

---

## Alternatives Considered

### 1. **Keep SHA-256 with Manual Salt**
```python
def hash_password(password: str) -> str:
    salt = os.urandom(32)
    hash = hashlib.sha256(salt + password.encode()).hexdigest()
    return f"{salt.hex()}:{hash}"
```
- **Pros:** Fixes rainbow table issue, no new dependency
- **Cons:** Still fast (vulnerable to brute force), not industry standard
- **Verdict:** ❌ Rejected - Insufficient security

### 2. **Argon2** (Newer Algorithm)
- **Pros:** More resistant to GPU/ASIC attacks, winner of Password Hashing Competition 2015
- **Cons:** Less mature ecosystem, fewer libraries
- **Verdict:** ⚠️ Considered for future - bcrypt sufficient for now

### 3. **scrypt**
- **Pros:** Memory-hard (resistant to hardware attacks)
- **Cons:** Less common than bcrypt, more complex configuration
- **Verdict:** ❌ Rejected - bcrypt is simpler and sufficient

### 4. **PBKDF2** (Used by Django)
- **Pros:** NIST standard, widely supported
- **Cons:** Slower than bcrypt for same security, less common
- **Verdict:** ❌ Rejected - bcrypt more efficient

### 5. **bcrypt** ✅
- **Pros:** Industry standard, battle-tested, easy to use, tunable
- **Cons:** Slower than SHA-256 (not a real con for passwords)
- **Verdict:** ✅ **ACCEPTED**

---

## Success Metrics

| Metric | Before (SHA-256) | After (bcrypt) | How to Measure |
|--------|------------------|----------------|----------------|
| **Vulnerability to rainbow tables** | 🔴 High | ✅ None | Security audit |
| **Brute force resistance** | 🔴 Low (1B/s) | ✅ High (10/s) | Benchmark |
| **Unique hashes** | ❌ Same password = same hash | ✅ Different | Check DB |
| **Login latency** | <1ms | ~100ms | Monitor |
| **Rate limiting** | ❌ None | ✅ 5 attempts/5min | Test |
| **Users migrated** | 0% | 100% | DB query |

---

## Security Audit

After implementation, we will run:

```bash
# Check for SHA-256 hashes (should be 0)
SELECT COUNT(*) FROM users WHERE password_hash NOT LIKE '$2b$%';

# Bandit security scan
bandit -r app/

# OWASP dependency check
safety check
```

---

## Related ADRs

- [ADR-001: Hexagonal Architecture](./001_hexagonal_architecture.md) - Defines `IAuthService` interface

---

## References

- [bcrypt Wikipedia](https://en.wikipedia.org/wiki/Bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [How To Safely Store A Password](https://codahale.com/how-to-safely-store-a-password/)

---

**Last Updated:** 2026-02-16
