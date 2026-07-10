# Munshi Dada — WhatsApp-First Factory Operations Platform (Backend)

A NestJS backend that turns WhatsApp into the primary operating interface for small and mid-sized factories — handling attendance, task assignment, issue reporting, and daily operational reporting entirely through natural-language and slash-command messages, backed by an external ML intent-classification service.

---

## Overview

Munshi Dada is built for factory owners, managers, and workers who run operations on WhatsApp rather than dashboards. Incoming WhatsApp messages are routed through a machine-learning classification service to detect intent, then dispatched to a command handler that talks to a PostgreSQL-backed domain model covering users, factories, attendance, tasks, and issues. Scheduled jobs proactively nudge workers for attendance, and managers can pull a consolidated daily report on demand.

The backend is a modular NestJS application with a centralized response envelope, global exception handling, structured request logging, health checks, and a multi-arch Docker build wired into a GitHub Actions CI/CD pipeline that deploys to an EC2 host.

---

## Key Features

- **WhatsApp Webhook Integration** — Meta-compatible webhook verification and message ingestion, plus a direct test endpoint for local development.
- **ML-Driven Intent Classification** — every inbound message is sent to an external ML service (`ML_URL`) which returns a structured intent (command), so users can type naturally ("machine not working") instead of memorizing slash commands.
- **Command Dispatch Engine** — a single command router (`processCommand`) supports attendance marking, task management, issue tracking, team overviews, and report generation.
- **Role-Based Access Control** — Owner / Manager / Worker roles enforced per command (e.g. only managers can assign tasks, resolve issues, or view the team; only workers can post task updates).
- **Attendance Tracking with Automated Reminders** — daily cron jobs (9 AM initial reminder, then every 2 hours until 7 PM) message any worker who hasn't marked attendance, using WhatsApp template messages.
- **Task Lifecycle Management** — assign to a single worker or broadcast to an entire factory (batch-tracked via `batch_id`), post progress updates, and mark tasks complete, each with ownership and factory-scoping checks.
- **Issue Reporting** — workers can raise issues in plain language; managers can list active issues and resolve them.
- **Daily Operational Reports** — a single command aggregates attendance, task, and issue counts for a factory into a formatted summary.
- **Dual Database Support (scaffolded)** — Sequelize/PostgreSQL is the active data layer; a Mongoose/MongoDB provider exists in the codebase but is currently disabled, indicating a planned or optional secondary store.
- **Global Observability** — request/response logging interceptor, centralized HTTP exception filter, and a consistent `{ data, meta }` response envelope across all endpoints.
- **Health Checks** — a Terminus-based `/health` endpoint verifying database connectivity, suitable for container orchestration liveness/readiness probes.
- **API Documentation** — Swagger UI auto-generated from decorated DTOs and controllers, served at `/api/docs`.
- **Containerized Deployment** — multi-stage Dockerfile and a GitHub Actions pipeline that builds a multi-arch image, pushes to Docker Hub, and redeploys on an EC2 instance via SSH.

---

## Architecture

```mermaid
flowchart LR
    subgraph WA["WhatsApp / Olli Gateway"]
        WU["Worker / Manager / Owner"]
    end

    subgraph NEST["NestJS Backend (Munshi Dada)"]
        WH["WhatsAppController\n/webhook"]
        WS["WhatsAppService\nprocessCommand dispatch"]
        CRON["AttendanceCronService\nscheduled reminders"]

        subgraph DOMAIN["Domain Services"]
            US["UserService"]
            FS["FactoryService"]
            ATS["AttendanceService"]
            TS["TasksService"]
            IS["IssueService"]
            RS["ReportService"]
        end

        LOG["LoggerInterceptor /\nLoggerService"]
        EXC["HttpExceptionFilter"]
        RESP["ReqResInterceptor\n(response envelope)"]
        HEALTH["HealthController\n/health"]
        DB["DbService\n(Sequelize models)"]
    end

    subgraph EXTERNAL["External Services"]
        ML["ML Classification Service\n(ML_URL) /classify"]
        OLLI["Olli WhatsApp Gateway\n(OLLI_URL) /external/waba/send"]
    end

    subgraph STORE["Data Store"]
        PG[("PostgreSQL\nusers, factories, factory_users,\nattendance, tasks, task_updates, issues")]
    end

    WU -- "Inbound message" --> WH
    WH --> WS
    WS -- "POST /classify?message=..." --> ML
    ML -- "intent, id, date" --> WS
    WS --> US
    WS --> FS
    WS --> ATS
    WS --> TS
    WS --> IS
    WS --> RS
    US --> DB
    FS --> DB
    ATS --> DB
    TS --> DB
    IS --> DB
    RS --> DB
    DB --> PG
    WS -- "POST /external/waba/send" --> OLLI
    OLLI -- "Outbound reply" --> WU

    CRON --> FS
    CRON --> ATS
    CRON -- "template message" --> OLLI

    WH --> LOG
    WH --> EXC
    WH --> RESP
    HEALTH --> DB
```

