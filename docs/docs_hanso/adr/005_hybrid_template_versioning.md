# ADR-005: Hybrid Template Versioning (Git + Database)

**Status:** ✅ Accepted

**Date:** 2026-02-16

**Deciders:** Tech Lead, Backend Team

---

## Context

We need a versioning strategy for provisioning templates (YAML files that define gateway setup steps).

### Requirements:

1. **Version Control:** Track changes to templates over time
2. **Audit Trail:** Know which template version was used for each gateway provisioning
3. **Rollback:** Revert to previous template version if needed
4. **Collaboration:** Multiple developers can edit templates
5. **Execution History:** Track when and how templates were executed
6. **Easy Deployment:** Templates should be easy to deploy with backend

### Two Types of Data:

1. **Template Definition** (YAML structure)
   - What: Step definitions, commands, rollback logic
   - Changes: Rarely (monthly)
   - Needs: Version control, diff, code review

2. **Execution History** (Logs)
   - What: When template was run, on which gateway, results
   - Changes: Constantly (every provisioning)
   - Needs: Query, aggregate, retention policies

---

## Decision

We will adopt a **Hybrid Approach**: Templates in Git + Execution History in Database.

### Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     GIT REPOSITORY                          │
│                  (Version Control)                          │
│                                                             │
│  templates/                                                 │
│  └── provisioning/                                          │
│      ├── default.yml          (v1.0, v1.1, v1.2 in Git)    │
│      ├── industrial.yml       (v1.0 in Git)                │
│      └── minimal.yml          (v1.0 in Git)                │
│                                                             │
│  Git provides:                                              │
│  ✅ Diffs between versions                                  │
│  ✅ Blame (who changed what)                                │
│  ✅ Branches for testing                                    │
│  ✅ Code review via Pull Requests                           │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Backend reads on startup
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (In-Memory Cache)                      │
│                                                             │
│  templates_cache = {                                        │
│    "default": Template(version="1.2", steps=[...]),         │
│    "industrial": Template(version="1.0", steps=[...])       │
│  }                                                          │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Uses during provisioning
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                       │
│                   (Execution History)                       │
│                                                             │
│  Tables:                                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ provisioning_history                                  │ │
│  │                                                       │ │
│  │ id | gateway_id | template_name | template_version   │ │
│  │    | started_at | completed_at  | status             │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 1  | gw-001     | default       | 1.2                │ │
│  │ 2  | gw-002     | industrial    | 1.0                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ provisioning_logs                                     │ │
│  │                                                       │ │
│  │ id | provisioning_id | step_name | command           │ │
│  │    | exit_code       | stdout    | stderr | duration │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 1  | 1              | Update    | apt-get update     │ │
│  │ 2  | 1              | Install   | apt-get install... │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Database provides:                                         │
│  ✅ Query: "Which gateways used template v1.0?"             │
│  ✅ Audit: "When was gw-001 provisioned?"                   │
│  ✅ Analytics: "Average provisioning time"                  │
│  ✅ Debugging: "What command failed on gw-005?"             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Template Structure

### YAML Template (in Git):

```yaml
# templates/provisioning/default.yml
version: "1.2"
name: "Default Gateway Provisioning"
description: "Standard provisioning for Smartec gateways"
author: "Tech Team"
changelog:
  - "1.0: Initial version"
  - "1.1: Added Docker health check"
  - "1.2: Updated Metal Gear download URL"

steps:
  - name: "Update package cache"
    command: "apt-get update"
    timeout: 60
    retry: 2
    rollback: null

  - name: "Install Docker"
    command: "apt-get install -y docker.io"
    timeout: 300
    retry: 1
    rollback: "apt-get remove -y docker.io"

  - name: "Start Docker service"
    command: "systemctl start docker && systemctl enable docker"
    timeout: 30
    retry: 1
    rollback: "systemctl stop docker"

  - name: "Download Metal Gear"
    command: "curl -o /tmp/metal_gear.deb {{ metal_gear_url }}"
    timeout: 120
    retry: 2
    rollback: "rm /tmp/metal_gear.deb"

  - name: "Install Metal Gear"
    command: "dpkg -i /tmp/metal_gear.deb"
    timeout: 60
    retry: 1
    rollback: "dpkg -r metal-gear"

  - name: "Start Metal Gear service"
    command: "systemctl start metal-gear && systemctl enable metal-gear"
    timeout: 30
    retry: 1
    rollback: "systemctl stop metal-gear"
```

