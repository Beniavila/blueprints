# ADR-001: Adopt Hexagonal Architecture (Ports & Adapters)

**Status:** ✅ Accepted

**Date:** 2026-02-16

**Deciders:** Tech Lead, Backend Team

---

## Context

The current Hansō backend suffers from several architectural problems:

1. **God Objects:** `routes.py` (1229 lines) and `utils.py` (696 lines) violate Single Responsibility Principle
2. **Tight Coupling:** Direct coupling to SQLite makes database migration extremely expensive (~40 hours)
3. **Untestable:** Business logic mixed with Flask routes makes unit testing difficult
4. **Code Duplication:** Same logic repeated in multiple places (e.g., authentication in both `utils.py` and `auth_service.py`)
5. **No Clear Boundaries:** Infrastructure concerns (DB, SSH, external APIs) mixed with business logic

### Current Architecture Problems:
```python
# routes.py (current)
@app.route("/api/gateways/<gateway_id>")
def get_gateway(gateway_id):
    conn = sqlite3.connect(DB_PATH)  # ❌ Direct SQLite coupling
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM gateways WHERE id = ?", (gateway_id,)).fetchone()

    if not row:
        return jsonify({"error": "Not found"}), 404

    # ❌ Business logic mixed with infrastructure
    ssh_client = paramiko.SSHClient()
    ssh_client.connect(...)

    return jsonify({...})
```

**Pain Points:**
- Cannot swap SQLite for PostgreSQL without touching every endpoint
- Cannot test business logic without actual database
- Cannot mock SSH connections for testing
- Business rules are scattered across route handlers

---

## Decision

We will adopt **Hexagonal Architecture** (also known as Ports & Adapters or Clean Architecture) to separate business logic from infrastructure concerns.

### Key Principles:

1. **Domain at the Center:** Business logic (Use Cases, Entities) has no dependencies on frameworks or external systems

2. **Dependency Inversion:** Domain defines interfaces (Ports), Infrastructure implements them (Adapters)

3. **Clear Layers:**
   - **Domain Layer:** Entities, Use Cases, Repository Interfaces (Ports)
   - **Application Layer:** Controllers, API handlers (depends on Domain)
   - **Infrastructure Layer:** Database implementations, WebSocket, External APIs (depends on Domain interfaces)

4. **Dependency Direction:** Always points inward → Domain never depends on Infrastructure

### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────┐
│              External World (Web, Mobile)               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   Controllers (Flask)      │
         │   (Adapters - Inbound)     │
         └────────────┬───────────────┘
                      │ calls
                      ▼
         ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
         ┃     DOMAIN LAYER          ┃
         ┃   (Business Logic)        ┃
         ┃                           ┃
         ┃  ┌──────────────────┐     ┃
         ┃  │   Use Cases      │     ┃
         ┃  │   (Business      │     ┃
         ┃  │    Rules)        │     ┃
         ┃  └────────┬─────────┘     ┃
         ┃           │ uses          ┃
         ┃           ▼               ┃
         ┃  ┌──────────────────┐     ┃
         ┃  │   Entities       │     ┃
         ┃  │   (Domain        │     ┃
         ┃  │    Models)       │     ┃
         ┃  └──────────────────┘     ┃
         ┃           │ defines       ┃
         ┃           ▼               ┃
         ┃  ┌──────────────────┐     ┃
         ┃  │   Interfaces     │     ┃
         ┃  │   (Ports)        │     ┃
         ┃  │ • IRepository    │     ┃
         ┃  │ • IRemoteAccess  │     ┃
         ┃  └──────────────────┘     ┃
         ┗━━━━━━━━━━┯━━━━━━━━━━━━━━━┛
                    │ implemented by
                    ▼
         ┌────────────────────────────┐
         │  Infrastructure Layer      │
         │  (Adapters - Outbound)     │
         │                            │
         │  • SQLAlchemy Repos        │
         │  • WebSocket Client        │
         │  • Redis Cache             │
         │  • MinIO Storage           │
         └────────────────────────────┘