**Layer summary:**
1. WhatsApp messages hit `WhatsAppController`, which forwards raw text to the external ML service for intent classification.
2. `WhatsAppService.processCommand` looks up the sender, resolves their factory and role, and enforces role-based guards before executing the matched command.
3. Domain services (`UserService`, `FactoryService`, `AttendanceService`, `TasksService`, `IssueService`, `ReportService`) encapsulate all Sequelize model access behind `DbService`.
4. Replies are sent back to the user through the Olli WhatsApp gateway using either free-text messages or approved WhatsApp templates.
5. A scheduled `AttendanceCronService` proactively reaches out to workers who haven't marked attendance, independent of any inbound message.
6. Cross-cutting concerns (structured logging, exception formatting, response envelopes, health checks) wrap every request uniformly via global interceptors and filters.

---

## Sequence Diagrams

### 1. Inbound WhatsApp Message Handling

```mermaid
sequenceDiagram
    participant User as WhatsApp User
    participant Webhook as WhatsAppController
    participant Service as WhatsAppService
    participant ML as ML Service (/classify)
    participant DB as PostgreSQL (via DbService)
    participant Olli as Olli Gateway

    User->>Webhook: POST /webhook {from, text}
    Webhook->>Service: handleIncomingMessage({from, message})
    Service->>ML: POST /classify?message=...
    ML-->>Service: {intent, id, date}
    Service->>Service: processCommand({from, message, command, id, date})
    Service->>DB: findByPhone(from)
    DB-->>Service: user + factory_links (role, factory_id)
    alt user not registered
        Service-->>Webhook: UnauthorizedException
    else user registered
        Service->>DB: Execute matched command\n(attendance / tasks / issues / report)
        DB-->>Service: Result
        Service-->>Webhook: Formatted reply text
    end
    Webhook->>Olli: sendTextMessage(from, reply)
    Olli-->>User: Delivered reply
```

### 2. Task Assignment (Manager to Worker or All)

```mermaid
sequenceDiagram
    participant Manager as Manager (WhatsApp)
    participant Service as WhatsAppService
    participant Guard as Role Guard (ensureManager)
    participant Tasks as TasksService
    participant DB as PostgreSQL

    Manager->>Service: /assign @worker or @all [description]
    Service->>Guard: ensureManager(role)
    alt role is WORKER
        Guard-->>Service: ForbiddenException
    else role is MANAGER/OWNER
        Service->>Tasks: handleAssign(user_id, factory_id, assigned_to, description)
        alt assigned_to == "@all"
            Tasks->>DB: bulkCreate tasks for all workers (shared batch_id)
        else assigned_to == specific worker
            Tasks->>DB: findByPhone(worker) then create single task
        end
        DB-->>Tasks: Created task(s)
        Tasks-->>Service: Confirmation message
    end
    Service-->>Manager: "Task assigned successfully" / "Task assigned to N workers"
```

### 3. Scheduled Attendance Reminder