### Database Schema:

```sql
-- Provisioning history (high-level)
CREATE TABLE provisioning_history (
    id SERIAL PRIMARY KEY,
    gateway_id VARCHAR(50) NOT NULL REFERENCES gateways(id),
    template_name VARCHAR(100) NOT NULL,  -- "default", "industrial", etc.
    template_version VARCHAR(20) NOT NULL, -- "1.2"
    status VARCHAR(20) NOT NULL,           -- "running", "completed", "failed"
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT,
    created_by VARCHAR(100)                -- Operator username
);

-- Step-by-step logs (detailed)
CREATE TABLE provisioning_logs (
    id SERIAL PRIMARY KEY,
    provisioning_id INTEGER NOT NULL REFERENCES provisioning_history(id),
    step_number INTEGER NOT NULL,
    step_name VARCHAR(200) NOT NULL,
    command TEXT NOT NULL,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_provisioning_history_gateway ON provisioning_history(gateway_id);
CREATE INDEX idx_provisioning_history_template ON provisioning_history(template_name, template_version);
CREATE INDEX idx_provisioning_logs_provisioning ON provisioning_logs(provisioning_id);
```

---

## Implementation

### 1. Loading Templates from Git

```python
# app/infrastructure/provisioning/git_template_loader.py
import yaml
from pathlib import Path
from app.domain.entities.provisioning_template import ProvisioningTemplate

class GitTemplateLoader:
    def __init__(self, templates_dir: str = "templates/provisioning"):
        self.templates_dir = Path(templates_dir)
        self.cache: Dict[str, ProvisioningTemplate] = {}

    def load_all_templates(self) -> Dict[str, ProvisioningTemplate]:
        """Load all YAML templates from Git into memory cache"""
        templates = {}
        for yaml_file in self.templates_dir.glob("*.yml"):
            template = self._parse_yaml(yaml_file)
            templates[template.name] = template
        return templates

    def _parse_yaml(self, file_path: Path) -> ProvisioningTemplate:
        """Parse YAML file into ProvisioningTemplate entity"""
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)

        return ProvisioningTemplate(
            name=data['name'],
            version=data['version'],
            description=data['description'],
            steps=[ProvisioningStep(**step) for step in data['steps']]
        )
```

### 2. Repository Interface

```python
# app/domain/ports/i_provisioning_repository.py
class IProvisioningRepository(ABC):
    @abstractmethod
    def get_template(self, name: str) -> ProvisioningTemplate:
        """Get template by name (from cache/Git)"""

    @abstractmethod
    def start_provisioning(self, gateway_id: str, template: ProvisioningTemplate, user: str) -> int:
        """Create provisioning_history record, return ID"""

    @abstractmethod
    def save_log(self, provisioning_id: int, step: ProvisioningStep, result: CommandResult) -> None:
        """Save step execution log"""

    @abstractmethod
    def complete_provisioning(self, provisioning_id: int, status: str, error: Optional[str]) -> None:
        """Mark provisioning as completed/failed"""

    @abstractmethod
    def get_provisioning_history(self, gateway_id: str) -> List[ProvisioningHistory]:
        """Get all provisioning attempts for a gateway"""
```

### 3. Use Case

