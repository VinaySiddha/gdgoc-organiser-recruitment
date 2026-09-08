# 🚀 Challenge 03 Track C — Student Project Showcase & Mentorship Portal

## 📌 1. Project Overview
The **Student Project Showcase & Mentorship Portal** is a full-stack platform built for the **GDG SVEC** student developer community. It allows students to submit engineering projects, showcase tech stacks and live demos, and enables mentors to evaluate projects across Code Quality, Innovation, and Completeness. The platform dynamically calculates composite review scores and maintains an official leaderboard ranking top projects.

---

## 🛠️ 2. Chosen Stack
- **Framework**: Next.js 16 (App Router with Route Handlers & Server/Client Components)
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL (Neon) with Prisma 7 ORM
- **Styling**: Tailwind CSS v4
- **Testing & Verification**: Native TypeScript checks (`npx tsc --noEmit`) and ESLint

---

## 📐 3. Architecture Overview
The application follows a clean layered Architecture:

```text
Request (Client UI / HTTP)
   │
   ▼
Next.js Route Handler (src/app/api/*)  <-- Thin Controller
   │
   ▼
Validation Layer (src/validators/*)    <-- Schema & Input Validation
   │
   ▼
Service Layer (src/services/*)          <-- Business Logic & Score Calculation
   │
   ▼
Prisma Client (src/lib/prisma.ts)      <-- Database Access Layer
   │
   ▼
PostgreSQL Database (Neon)
```

- **Route Handlers** stay thin and only handle request parsing, calling services, and returning standardized API responses (`src/lib/api-response.ts`).
- **Service Layer** encapsulates all business formulas, metrics aggregation, sorting, and Prisma queries.
- **Client Components** power interactive UI states (filters, search, modals, identity switcher).

---

## 🗄️ 4. Database Model Overview

```prisma
enum Role {
  STUDENT
  MENTOR
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]
  reviews   Review[]
}

model Project {
  id          String   @id @default(uuid())
  title       String
  description String
  domain      String   // AI/ML, Web, Mobile, Cloud, IoT
  year        String   // Academic Year
  techStack   String[]
  githubUrl   String
  demoUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  studentId   String
  student     User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  reviews     Review[]

  @@index([domain])
  @@index([year])
}

model Review {
  id                String   @id @default(uuid())
  codeQualityScore  Int      // 1-10
  innovationScore   Int      // 1-10
  completenessScore Int      // 1-10
  comments          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  projectId         String
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  mentorId          String
  mentor            User     @relation(fields: [mentorId], references: [id], onDelete: Cascade)

  @@unique([projectId, mentorId]) // Prevents duplicate reviews by the same mentor
}
```

---

## 🔌 5. API Endpoint List

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/projects` | Submit a new student project |
| `GET` | `/api/projects` | List projects with search, domain, year filters, and pagination |
| `GET` | `/api/projects/[id]` | Fetch detailed project by ID |
| `PUT` | `/api/projects/[id]` | Update project details |
| `DELETE` | `/api/projects/[id]` | Delete project |
| `POST` | `/api/projects/[id]/reviews` | Submit mentor review (1–10 scores + comments) |
| `GET` | `/api/projects/[id]/reviews` | List all reviews & calculated summary metrics for a project |
| `GET` | `/api/leaderboard` | Fetch ranked project standings sorted by overall score |

---

## 💻 6. Local Setup

### 1. Prerequisites
- Node.js v20+
- npm v10+

### 2. Install Dependencies
```bash
npm install
```

---

## 🔑 7. Environment Variables
Create a local `.env` file in `assessment/challenge-03-practical/.env`:

```env
DATABASE_URL="postgresql://user:password@ep-aged-resonance-pooler.aws.neon.tech/neondb?sslmode=require"
```

*(See `.env.example` for placeholder reference).*

---

## 🔄 8. Prisma Setup & Migration Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push Database Schema (When database is reachable)
npx prisma db push

# Seed Database with GDG Demo Data
npx prisma db seed
```

---

## 🧪 9. How to Run Tests & Verification

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint linter
npm run lint

# Run verification test suite
npm test
```

---

## 🚀 10. How to Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎭 11. Demo / Mock Authentication Explanation
To evaluate student and mentor features without complex OAuth or session setups:
- An **Identity Selector** widget is located in the top navigation bar.
- Evaluators can toggle active user personas between predefined student profiles (*Aarav Sharma*, *Diya Patel*) and mentor profiles (*Dr. Vikram Seth*, *Priya Sundaram*), or enter custom UUIDs.
- Form submissions automatically pre-fill `studentId` or `mentorId` based on the currently selected persona.

---

## ⚠️ 12. Known Limitations
1. **Network Connectivity**: In offline or firewalled environments, Neon PostgreSQL database connections may fail to resolve DNS (`P1001`). The backend and frontend are architected to build and compile cleanly regardless.
2. **Mock Auth**: Production JWT/OAuth authentication is intentionally omitted for this assessment.