```

---

## Consequences

### ✅ Positive

1. **Testability**
   - Use cases can be unit tested in isolation (no DB, no network)
   - Mock repositories and services easily
   - Tests run fast (milliseconds instead of seconds)

   ```python
   def test_provision_gateway():
       # Arrange
       mock_repo = Mock(spec=IGatewayRepository)
       mock_remote = Mock(spec=IGatewayRemoteAccess)
       use_case = ProvisionGatewayUseCase(mock_repo, mock_remote)

       # Act
       result = use_case.execute("gw-001")

       # Assert
       mock_remote.execute_command.assert_called_once()
   ```

2. **Flexibility (Database Migration)**
   - Current: 40 hours to migrate SQLite → PostgreSQL
   - With Hexagonal: 8 hours (only change adapter implementation)
   - Use cases remain untouched

   ```python
   # Before: Direct SQLite coupling (100+ places to change)
   conn = sqlite3.connect(DB_PATH)

   # After: Repository interface (change once)
   gateway = self.gateway_repo.find_by_id(gateway_id)
   ```

3. **Code Reusability**
   - Use cases can be called from:
     - Flask REST API
     - WebSocket handlers
     - CLI commands
     - Background jobs
   - Same business logic, different entry points

4. **Maintainability**
   - Business logic centralized in use cases (not scattered in routes)
   - Each use case has single responsibility
   - Easy to locate and modify logic

5. **Onboarding**
   - Clear architecture makes codebase easier to understand
   - New developers can find code predictably
   - Target: 2 weeks → 1 week onboarding time

6. **Scalability**
   - Can swap components without touching core logic
   - Example: Add Redis cache → Change adapter, use cases unchanged
   - Example: Add gRPC alongside REST → Add new adapter, use cases unchanged

### ⚠️ Negative

1. **More Code (Initial Overhead)**
   - More files and abstractions than simple route handlers
   - Requires discipline to maintain boundaries
   - Junior developers may find it complex initially

2. **Learning Curve**
   - Team needs to understand hexagonal architecture concepts
   - Requires training and documentation
   - Mitigation: Code examples, pair programming

3. **Over-Engineering Risk**
   - For trivial CRUD operations, hexagonal might feel heavy
   - Mitigation: Use hexagonal where complexity justifies it (not everywhere)

---

## Implementation Plan

### Phase 1: Foundation (Week 3)
1. Create directory structure:
   ```
   app/
   ├── domain/
   │   ├── entities/        # Gateway, User, etc.
   │   ├── use_cases/       # Business logic
   │   └── ports/           # Interfaces (IRepository, etc.)
   ├── adapters/
   │   ├── api/             # Flask controllers
   │   └── websocket/       # WebSocket handlers
   └── infrastructure/
       ├── persistence/     # SQLAlchemy repos
       ├── cache/           # Redis
       └── storage/         # MinIO
   ```

2. Implement first use case as example: `AuthenticateUserUseCase`
3. Write tests demonstrating testability improvement

### Phase 2: Migration (Weeks 4-10)
1. Migrate controllers one by one from `routes.py` to hexagonal structure
2. Create use cases for each business operation
3. Implement repository adapters
4. Write comprehensive tests (target >80% coverage)

### Phase 3: Verification (Week 11)
1. Validate that database can be easily swapped (SQLite ↔ PostgreSQL)
2. Measure metrics:
   - Test coverage: >80%
   - Time to add new feature: 8h → 5h
   - Code duplication: 15% → <3%

---

## Alternatives Considered

### 1. **Keep Current Monolithic Structure**
- **Pros:** No refactor cost, familiar to team
- **Cons:** Technical debt continues to grow, blocks scaling to 5000 gateways
- **Verdict:** ❌ Rejected - Unsustainable long-term

### 2. **Microservices Architecture**
- **Pros:** Complete service isolation, independent scaling
- **Cons:** Operational complexity (multiple deployments, distributed tracing), overkill for 200-5000 gateways
- **Verdict:** ❌ Rejected - Too complex for current scale

### 3. **Layered Architecture (Traditional MVC)**
- **Pros:** Simpler than hexagonal, widely known
- **Cons:** Still couples business logic to framework, hard to test, doesn't solve database coupling
- **Verdict:** ❌ Rejected - Doesn't address core problems

### 4. **Hexagonal Architecture** ✅
- **Pros:** Addresses all pain points (testability, flexibility, maintainability)
- **Cons:** More upfront cost, learning curve
- **Verdict:** ✅ **ACCEPTED** - Best balance of benefits vs. cost

---

## Success Metrics

We will measure success of this decision by:

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| **Time to change DB** | 40 hours | 8 hours | Swap SQLite ↔ PostgreSQL |
| **Test coverage** | 20% | >80% | `pytest --cov` |
| **Time to add feature** | 8 hours | 5 hours | Track in sprint retros |
| **Code duplication** | ~15% | <3% | `flake8 --select=D` |
| **Onboarding time** | 2 weeks | 1 week | Survey new hires |

---

## References

- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Ports & Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)

---

## Related ADRs

- [ADR-002: WebSocket Gateway Management](./002_websocket_gateway_management.md) - Replaces SSH with WebSocket (uses `IGatewayRemoteAccess` port)
- [ADR-003: Eliminate Ansible](./003_eliminate_ansible.md) - Direct commands via hexagonal use cases
- [ADR-004: bcrypt Authentication](./004_bcrypt_authentication.md) - Security via `IAuthService` port

---

**Last Updated:** 2026-02-16