```python
# app/domain/use_cases/provision_gateway_use_case.py
class ProvisionGatewayUseCase:
    def __init__(
        self,
        gateway_repo: IGatewayRepository,
        provisioning_repo: IProvisioningRepository,
        remote_access: IGatewayRemoteAccess,
        notification: INotificationService
    ):
        self.gateway_repo = gateway_repo
        self.provisioning_repo = provisioning_repo
        self.remote_access = remote_access
        self.notification = notification

    def execute(self, gateway_id: str, template_name: str, user: str) -> ProvisioningResult:
        # 1. Get gateway
        gateway = self.gateway_repo.find_by_id(gateway_id)
        if not gateway:
            raise GatewayNotFoundError(gateway_id)

        # 2. Load template from Git (cached)
        template = self.provisioning_repo.get_template(template_name)

        # 3. Start provisioning (create DB record)
        provisioning_id = self.provisioning_repo.start_provisioning(
            gateway_id=gateway_id,
            template=template,
            user=user
        )

        # 4. Execute steps
        try:
            for step_number, step in enumerate(template.steps, 1):
                # Execute via WebSocket
                result = self.remote_access.execute_command(
                    gateway_id,
                    step.command
                )

                # Log to database
                self.provisioning_repo.save_log(
                    provisioning_id=provisioning_id,
                    step=step,
                    result=result
                )

                # Notify operator
                self.notification.send_progress(
                    f"[{step_number}/{len(template.steps)}] {step.name}: {'✅' if result.exit_code == 0 else '❌'}"
                )

                if result.exit_code != 0:
                    raise CommandExecutionError(step.name, result.stderr)

            # Success
            self.provisioning_repo.complete_provisioning(
                provisioning_id,
                status="completed",
                error=None
            )

            return ProvisioningResult(success=True)

        except Exception as e:
            # Failed
            self.provisioning_repo.complete_provisioning(
                provisioning_id,
                status="failed",
                error=str(e)
            )
            raise ProvisioningFailedError(str(e))
```

---

## Consequences

### ✅ Positive

#### 1. **Git Benefits (Template Definitions)**
```bash
# See template history
git log templates/provisioning/default.yml

# Compare versions
git diff v1.0..v1.2 templates/provisioning/default.yml

# Code review
# Developer creates PR to change template → Team reviews → Merge

# Rollback template
git checkout v1.0 templates/provisioning/default.yml
```

#### 2. **Database Benefits (Execution History)**
```sql
-- Query: Which gateways used template v1.0?
SELECT gateway_id, started_at
FROM provisioning_history
WHERE template_name = 'default' AND template_version = '1.0';

-- Query: Average provisioning time
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
FROM provisioning_history
WHERE status = 'completed';

-- Query: Failed steps
SELECT step_name, COUNT(*)
FROM provisioning_logs
WHERE exit_code != 0
GROUP BY step_name
ORDER BY COUNT(*) DESC;

-- Audit: What happened to gw-001?
SELECT ph.started_at, ph.template_name, ph.template_version, pl.step_name, pl.command
FROM provisioning_history ph
JOIN provisioning_logs pl ON ph.id = pl.provisioning_id
WHERE ph.gateway_id = 'gw-001'
ORDER BY ph.started_at DESC, pl.step_number;
```

#### 3. **Best of Both Worlds**
| Aspect | Git | Database |
|--------|-----|----------|
| Template definition | ✅ | ❌ |
| Version control | ✅ | ❌ |
| Diffs | ✅ | ❌ |
| Code review | ✅ | ❌ |
| Execution logs | ❌ | ✅ |
| Query performance | ❌ | ✅ |
| Retention policies | ❌ | ✅ |
| Real-time tracking | ❌ | ✅ |

#### 4. **Deployment Simplicity**
```dockerfile
# Dockerfile
COPY templates/ /app/templates/
# Templates deployed with backend Docker image
```

#### 5. **No External Dependencies**
- No need for template storage service (e.g., MinIO)
- Templates are part of the codebase

#### 6. **Easy Rollback**
```bash
# Rollback template to previous version
git revert abc123  # Revert commit that changed template
# Deploy new backend version with old template
```

### ⚠️ Negative

#### 1. **Templates Tied to Backend Deployment**
- Changing template requires backend redeployment
- Cannot update template without restarting backend