```mermaid
sequenceDiagram
    participant Cron as AttendanceCronService
    participant Factory as FactoryService
    participant Attendance as AttendanceService
    participant Olli as Olli Gateway
    participant Worker as Worker (WhatsApp)

    Note over Cron: Triggered at 9 AM,\nthen every 2 hours (11:00-19:00)
    Cron->>Factory: getAllWorkers()
    Factory-->>Cron: List of workers with phone numbers
    loop for each worker
        Cron->>Attendance: isMarkedToday(user_id, factory_id)
        Attendance-->>Cron: true / false
        alt not marked
            Cron->>Olli: sendTemplate(phone, "factory_attendance_reminder")
            Olli-->>Worker: Template reminder message
        else already marked
            Cron->>Cron: skip
        end
    end
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 (Express platform) |
| Language | TypeScript |
| Primary Database | PostgreSQL via Sequelize / sequelize-typescript |
| Secondary Database (scaffolded) | MongoDB via Mongoose (currently disabled) |
| Scheduling | @nestjs/schedule (Cron) |
| API Documentation | @nestjs/swagger |
| Validation | class-validator, class-transformer |
| HTTP Client | @nestjs/axios / axios |
| Health Checks | @nestjs/terminus |
| Containerization | Docker (multi-stage, Node 20 Alpine) |
| CI/CD | GitHub Actions, Docker Hub, EC2 (SSH deploy) |

---

## Project Structure

```
munshi-dada/
├── Dockerfile                        # Multi-stage build: yarn build -> slim runtime image
├── nest-cli.json                     # Nest CLI configuration
├── package.json                      # Scripts and dependencies
├── tsconfig.json / tsconfig.build.json
├── .env.local                        # Local environment variables (not committed with real values)
├── src/
│   ├── main.ts                       # Bootstrap: validation pipe, Swagger, global interceptors
│   ├── app/api/
│   │   └── app.module.ts             # Root module wiring all feature modules
│   ├── core/
│   │   ├── constants/http.constants.ts
│   │   ├── dtos/http-response.ts     # Standard {data, meta} response envelope
│   │   ├── filters/http-exception.filter.ts
│   │   ├── guards/guards.ts          # InternalCallGuard (X-Secret header check)
│   │   ├── health-check/             # Terminus health module/controller/service
│   │   ├── interceptors/response-interceptor.ts
│   │   └── services/
│   │       ├── db-service/           # DbService, Sequelize + Mongoose providers, model registry
│   │       └── logger/               # Structured request logging interceptor/service
│   ├── modules/
│   │   └── whatsapp/                 # Webhook controller, command dispatch, templates, cron reminders
│   └── services/
│       ├── attendance/               # Attendance model + service
│       ├── factories/                # Factory + FactoryUser models, controller, service
│       ├── issues/                   # Issue model + service
│       ├── reports/                  # Daily operational report aggregation
│       ├── tasks/                    # Task + TaskUpdate models, assignment logic
│       └── users/                    # User model, controller, service
└── .github/workflows/cicd.yml        # Build, push, and deploy pipeline
```

---

## Domain Model

| Entity | Purpose | Key Relationships |
|---|---|---|
| `User` | A person identified by phone number | Has one `FactoryUser` link; has many assigned/created tasks and reported issues |
| `Factory` | A physical factory/workshop | Has many `FactoryUser`, `Task`, `Issue`, `Attendance` records |
| `FactoryUser` | Join entity binding a user to a factory with a role | Belongs to `User` and `Factory`; `role` is `OWNER`, `MANAGER`, or `WORKER` |
| `Attendance` | Daily present/absent record | Unique per `(user_id, factory_id, date)` |
| `Task` | Work item assigned within a factory | Belongs to assignee and assigner `User`; has many `TaskUpdate`; supports `batch_id` for bulk assignments |
| `TaskUpdate` | Progress note on a task | Belongs to `Task` and `User` |
| `Issue` | Reported problem within a factory | Belongs to `Factory` and reporting `User`; tracks `is_resolved` |

---

## Command Reference

| Command | Role Required | Description |
|---|---|---|
| `/present`, `/absent` | Any registered user | Mark today's attendance |
| `/tasks` | Any registered user | List pending tasks (own tasks for workers, factory-wide for managers) |
| `/complete [taskId]` | Assignee | Mark a task as completed |
| `/assign @user or @all [task]` | Manager / Owner | Assign a task to one worker or the whole factory |
| `/update [taskId] [message]` | Worker | Post a progress update on an assigned task |
| `/issue [message]` | Any registered user | Report a new issue |
| `/issues` | Any registered user | List active (unresolved) issues |
| `/resolve [issueId]` | Manager / Owner | Mark an issue as resolved |
| `/members` | Manager / Owner | List active factory team members |
| `/report [date]` | Manager / Owner | Generate a daily attendance/task/issue summary |
| `/help` | Any registered user | Show usage examples |

Users are not required to type these commands verbatim — free-form natural-language messages (including Hinglish) are classified into the corresponding intent by the external ML service before dispatch.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn
- PostgreSQL instance (Neon or self-hosted)
- A running ML classification service (see `ML_URL`)
- Olli (or compatible) WhatsApp Business API gateway credentials
- Meta WhatsApp Business webhook credentials (verify token, phone number ID)

### Environment Variables

Create a `.env.local` file:

```
PORT=3000
POSTGRES_CONNECTION_STRING=postgres://user:password@host:5432/dbname

X_SECRET=your-internal-secret

ML_URL=http://localhost:8000

WHATSAPP_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

OLLI_URL=your-olli-gateway-url
OLLI_KEY=your-olli-api-key
```

### Install and Run

```bash
git clone <repository-url>
cd munshi-dada
yarn install

# development (loads .env.local, watch mode)
yarn dev

# production build and run
yarn build
yarn start:prod
```

The API is available at `http://localhost:<PORT>`. Swagger documentation is served at `http://localhost:<PORT>/api/docs`. Health status is available at `http://localhost:<PORT>/health`.

### Docker

```bash
docker build -t munshi-dada .
docker run -p 4000:4000 --env-file .env.local munshi-dada
```

---

## CI/CD Pipeline

`.github/workflows/cicd.yml` runs on every push to `main`:

1. Builds a multi-architecture Docker image (`linux/amd64`, `linux/arm64`) using Buildx.
2. Pushes the image to Docker Hub under the `munshi-dada` repository.
3. Connects to the target EC2 host over SSH and restarts the Docker Compose deployment at the configured project path.

---

## Roadmap

- Complete and enable the MongoDB provider for unstructured/event data, or remove the scaffold if no longer planned
- Apply the existing `InternalCallGuard` (`X-Secret` header) consistently across internal-only endpoints
- Replace `console.log` debugging statements with the structured `LoggerService` throughout the WhatsApp module
- Add automated test coverage (unit and e2e) for command dispatch and role-guard logic
- Introduce request-level authentication for externally exposed, non-webhook endpoints (users, factories)

---

## License

UNLICENSED — private project. Update this section if the project is open-sourced.

---

## Author

**Shantanu Garg**
B.Tech CSE-AI, Graphic Era (Deemed to be University), Dehradun