**Mitigation:**
- Hot-reload: Backend can re-read templates from disk without restart
```python
@app.route("/api/admin/reload-templates", methods=["POST"])
def reload_templates():
    template_loader.load_all_templates()
    return jsonify({"status": "reloaded"})
```

#### 2. **Template Version in Two Places**
- Template version in YAML: `version: "1.2"`
- Git commit/tag: `v1.2`

**Mitigation:**
- Enforce consistency via CI/CD check:
```bash
# .github/workflows/validate-templates.yml
- name: Validate template versions
  run: |
    # Check that YAML version matches Git tag
    python scripts/validate_template_versions.py
```

#### 3. **Large History in Database**
- Provisioning logs grow over time
- Can impact query performance

**Mitigation:**
- Retention policy: Delete logs older than 90 days
- Archive old logs to S3/MinIO
```sql
DELETE FROM provisioning_logs
WHERE provisioning_id IN (
    SELECT id FROM provisioning_history
    WHERE completed_at < NOW() - INTERVAL '90 days'
);
```

---

## Alternatives Considered

### 1. **Database Only** (Everything in PostgreSQL)
```sql
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    version VARCHAR(20),
    yaml_content TEXT,  -- Store YAML as text
    created_at TIMESTAMP
);
```

- **Pros:** Single source of truth, easy queries
- **Cons:** No Git diffs, no code review, hard to version control
- **Verdict:** ❌ Rejected - Poor developer experience

### 2. **Git Only** (Logs in Git)
```
templates/
└── provisioning/
    ├── default.yml
    └── logs/
        ├── gw-001_2026-01-15.log
        └── gw-002_2026-01-16.log
```

- **Pros:** Everything in Git, no database
- **Cons:** Cannot query logs, Git not designed for large files
- **Verdict:** ❌ Rejected - Logs are not code

### 3. **External Storage (MinIO for Templates)**
```
MinIO:
  templates/
  └── provisioning/
      ├── default_v1.0.yml
      └── default_v1.2.yml

Database:
  execution_history
```

- **Pros:** Templates separate from code, easier hot-reload
- **Cons:** Extra dependency, harder deployment, no Git diffs
- **Verdict:** ❌ Rejected - Adds complexity

### 4. **Hybrid (Git + Database)** ✅
- **Pros:** Best of both worlds, simple deployment, queryable logs
- **Cons:** Templates tied to backend deployment (mitigated by hot-reload)
- **Verdict:** ✅ **ACCEPTED**

---

## Migration Plan

### Phase 1: Template Loader (Week 6)
1. Create `templates/provisioning/` directory
2. Migrate existing Ansible playbooks to YAML
3. Implement `GitTemplateLoader`
4. Load templates on backend startup

### Phase 2: Database Schema (Week 7)
1. Create `provisioning_history` table
2. Create `provisioning_logs` table
3. Implement `SQLAlchemyProvisioningRepository`

### Phase 3: Use Case (Week 8)
1. Implement `ProvisionGatewayUseCase`
2. Integrate with WebSocket for command execution
3. Log to database

### Phase 4: Hot-Reload (Week 9)
1. Add `/api/admin/reload-templates` endpoint
2. Implement file watcher (optional, for dev)

### Phase 5: Queries & Analytics (Week 10)
1. Create useful SQL queries (see examples above)
2. Add API endpoints for history: `GET /api/gateways/{id}/provisioning-history`

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Template changes require code review** | 100% | All changes via PR |
| **Execution history queryable** | Yes | Test SQL queries |
| **Provisioning traceability** | 100% | Every step logged |
| **Template rollback time** | <5 min | Git revert + deploy |
| **Query performance** | <100ms | Measure SELECT queries |

---

## Related ADRs

- [ADR-003: Eliminate Ansible](./003_eliminate_ansible.md) - Uses these templates instead of Ansible playbooks

---

## References

- [Infrastructure as Code Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/)
- [GitOps Principles](https://www.gitops.tech/)
- [Ansible to Kubernetes Migration](https://www.ansible.com/blog/migrating-from-ansible-to-kubernetes)

---

**Last Updated:** 2026-02-16
