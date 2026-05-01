# 🚀 Smart Laptop Store & Technical Service Platform — Project Plan

> **Version:** 2.0 — Modular Monolith + Layered Architecture
> **Start Date:** April 2026
> **Stack:** NestJS + Next.js + MySQL + Redis + BullMQ + Socket.IO
> **Architecture:** Modular Monolith with Layered Architecture per Module

---

## 📋 MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Module Boundaries & Communication](#2-module-boundaries--communication)
3. [Folder Structure](#3-folder-structure)
4. [Database Design](#4-database-design)
5. [Module Chi Tiết](#5-module-chi-tiết-backend)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Pages](#7-frontend-pages)
8. [Phase Breakdown & Timeline](#8-phase-breakdown--timeline)
9. [Tech Stack Chi Tiết](#9-tech-stack-chi-tiết)
10. [Deploy & CI/CD](#10-deploy--cicd)
11. [Key Algorithms](#11-key-algorithms)
12. [Testing Strategy](#12-testing-strategy)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Performance & Scalability](#14-performance--scalability)
15. [Security Details](#15-security-details)
16. [Data Migration & Seed Strategy](#16-data-migration--seed-strategy)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [API Versioning Strategy](#18-api-versioning-strategy)
19. [Transaction Management](#19-transaction-management)
20. [Real-world Scenarios & Resilience](#20-real-world-scenarios--resilience)
21. [Frontend State Management Details](#21-frontend-state-management-details)
22. [Development Workflow](#22-development-workflow)
23. [Documentation Standards](#23-documentation-standards)
24. [Local Development Setup](#24-local-development-setup)
25. [Third-party Fallback Strategy](#25-third-party-fallback-strategy)
26. [Mobile Responsiveness Strategy](#26-mobile-responsiveness-strategy)
27. [Phase Execution Checklist (DoD + Acceptance + Owner)](#27-phase-execution-checklist-dod--acceptance--owner)
28. [Execution Backlog Mapping (BE / FE Admin / FE Client)](#28-execution-backlog-mapping-be--fe-admin--fe-client)

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Tại sao Modular Monolith?

```
Microservices          Monolith (MVC)         Modular Monolith ✅
────────────           ──────────────         ─────────────────
- Quá phức tạp         - Code spaghetti       - Module boundaries rõ ràng
  cho 1 người          - Không scale được      - Single deploy, dễ vận hành
- DevOps overhead      - Khó maintain          - Dễ tách Microservices sau
- Network latency      - Business logic        - Mỗi module độc lập
- Distributed debug      lẫn lộn               - Production-grade structure
```

**Modular Monolith = Single deployable unit** nhưng bên trong chia thành **các module độc lập** với:

- **Clear boundaries**: Mỗi module sở hữu data và logic riêng
- **Public interfaces**: Module giao tiếp qua exported services, KHÔNG truy cập trực tiếp DB của nhau
- **Event-driven**: Side effects qua Event Emitter (loose coupling)
- **Layered Architecture**: Mỗi module có 4 layers rõ ràng

### 1.2 Layered Architecture Per Module

```
┌─────────────────────────────────────────────────────────┐
│                    EACH MODULE                           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PRESENTATION LAYER (Controllers)                  │  │
│  │  - HTTP Controllers, WebSocket Gateways            │  │
│  │  - Input validation (DTOs + Pipes)                 │  │
│  │  - Route handling, Swagger docs                    │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ calls                          │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  APPLICATION LAYER (Services)                      │  │
│  │  - Business logic, Use cases                       │  │
│  │  - Orchestration, Transactions                     │  │
│  │  - Event emission                                  │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ calls                          │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  DOMAIN LAYER (Entities, Enums, Interfaces)        │  │
│  │  - TypeORM Entities (data shape)                   │  │
│  │  - Business enums (OrderStatus, PaymentMethod)     │  │
│  │  - Domain interfaces (contracts)                   │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ calls                          │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  INFRASTRUCTURE LAYER (Repositories, External)     │  │
│  │  - TypeORM Repositories (data access)              │  │
│  │  - External service adapters (Cloudinary, Brevo)   │  │
│  │  - Redis, BullMQ integrations                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  MODULE EXPORTS: Chỉ export Service interfaces          │
│  MODULE EVENTS: Emit domain events cho cross-module     │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Layer Rules (Bắt buộc)

| Rule                   | Mô tả                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Top-down only**      | Presentation → Application → Domain → Infrastructure. KHÔNG được gọi ngược                                    |
| **Controller = thin**  | Controller CHỈ validate input + gọi service + return response. KHÔNG có business logic                        |
| **Service = business** | Toàn bộ business logic nằm trong Service layer                                                                |
| **Repository = data**  | Repository CHỈ làm CRUD + query. KHÔNG có business logic                                                      |
| **Entity = shape**     | Entity định nghĩa data shape + TypeORM decorators. KHÔNG có methods phức tạp                                  |
| **Cross-module**       | Module A gọi Module B qua **exported service** hoặc **event**. KHÔNG import repository/entity của module khác |

### 1.4 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐              │
│  │ Customer  │ │  Staff   │ │Technician│ │   Admin   │              │
│  │   Pages   │ │  Pages   │ │  Pages   │ │ Dashboard │              │
│  └────┬──────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘              │
│       └──────────────┴───────────┴──────────────┘                   │
│                          │ HTTPS                                    │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                    API GATEWAY (NestJS)                              │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐              │
│  │ Auth Guard  │ │ Rate Limiter │ │ Global Exception │              │
│  │ + RBAC      │ │ (Throttler)  │ │    Filter        │              │
│  └──────┬──────┘ └──────┬───────┘ └────────┬────────┘              │
│         └───────────────┴──────────────────┘                        │
│                          │                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  BUSINESS MODULES                         │      │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐      │      │
│  │  │  Auth   │ │ Product │ │  Order   │ │ Payment  │      │      │
│  │  │ Module  │ │ Module  │ │  Module  │ │  Module  │      │      │
│  │  └─────────┘ └─────────┘ └──────────┘ └──────────┘      │      │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐      │      │
│  │  │  Cart   │ │Inventory│ │ Warranty │ │   PC     │      │      │
│  │  │ Module  │ │ Module  │ │  Module  │ │  Build   │      │      │
│  │  └─────────┘ └─────────┘ └──────────┘ └──────────┘      │      │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐      │      │
│  │  │Shipping │ │  Notif  │ │Dashboard │ │  User    │      │      │
│  │  │ Module  │ │ Module  │ │  Module  │ │  Module  │      │      │
│  │  └─────────┘ └─────────┘ └──────────┘ └──────────┘      │      │
│  └──────────────────────────────────────────────────────────┘      │
│                          │                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  INFRASTRUCTURE                           │      │
│  │  ┌────────┐  ┌────────┐  ┌──────────┐  ┌────────────┐   │      │
│  │  │ MySQL  │  │ Redis  │  │ BullMQ   │  │ Cloudinary │   │      │
│  │  │  (DB)  │  │(Cache) │  │ (Queue)  │  │  (Upload)  │   │      │
│  │  └────────┘  └────────┘  └──────────┘  └────────────┘   │      │
│  │  ┌────────┐  ┌────────┐  ┌──────────┐                   │      │
│  │  │Winston │  │ Sentry │  │Socket.IO │                   │      │
│  │  │(Logger)│  │(Error) │  │(Realtime)│                   │      │
│  │  └────────┘  └────────┘  └──────────┘                   │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. MODULE BOUNDARIES & COMMUNICATION

### 2.1 Module Ownership Map

Mỗi module **sở hữu** data riêng. Không module nào được truy cập trực tiếp entity/repository của module khác.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODULE OWNERSHIP MAP                              │
│                                                                     │
│  ┌─── FOUNDATION ──────────────────────────────────────────────┐   │
│  │  AuthModule      → owns: refresh_tokens, strategies         │   │
│  │  UserModule      → owns: users, addresses                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── CATALOG ─────────────────────────────────────────────────┐   │
│  │  ProductModule   → owns: products, categories, brands,      │   │
│  │                    product_images, product_specs             │   │
│  │  SupplierModule  → owns: suppliers                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── TRANSACTION ─────────────────────────────────────────────┐   │
│  │  CartModule      → owns: carts, cart_items                  │   │
│  │  OrderModule     → owns: orders, order_items, vouchers      │   │
│  │  PaymentModule   → owns: payments                           │   │
│  │  ShippingModule  → owns: shipping logic (no table)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── INVENTORY ───────────────────────────────────────────────┐   │
│  │  InventoryModule → owns: inventory, stock_movements         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── BUSINESS LOGIC ──────────────────────────────────────────┐   │
│  │  PcBuilderModule → owns: compatibility_rules                │   │
│  │  WarrantyModule  → owns: warranty_tickets, repair_logs      │   │
│  │  ReviewModule    → owns: reviews                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── INFRASTRUCTURE ──────────────────────────────────────────┐   │
│  │  NotificationModule → owns: notifications                   │   │
│  │  UploadModule       → owns: nothing (Cloudinary adapter)    │   │
│  │  DashboardModule    → owns: nothing (aggregate queries)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── CROSS-CUTTING ──────────────────────────────────────────┐   │
│  │  AuditModule     → owns: audit_logs                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Communication Rules

```
┌──────────────────────────────────────────────────────────────────┐
│                  COMMUNICATION RULES                              │
│                                                                  │
│  ✅ ALLOWED:                                                     │
│  ┌──────────┐  import service   ┌──────────┐                    │
│  │ Module A │ ────────────────→ │ Module B │                    │
│  └──────────┘  (via NestJS DI)  └──────────┘                    │
│                                                                  │
│  ┌──────────┐   emit event      ┌──────────┐                    │
│  │ Module A │ ─ ─ ─ ─ ─ ─ ─ → │ Module B │                    │
│  └──────────┘  (EventEmitter2)  └──────────┘                    │
│                                                                  │
│  ❌ FORBIDDEN:                                                   │
│  ┌──────────┐  import repo/entity ┌──────────┐                  │
│  │ Module A │ ──────────X───────→ │ Module B │                  │
│  └──────────┘                     └──────────┘                  │
│                                                                  │
│  ❌ FORBIDDEN:                                                   │
│  ┌──────────┐  direct DB query    ┌──────────┐                  │
│  │ Module A │ ──────────X───────→ │ Module B │                  │
│  └──────────┘    on B's tables    └──────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Cross-Module Dependencies

| Consumer Module     | Depends On (via Service)                                                         | Communication              |
| ------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| **AuthModule**      | UserModule.UserService                                                           | Sync (DI import)           |
| **CartModule**      | ProductModule.ProductService                                                     | Sync (check price, stock)  |
| **OrderModule**     | CartModule.CartService, InventoryModule.InventoryService, UserModule.UserService | Sync (DI import)           |
| **OrderModule**     | PaymentModule, NotificationModule, InventoryModule                               | Async (Events)             |
| **PaymentModule**   | OrderModule.OrderService                                                         | Sync (update order status) |
| **InventoryModule** | NotificationModule                                                               | Async (low-stock event)    |
| **WarrantyModule**  | UserModule.UserService, ProductModule.ProductService, NotificationModule         | Mixed                      |
| **PcBuilderModule** | ProductModule.ProductService                                                     | Sync (get product specs)   |
| **ReviewModule**    | ProductModule.ProductService, OrderModule.OrderService                           | Sync (verify purchase)     |
| **DashboardModule** | OrderModule, PaymentModule, InventoryModule, WarrantyModule                      | Sync (aggregate queries)   |

### 2.4 Domain Events

| Event                     | Emitted By      | Consumed By                         | Purpose                        |
| ------------------------- | --------------- | ----------------------------------- | ------------------------------ |
| `order.created`           | OrderModule     | InventoryModule, NotificationModule | Reserve stock, notify customer |
| `order.confirmed`         | OrderModule     | NotificationModule                  | Notify customer                |
| `order.cancelled`         | OrderModule     | InventoryModule, NotificationModule | Release stock, notify          |
| `order.status_changed`    | OrderModule     | NotificationModule, ShippingModule  | Notify, update tracking        |
| `payment.completed`       | PaymentModule   | OrderModule, NotificationModule     | Confirm order, notify          |
| `payment.failed`          | PaymentModule   | OrderModule, InventoryModule        | Cancel order, release stock    |
| `inventory.low_stock`     | InventoryModule | NotificationModule                  | Alert warehouse manager        |
| `warranty.created`        | WarrantyModule  | NotificationModule                  | Notify technician              |
| `warranty.status_changed` | WarrantyModule  | NotificationModule                  | Notify customer                |
| `user.registered`         | UserModule      | NotificationModule                  | Send welcome email             |
| `review.created`          | ReviewModule    | ProductModule                       | Update avg_rating              |

---

## 3. FOLDER STRUCTURE

### Folder Structure — Backend (NestJS)

```
BeShopLapTop/
├── src/
│   ├── common/                    # Shared utilities
│   │   ├── constants/             # Enums, error codes
│   │   ├── decorators/            # Custom decorators (@Roles, @Public, @CurrentUser)
│   │   ├── dto/                   # Shared DTOs (pagination, response wrapper)
│   │   ├── exceptions/            # Custom exceptions
│   │   ├── filters/               # Global exception filter
│   │   ├── guards/                # Auth guard, Role guard, Throttle guard
│   │   ├── interceptors/          # Transform, Logging, Timeout interceptors
│   │   ├── pipes/                 # Validation pipe
│   │   └── utils/                 # Helper functions
│   │
│   ├── config/                    # Configuration module
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   ├── cloudinary.config.ts
│   │   └── mail.config.ts
│   │
│   ├── database/                  # Database setup
│   │   ├── migrations/            # TypeORM migrations
│   │   ├── seeds/                 # Seed data
│   │   └── data-source.ts
│   │
│   ├── modules/
│   │   ├── auth/                  # Authentication & Authorization
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── strategies/        # JWT, Google OAuth, Local
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── users/                 # User Management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── products/              # Product Management
│   │   │   ├── dto/
│   │   │   ├── entities/          # Product, Category, Brand, Spec
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── products.module.ts
│   │   │
│   │   ├── categories/            # Category Management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   └── categories.module.ts
│   │   │
│   │   ├── cart/                  # Shopping Cart
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── cart.controller.ts
│   │   │   ├── cart.service.ts
│   │   │   └── cart.module.ts
│   │   │
│   │   ├── orders/                # Order Management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   └── orders.module.ts
│   │   │
│   │   ├── payments/              # Payment (Fake Gateway)
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── strategies/        # VietQR, MoMo, COD strategies
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   └── payments.module.ts
│   │   │
│   │   ├── inventory/             # Inventory & Stock
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── inventory.controller.ts
│   │   │   ├── inventory.service.ts
│   │   │   └── inventory.module.ts
│   │   │
│   │   ├── warranty/              # Warranty & Repair
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── warranty.controller.ts
│   │   │   ├── warranty.service.ts
│   │   │   └── warranty.module.ts
│   │   │
│   │   ├── pc-build/              # PC Compatibility Engine
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── pc-build.controller.ts
│   │   │   ├── pc-build.service.ts
│   │   │   └── pc-build.module.ts
│   │   │
│   │   ├── shipping/              # Shipping Management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── shipping.controller.ts
│   │   │   ├── shipping.service.ts
│   │   │   └── shipping.module.ts
│   │   │
│   │   ├── notifications/         # Notification System
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── processors/        # BullMQ processors
│   │   │   ├── gateways/          # Socket.IO gateway
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── notifications.module.ts
│   │   │
│   │   ├── reviews/               # Product Reviews
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── reviews.controller.ts
│   │   │   ├── reviews.service.ts
│   │   │   └── reviews.module.ts
│   │   │
│   │   ├── suppliers/             # Supplier Management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── suppliers.controller.ts
│   │   │   ├── suppliers.service.ts
│   │   │   └── suppliers.module.ts
│   │   │
│   │   ├── dashboard/             # Analytics & Reports
│   │   │   ├── dto/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.module.ts
│   │   │
│   │   └── upload/                # File Upload (Cloudinary)
│   │       ├── upload.controller.ts
│   │       ├── upload.service.ts
│   │       └── upload.module.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/                          # E2E tests
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .github/workflows/             # CI/CD
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

### Folder Structure — Frontend (Next.js)

```
FeShopLaptop/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── verify-email/
│   │   │
│   │   ├── (shop)/                # Customer-facing
│   │   │   ├── page.tsx           # Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx       # Product listing
│   │   │   │   └── [slug]/        # Product detail
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── pc-build/          # PC Builder
│   │   │   ├── orders/            # Order tracking
│   │   │   ├── warranty/          # Warranty request
│   │   │   └── profile/           # User profile
│   │   │
│   │   ├── (staff)/               # Staff panel
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   └── returns/
│   │   │
│   │   ├── (technician)/          # Technician panel
│   │   │   ├── tickets/
│   │   │   ├── repairs/
│   │   │   └── history/
│   │   │
│   │   ├── (warehouse)/           # Warehouse panel
│   │   │   ├── stock/
│   │   │   ├── import/
│   │   │   ├── export/
│   │   │   └── alerts/
│   │   │
│   │   ├── (admin)/               # Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── inventory/
│   │   │   ├── suppliers/
│   │   │   ├── warranty/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   │
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/                # Header, Footer, Sidebar
│   │   ├── product/               # Product card, filters, specs
│   │   ├── cart/                   # Cart drawer, cart item
│   │   ├── checkout/              # Checkout form, payment
│   │   ├── order/                 # Order status, tracking
│   │   ├── pc-build/              # PC builder UI
│   │   ├── warranty/              # Warranty form, status
│   │   ├── dashboard/             # Charts, stats cards
│   │   └── shared/                # Breadcrumb, pagination, etc.
│   │
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Utilities, API client, validators
│   ├── stores/                    # Zustand stores
│   ├── types/                     # TypeScript interfaces
│   └── styles/                    # Global styles
│
├── public/                        # Static assets
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 4. DATABASE DESIGN

### Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users      │────<│  addresses   │     │   brands     │
│              │     └──────────────┘     └──────┬───────┘
│  id (PK)     │                                 │
│  email       │     ┌──────────────┐     ┌──────┴───────┐
│  password    │     │  categories  │────<│  products    │
│  role (enum) │     └──────────────┘     │              │
│  full_name   │                          │  id (PK)     │
│  phone       │                          │  name        │
│  avatar      │                          │  slug        │
│  is_verified │     ┌──────────────┐     │  price       │
│  google_id   │     │product_images│>────│  category_id │
│  created_at  │     └──────────────┘     │  brand_id    │
│  updated_at  │                          │  description │
└──────┬───────┘     ┌──────────────┐     │  warranty_mo │
       │             │ product_specs│>────│  status      │
       │             └──────────────┘     └──────┬───────┘
       │                                         │
       │             ┌──────────────┐            │
       │             │compatibility │>───────────┤
       │             │   _rules     │            │
       │             └──────────────┘            │
       │                                         │
┌──────┴───────┐     ┌──────────────┐     ┌──────┴───────┐
│  cart_items   │>────│    carts     │     │  inventory   │
└──────────────┘     └──────────────┘     │              │
                                          │  product_id  │
┌──────────────┐     ┌──────────────┐     │  available   │
│    orders    │────<│ order_items  │     │  reserved    │
│              │     └──────────────┘     │  damaged     │
│  id (PK)     │                          │  incoming    │
│  user_id     │     ┌──────────────┐     └──────────────┘
│  total       │────<│  payments    │
│  status      │     └──────────────┘     ┌──────────────┐
│  address     │                          │   reviews    │
│  voucher_id  │     ┌──────────────┐     └──────────────┘
└──────┬───────┘     │  vouchers    │
       │             └──────────────┘     ┌──────────────┐
       │                                  │  suppliers   │
┌──────┴───────┐     ┌──────────────┐     └──────────────┘
│  warranty    │────<│repair_logs   │
│  _tickets    │     └──────────────┘     ┌──────────────┐
└──────────────┘                          │notifications │
                                          └──────────────┘
┌──────────────┐     ┌──────────────┐
│  stock_      │     │  audit_logs  │
│  movements   │     └──────────────┘
└──────────────┘
```

### Bảng chi tiết

#### `users`

| Column        | Type                                                      | Constraints               |
| ------------- | --------------------------------------------------------- | ------------------------- |
| id            | INT                                                       | PK, AUTO_INCREMENT        |
| email         | VARCHAR(255)                                              | UNIQUE, NOT NULL          |
| password      | VARCHAR(255)                                              | NULL (Google OAuth users) |
| role          | ENUM('customer','staff','technician','warehouse','admin') | DEFAULT 'customer'        |
| full_name     | VARCHAR(100)                                              | NOT NULL                  |
| phone         | VARCHAR(20)                                               | NULL                      |
| avatar        | VARCHAR(500)                                              | NULL                      |
| is_verified   | BOOLEAN                                                   | DEFAULT false             |
| google_id     | VARCHAR(255)                                              | NULL, UNIQUE              |
| refresh_token | VARCHAR(500)                                              | NULL                      |
| last_login_at | DATETIME                                                  | NULL                      |
| created_at    | DATETIME                                                  | DEFAULT NOW()             |
| updated_at    | DATETIME                                                  | ON UPDATE NOW()           |

#### `addresses`

| Column     | Type         | Constraints        |
| ---------- | ------------ | ------------------ |
| id         | INT          | PK, AUTO_INCREMENT |
| user_id    | INT          | FK → users.id      |
| full_name  | VARCHAR(100) | NOT NULL           |
| phone      | VARCHAR(20)  | NOT NULL           |
| province   | VARCHAR(100) | NOT NULL           |
| district   | VARCHAR(100) | NOT NULL           |
| ward       | VARCHAR(100) | NOT NULL           |
| street     | VARCHAR(255) | NOT NULL           |
| is_default | BOOLEAN      | DEFAULT false      |
| created_at | DATETIME     | DEFAULT NOW()      |

#### `categories`

| Column      | Type         | Constraints              |
| ----------- | ------------ | ------------------------ |
| id          | INT          | PK, AUTO_INCREMENT       |
| name        | VARCHAR(100) | NOT NULL                 |
| slug        | VARCHAR(100) | UNIQUE                   |
| description | TEXT         | NULL                     |
| image       | VARCHAR(500) | NULL                     |
| parent_id   | INT          | FK → categories.id, NULL |
| sort_order  | INT          | DEFAULT 0                |
| is_active   | BOOLEAN      | DEFAULT true             |
| created_at  | DATETIME     | DEFAULT NOW()            |

#### `brands`

| Column      | Type         | Constraints        |
| ----------- | ------------ | ------------------ |
| id          | INT          | PK, AUTO_INCREMENT |
| name        | VARCHAR(100) | NOT NULL           |
| slug        | VARCHAR(100) | UNIQUE             |
| logo        | VARCHAR(500) | NULL               |
| description | TEXT         | NULL               |
| is_active   | BOOLEAN      | DEFAULT true       |
| created_at  | DATETIME     | DEFAULT NOW()      |

#### `products`

| Column            | Type                                     | Constraints        |
| ----------------- | ---------------------------------------- | ------------------ |
| id                | INT                                      | PK, AUTO_INCREMENT |
| name              | VARCHAR(255)                             | NOT NULL           |
| slug              | VARCHAR(255)                             | UNIQUE             |
| sku               | VARCHAR(50)                              | UNIQUE             |
| price             | DECIMAL(12,0)                            | NOT NULL           |
| sale_price        | DECIMAL(12,0)                            | NULL               |
| category_id       | INT                                      | FK → categories.id |
| brand_id          | INT                                      | FK → brands.id     |
| supplier_id       | INT                                      | FK → suppliers.id  |
| description       | TEXT                                     | NULL               |
| short_description | VARCHAR(500)                             | NULL               |
| warranty_months   | INT                                      | DEFAULT 12         |
| weight            | DECIMAL(8,2)                             | NULL (gram)        |
| status            | ENUM('active','inactive','discontinued') | DEFAULT 'active'   |
| is_featured       | BOOLEAN                                  | DEFAULT false      |
| avg_rating        | DECIMAL(2,1)                             | DEFAULT 0          |
| review_count      | INT                                      | DEFAULT 0          |
| view_count        | INT                                      | DEFAULT 0          |
| sold_count        | INT                                      | DEFAULT 0          |
| created_at        | DATETIME                                 | DEFAULT NOW()      |
| updated_at        | DATETIME                                 | ON UPDATE NOW()    |

#### `product_images`

| Column     | Type         | Constraints        |
| ---------- | ------------ | ------------------ |
| id         | INT          | PK, AUTO_INCREMENT |
| product_id | INT          | FK → products.id   |
| url        | VARCHAR(500) | NOT NULL           |
| alt        | VARCHAR(255) | NULL               |
| sort_order | INT          | DEFAULT 0          |
| is_primary | BOOLEAN      | DEFAULT false      |

#### `product_specs`

| Column     | Type         | Constraints                                  |
| ---------- | ------------ | -------------------------------------------- |
| id         | INT          | PK, AUTO_INCREMENT                           |
| product_id | INT          | FK → products.id                             |
| spec_key   | VARCHAR(100) | NOT NULL (e.g., 'cpu', 'ram', 'socket_type') |
| spec_value | VARCHAR(500) | NOT NULL                                     |
| spec_group | VARCHAR(100) | NULL (e.g., 'Processor', 'Memory')           |
| sort_order | INT          | DEFAULT 0                                    |

#### `compatibility_rules`

| Column           | Type                                                   | Constraints                    |
| ---------------- | ------------------------------------------------------ | ------------------------------ |
| id               | INT                                                    | PK, AUTO_INCREMENT             |
| rule_type        | ENUM('socket','ram_type','form_factor','power','slot') | NOT NULL                       |
| component_type_a | VARCHAR(50)                                            | NOT NULL (e.g., 'cpu')         |
| spec_key_a       | VARCHAR(100)                                           | NOT NULL (e.g., 'socket_type') |
| component_type_b | VARCHAR(50)                                            | NOT NULL (e.g., 'mainboard')   |
| spec_key_b       | VARCHAR(100)                                           | NOT NULL (e.g., 'socket_type') |
| match_type       | ENUM('exact','contains','gte','lte')                   | DEFAULT 'exact'                |
| description      | VARCHAR(255)                                           | NULL                           |
| is_active        | BOOLEAN                                                | DEFAULT true                   |

#### `inventory`

| Column              | Type     | Constraints              |
| ------------------- | -------- | ------------------------ |
| id                  | INT      | PK, AUTO_INCREMENT       |
| product_id          | INT      | FK → products.id, UNIQUE |
| available_qty       | INT      | DEFAULT 0                |
| reserved_qty        | INT      | DEFAULT 0                |
| damaged_qty         | INT      | DEFAULT 0                |
| incoming_qty        | INT      | DEFAULT 0                |
| warranty_qty        | INT      | DEFAULT 0                |
| low_stock_threshold | INT      | DEFAULT 5                |
| updated_at          | DATETIME | ON UPDATE NOW()          |

#### `stock_movements`

| Column         | Type                                                                                           | Constraints                      |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| id             | INT                                                                                            | PK, AUTO_INCREMENT               |
| product_id     | INT                                                                                            | FK → products.id                 |
| type           | ENUM('import','export','reserve','release','damage','warranty_in','warranty_out','adjustment') | NOT NULL                         |
| quantity       | INT                                                                                            | NOT NULL                         |
| reference_type | VARCHAR(50)                                                                                    | NULL (e.g., 'order', 'warranty') |
| reference_id   | INT                                                                                            | NULL                             |
| note           | TEXT                                                                                           | NULL                             |
| performed_by   | INT                                                                                            | FK → users.id                    |
| created_at     | DATETIME                                                                                       | DEFAULT NOW()                    |

#### `carts`

| Column     | Type     | Constraints           |
| ---------- | -------- | --------------------- |
| id         | INT      | PK, AUTO_INCREMENT    |
| user_id    | INT      | FK → users.id, UNIQUE |
| updated_at | DATETIME | ON UPDATE NOW()       |

#### `cart_items`

| Column                      | Type     | Constraints         |
| --------------------------- | -------- | ------------------- |
| id                          | INT      | PK, AUTO_INCREMENT  |
| cart_id                     | INT      | FK → carts.id       |
| product_id                  | INT      | FK → products.id    |
| quantity                    | INT      | NOT NULL, CHECK > 0 |
| created_at                  | DATETIME | DEFAULT NOW()       |
| UNIQUE(cart_id, product_id) |          |                     |

#### `vouchers`

| Column          | Type                       | Constraints        |
| --------------- | -------------------------- | ------------------ |
| id              | INT                        | PK, AUTO_INCREMENT |
| code            | VARCHAR(50)                | UNIQUE, NOT NULL   |
| type            | ENUM('percentage','fixed') | NOT NULL           |
| value           | DECIMAL(12,0)              | NOT NULL           |
| min_order_value | DECIMAL(12,0)              | DEFAULT 0          |
| max_discount    | DECIMAL(12,0)              | NULL               |
| usage_limit     | INT                        | NULL               |
| used_count      | INT                        | DEFAULT 0          |
| start_date      | DATETIME                   | NOT NULL           |
| end_date        | DATETIME                   | NOT NULL           |
| is_active       | BOOLEAN                    | DEFAULT true       |
| created_at      | DATETIME                   | DEFAULT NOW()      |

#### `orders`

| Column           | Type                                                                                                        | Constraints            |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| id               | INT                                                                                                         | PK, AUTO_INCREMENT     |
| order_code       | VARCHAR(20)                                                                                                 | UNIQUE, NOT NULL       |
| user_id          | INT                                                                                                         | FK → users.id          |
| status           | ENUM('pending','confirmed','processing','packed','shipping','delivered','completed','cancelled','refunded') | DEFAULT 'pending'      |
| subtotal         | DECIMAL(12,0)                                                                                               | NOT NULL               |
| shipping_fee     | DECIMAL(12,0)                                                                                               | DEFAULT 0              |
| discount_amount  | DECIMAL(12,0)                                                                                               | DEFAULT 0              |
| total            | DECIMAL(12,0)                                                                                               | NOT NULL               |
| voucher_id       | INT                                                                                                         | FK → vouchers.id, NULL |
| shipping_address | JSON                                                                                                        | NOT NULL               |
| note             | TEXT                                                                                                        | NULL                   |
| cancelled_reason | TEXT                                                                                                        | NULL                   |
| confirmed_by     | INT                                                                                                         | FK → users.id, NULL    |
| confirmed_at     | DATETIME                                                                                                    | NULL                   |
| shipped_at       | DATETIME                                                                                                    | NULL                   |
| delivered_at     | DATETIME                                                                                                    | NULL                   |
| completed_at     | DATETIME                                                                                                    | NULL                   |
| created_at       | DATETIME                                                                                                    | DEFAULT NOW()          |
| updated_at       | DATETIME                                                                                                    | ON UPDATE NOW()        |

#### `order_items`

| Column         | Type          | Constraints         |
| -------------- | ------------- | ------------------- |
| id             | INT           | PK, AUTO_INCREMENT  |
| order_id       | INT           | FK → orders.id      |
| product_id     | INT           | FK → products.id    |
| product_name   | VARCHAR(255)  | NOT NULL (snapshot) |
| product_image  | VARCHAR(500)  | NULL (snapshot)     |
| price          | DECIMAL(12,0) | NOT NULL (snapshot) |
| quantity       | INT           | NOT NULL            |
| serial_numbers | JSON          | NULL                |
| warranty_start | DATE          | NULL                |
| warranty_end   | DATE          | NULL                |

#### `payments`

| Column         | Type                                                    | Constraints        |
| -------------- | ------------------------------------------------------- | ------------------ |
| id             | INT                                                     | PK, AUTO_INCREMENT |
| order_id       | INT                                                     | FK → orders.id     |
| method         | ENUM('vietqr','momo','cod')                             | NOT NULL           |
| amount         | DECIMAL(12,0)                                           | NOT NULL           |
| status         | ENUM('pending','processing','paid','failed','refunded') | DEFAULT 'pending'  |
| transaction_id | VARCHAR(100)                                            | NULL               |
| payment_data   | JSON                                                    | NULL               |
| paid_at        | DATETIME                                                | NULL               |
| created_at     | DATETIME                                                | DEFAULT NOW()      |
| updated_at     | DATETIME                                                | ON UPDATE NOW()    |

#### `warranty_tickets`

| Column            | Type                                                                                                  | Constraints                      |
| ----------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| id                | INT                                                                                                   | PK, AUTO_INCREMENT               |
| ticket_code       | VARCHAR(20)                                                                                           | UNIQUE, NOT NULL                 |
| user_id           | INT                                                                                                   | FK → users.id                    |
| order_item_id     | INT                                                                                                   | FK → order_items.id              |
| product_id        | INT                                                                                                   | FK → products.id                 |
| status            | ENUM('pending','received','diagnosing','repairing','waiting_parts','completed','returned','rejected') | DEFAULT 'pending'                |
| issue_description | TEXT                                                                                                  | NOT NULL                         |
| diagnosis         | TEXT                                                                                                  | NULL                             |
| resolution        | TEXT                                                                                                  | NULL                             |
| assigned_to       | INT                                                                                                   | FK → users.id (technician), NULL |
| estimated_days    | INT                                                                                                   | NULL                             |
| priority          | ENUM('low','medium','high','urgent')                                                                  | DEFAULT 'medium'                 |
| received_at       | DATETIME                                                                                              | NULL                             |
| completed_at      | DATETIME                                                                                              | NULL                             |
| returned_at       | DATETIME                                                                                              | NULL                             |
| created_at        | DATETIME                                                                                              | DEFAULT NOW()                    |
| updated_at        | DATETIME                                                                                              | ON UPDATE NOW()                  |

#### `repair_logs`

| Column       | Type        | Constraints              |
| ------------ | ----------- | ------------------------ |
| id           | INT         | PK, AUTO_INCREMENT       |
| ticket_id    | INT         | FK → warranty_tickets.id |
| status       | VARCHAR(50) | NOT NULL                 |
| note         | TEXT        | NULL                     |
| performed_by | INT         | FK → users.id            |
| created_at   | DATETIME    | DEFAULT NOW()            |

#### `reviews`

| Column                         | Type     | Constraints         |
| ------------------------------ | -------- | ------------------- |
| id                             | INT      | PK, AUTO_INCREMENT  |
| product_id                     | INT      | FK → products.id    |
| user_id                        | INT      | FK → users.id       |
| order_item_id                  | INT      | FK → order_items.id |
| rating                         | TINYINT  | NOT NULL, CHECK 1-5 |
| comment                        | TEXT     | NULL                |
| images                         | JSON     | NULL                |
| is_verified                    | BOOLEAN  | DEFAULT false       |
| created_at                     | DATETIME | DEFAULT NOW()       |
| UNIQUE(user_id, order_item_id) |          |                     |

#### `suppliers`

| Column       | Type         | Constraints        |
| ------------ | ------------ | ------------------ |
| id           | INT          | PK, AUTO_INCREMENT |
| name         | VARCHAR(255) | NOT NULL           |
| contact_name | VARCHAR(100) | NULL               |
| email        | VARCHAR(255) | NULL               |
| phone        | VARCHAR(20)  | NULL               |
| address      | TEXT         | NULL               |
| is_active    | BOOLEAN      | DEFAULT true       |
| created_at   | DATETIME     | DEFAULT NOW()      |

#### `notifications`

| Column     | Type                                                           | Constraints                 |
| ---------- | -------------------------------------------------------------- | --------------------------- |
| id         | INT                                                            | PK, AUTO_INCREMENT          |
| user_id    | INT                                                            | FK → users.id               |
| type       | ENUM('order','payment','shipping','warranty','system','stock') | NOT NULL                    |
| title      | VARCHAR(255)                                                   | NOT NULL                    |
| content    | TEXT                                                           | NOT NULL                    |
| data       | JSON                                                           | NULL (reference link, etc.) |
| is_read    | BOOLEAN                                                        | DEFAULT false               |
| created_at | DATETIME                                                       | DEFAULT NOW()               |

#### `audit_logs`

| Column      | Type         | Constraints         |
| ----------- | ------------ | ------------------- |
| id          | INT          | PK, AUTO_INCREMENT  |
| user_id     | INT          | FK → users.id, NULL |
| action      | VARCHAR(100) | NOT NULL            |
| entity_type | VARCHAR(50)  | NOT NULL            |
| entity_id   | INT          | NULL                |
| old_data    | JSON         | NULL                |
| new_data    | JSON         | NULL                |
| ip_address  | VARCHAR(45)  | NULL                |
| user_agent  | TEXT         | NULL                |
| created_at  | DATETIME     | DEFAULT NOW()       |

---

## 5. MODULE CHI TIẾT (Backend)

### Module Dependency Map

```
AuthModule ──────────────────────────────────────────────── (Foundation)
   │
UsersModule ──────────────────────────────────────────────── (Foundation)
   │
CategoriesModule ─┬─ ProductsModule ─┬─ InventoryModule    (Core)
BrandsModule ──────┘                  │
SuppliersModule ──────────────────────┘
   │
CartModule ─── OrdersModule ─── PaymentsModule              (Transaction)
   │                │
   │                ├─── ShippingModule
   │                │
   │                └─── WarrantyModule ─── RepairModule    (Service)
   │
PcBuildModule ─────────────────────────────────────────────  (Business Logic)
   │
ReviewsModule ─────────────────────────────────────────────  (Engagement)
   │
NotificationsModule ───────────────────────────────────────  (Infrastructure)
DashboardModule ───────────────────────────────────────────  (Analytics)
UploadModule ──────────────────────────────────────────────  (Infrastructure)
```

### Module Details

| Module                  | Entities                                | Key Logic                                                                         |
| ----------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **AuthModule**          | —                                       | JWT, Refresh Token, Google OAuth, Redis revocation, Email verify, Forgot password |
| **UsersModule**         | users, addresses                        | CRUD users, profile, address management                                           |
| **CategoriesModule**    | categories                              | Tree structure categories, CRUD                                                   |
| **BrandsModule**        | brands                                  | Brand CRUD                                                                        |
| **ProductsModule**      | products, product_images, product_specs | Full product CRUD, search, filter, sort, pagination                               |
| **InventoryModule**     | inventory, stock_movements              | Stock reservation, import/export, low-stock alert, RMA                            |
| **CartModule**          | carts, cart_items                       | Add/remove/update cart, cart validation                                           |
| **OrdersModule**        | orders, order_items                     | Create order, status workflow, cancel, refund                                     |
| **PaymentsModule**      | payments                                | VietQR/MoMo/COD fake gateway, webhook pattern, payment status                     |
| **ShippingModule**      | — (embedded in orders)                  | Shipping fee calculation, tracking                                                |
| **WarrantyModule**      | warranty_tickets, repair_logs           | Ticket CRUD, assign technician, status workflow                                   |
| **PcBuildModule**       | compatibility_rules                     | Compatibility validation engine, suggest components                               |
| **ReviewsModule**       | reviews                                 | CRUD reviews, verified purchase check                                             |
| **SuppliersModule**     | suppliers                               | Supplier CRUD, link to products                                                   |
| **NotificationsModule** | notifications                           | BullMQ queue, Socket.IO realtime, email (Brevo)                                   |
| **DashboardModule**     | — (aggregate queries)                   | Revenue, orders, top products, charts data                                        |
| **UploadModule**        | —                                       | Cloudinary upload images                                                          |

### 5.1 Layered Structure Blueprint (Áp dụng cho mọi module)

```text
src/modules/<module>/
├── controllers/               # Presentation layer
│   ├── public/
│   ├── admin/
│   └── internal/
├── dtos/                      # Input/output contracts
│   ├── requests/
│   ├── responses/
│   └── queries/
├── services/                  # Application layer (business rules)
├── entities/                  # Domain data shape (TypeORM entities)
├── repositories/              # Infrastructure layer (custom repos/query objects)
├── events/                    # Domain events + handlers
└── <module>.module.ts
```

### 5.2 AuthModule (chi tiết)

- **Controllers**: `auth.controller.ts` (register/login/refresh/logout/oauth/verify/reset)
- **Services**: `auth.service.ts`, `token.service.ts`, `oauth.service.ts`
- **DTOs**: `RegisterDto`, `LoginDto`, `RefreshTokenDto`, `ForgotPasswordDto`, `ResetPasswordDto`
- **Events**: `user.registered`, `user.logged_in`
- **Entities/Infra**: `refresh_tokens` (or Redis token whitelist/blacklist)

**Validation rules chính:**

- Email RFC-compliant + normalize lowercase
- Password tối thiểu 8 ký tự, có chữ hoa/thường/số/ký tự đặc biệt
- Refresh token rotation + revoke on suspicious activity

### 5.3 Product + Inventory modules (chi tiết)

- **Product Controllers**: public listing/detail, admin CRUD, images/specs
- **Product Services**: search/filter/sort/paginate, snapshot fields for order flow
- **Inventory Services**: reserve/release/confirm stock, adjustment/import/export
- **DTOs**:
  - `CreateProductDto`, `UpdateProductDto`, `QueryProductDto`
  - `ImportStockDto`, `ExportStockDto`, `AdjustStockDto`
- **Events**:
  - `product.created`, `product.updated`
  - `inventory.low_stock`, `inventory.adjusted`

**Repository/query guidelines:**

- QueryBuilder cho filter phức tạp
- Projection fields cho list endpoints (tránh select `*`)
- Pagination bắt buộc cho admin/public list lớn

### 5.4 Order + Payment modules (chi tiết)

- **Order Controllers**: checkout, list own orders, admin/staff moderation endpoints
- **Payment Controllers**: create payment session, webhook callbacks, payment status
- **Services**:
  - `OrdersService`: orchestration transaction create order + reserve stock
  - `PaymentsService`: verify callback signature, idempotency, state transition
- **DTOs**:
  - `CheckoutDto`, `UpdateOrderStatusDto`
  - `CreatePaymentDto`, `PaymentWebhookDto`
- **Events**:
  - `order.created`, `order.cancelled`, `order.status_changed`
  - `payment.completed`, `payment.failed`

**Cross-module contract bắt buộc:**

- Orders không update stock trực tiếp qua table khác module; gọi InventoryService hoặc emit event
- Payment webhook luôn idempotent theo `provider + transaction_id`

### 5.5 Warranty + Review modules (chi tiết)

- **Warranty Controllers**: customer create/list/detail, admin assign/status, technician logs
- **Warranty Services**: validate eligibility, workflow status machine, SLA counters
- **Review Controllers**: create/update/delete, admin moderation summary/list
- **Review Services**: verified purchase check, update product rating aggregate
- **DTOs**:
  - `CreateWarrantyTicketDto`, `AssignTechnicianDto`, `UpdateWarrantyStatusDto`
  - `CreateReviewDto`, `UpdateReviewDto`, `QueryAdminReviewDto`
- **Events**:
  - `warranty.created`, `warranty.status_changed`
  - `review.created`, `review.deleted`

### 5.6 Module-level code template (NestJS)

```ts
// controller (presentation)
@Post()
create(@Body() dto: CreateXDto) {
  return this.xService.create(dto);
}

// service (application)
async create(dto: CreateXDto) {
  // validate business rules
  // call repository
  // emit domain event
}
```

### 5.7 Event handlers pattern

- Mỗi event có payload versioned: `{ version: 1, data: ... }`
- Handler idempotent (check processed-event table/Redis key)
- Retry + dead-letter queue cho job thất bại nhiều lần
- Log correlation id xuyên suốt event chain

---

## 6. API ENDPOINTS

### Auth (`/api/auth`)

| Method | Endpoint         | Access | Description                 |
| ------ | ---------------- | ------ | --------------------------- |
| POST   | /register        | Public | Đăng ký tài khoản           |
| POST   | /login           | Public | Đăng nhập                   |
| POST   | /logout          | Auth   | Đăng xuất (revoke token)    |
| POST   | /refresh         | Public | Refresh access token        |
| GET    | /google          | Public | Google OAuth redirect       |
| GET    | /google/callback | Public | Google OAuth callback       |
| POST   | /forgot-password | Public | Gửi email reset password    |
| POST   | /reset-password  | Public | Reset password bằng token   |
| POST   | /verify-email    | Public | Verify email bằng token     |
| GET    | /me              | Auth   | Lấy thông tin user hiện tại |

### Users (`/api/users`)

| Method | Endpoint       | Access | Description                  |
| ------ | -------------- | ------ | ---------------------------- |
| GET    | /              | Admin  | Danh sách users (paginated)  |
| GET    | /:id           | Admin  | Chi tiết user                |
| PATCH  | /:id           | Admin  | Cập nhật user (role, status) |
| DELETE | /:id           | Admin  | Xoá user (soft delete)       |
| PATCH  | /profile       | Auth   | Cập nhật profile cá nhân     |
| POST   | /addresses     | Auth   | Thêm địa chỉ                 |
| GET    | /addresses     | Auth   | Danh sách địa chỉ            |
| PATCH  | /addresses/:id | Auth   | Cập nhật địa chỉ             |
| DELETE | /addresses/:id | Auth   | Xoá địa chỉ                  |

### Categories (`/api/categories`)

| Method | Endpoint | Access | Description                 |
| ------ | -------- | ------ | --------------------------- |
| GET    | /        | Public | Danh sách categories (tree) |
| GET    | /:slug   | Public | Chi tiết category           |
| POST   | /        | Admin  | Tạo category                |
| PATCH  | /:id     | Admin  | Cập nhật category           |
| DELETE | /:id     | Admin  | Xoá category                |

### Brands (`/api/brands`)

| Method | Endpoint | Access | Description      |
| ------ | -------- | ------ | ---------------- |
| GET    | /        | Public | Danh sách brands |
| POST   | /        | Admin  | Tạo brand        |
| PATCH  | /:id     | Admin  | Cập nhật brand   |
| DELETE | /:id     | Admin  | Xoá brand        |

### Products (`/api/products`)

| Method | Endpoint             | Access | Description                                         |
| ------ | -------------------- | ------ | --------------------------------------------------- |
| GET    | /                    | Public | Danh sách sản phẩm (search, filter, sort, paginate) |
| GET    | /featured            | Public | Sản phẩm nổi bật                                    |
| GET    | /:slug               | Public | Chi tiết sản phẩm                                   |
| POST   | /                    | Admin  | Tạo sản phẩm                                        |
| PATCH  | /:id                 | Admin  | Cập nhật sản phẩm                                   |
| DELETE | /:id                 | Admin  | Xoá sản phẩm                                        |
| POST   | /:id/specs           | Admin  | Thêm/cập nhật specs                                 |
| POST   | /:id/images          | Admin  | Upload ảnh sản phẩm                                 |
| DELETE | /:id/images/:imageId | Admin  | Xoá ảnh sản phẩm                                    |

### Cart (`/api/cart`)

| Method | Endpoint   | Access | Description           |
| ------ | ---------- | ------ | --------------------- |
| GET    | /          | Auth   | Lấy giỏ hàng          |
| POST   | /items     | Auth   | Thêm sản phẩm vào giỏ |
| PATCH  | /items/:id | Auth   | Cập nhật số lượng     |
| DELETE | /items/:id | Auth   | Xoá item khỏi giỏ     |
| DELETE | /          | Auth   | Xoá toàn bộ giỏ       |

### Orders (`/api/orders`)

| Method | Endpoint     | Access       | Description                     |
| ------ | ------------ | ------------ | ------------------------------- |
| POST   | /            | Auth         | Tạo đơn hàng (checkout)         |
| GET    | /            | Auth         | Danh sách đơn hàng (user's own) |
| GET    | /all         | Staff, Admin | Tất cả đơn hàng (paginated)     |
| GET    | /:id         | Auth         | Chi tiết đơn hàng               |
| PATCH  | /:id/status  | Staff, Admin | Cập nhật trạng thái             |
| PATCH  | /:id/confirm | Staff, Admin | Xác nhận đơn hàng               |
| POST   | /:id/cancel  | Auth         | Hủy đơn hàng                    |
| POST   | /:id/refund  | Staff, Admin | Hoàn tiền                       |

### Payments (`/api/payments`)

| Method | Endpoint           | Access | Description                    |
| ------ | ------------------ | ------ | ------------------------------ |
| POST   | /create            | Auth   | Tạo thanh toán                 |
| POST   | /webhook/vietqr    | Public | Webhook VietQR callback        |
| POST   | /webhook/momo      | Public | Webhook MoMo callback          |
| GET    | /:orderId/status   | Auth   | Kiểm tra trạng thái thanh toán |
| POST   | /simulate/:orderId | Admin  | Simulate payment success (dev) |

### Inventory (`/api/inventory`)

| Method | Endpoint              | Access           | Description               |
| ------ | --------------------- | ---------------- | ------------------------- |
| GET    | /                     | Warehouse, Admin | Danh sách tồn kho         |
| GET    | /:productId           | Warehouse, Admin | Chi tiết tồn kho sản phẩm |
| POST   | /import               | Warehouse, Admin | Nhập hàng                 |
| POST   | /export               | Warehouse, Admin | Xuất hàng                 |
| POST   | /adjust               | Warehouse, Admin | Điều chỉnh kho            |
| GET    | /low-stock            | Warehouse, Admin | Sản phẩm sắp hết hàng     |
| GET    | /movements            | Warehouse, Admin | Lịch sử xuất nhập kho     |
| GET    | /movements/:productId | Warehouse, Admin | Lịch sử theo sản phẩm     |

### Warranty (`/api/warranty`)

| Method | Endpoint    | Access            | Description                   |
| ------ | ----------- | ----------------- | ----------------------------- |
| POST   | /           | Auth              | Tạo ticket bảo hành           |
| GET    | /           | Auth              | Danh sách ticket (user's own) |
| GET    | /all        | Technician, Admin | Tất cả tickets                |
| GET    | /:id        | Auth              | Chi tiết ticket               |
| PATCH  | /:id/assign | Admin             | Assign technician             |
| PATCH  | /:id/status | Technician, Admin | Cập nhật trạng thái           |
| POST   | /:id/logs   | Technician        | Thêm repair log               |
| GET    | /:id/logs   | Auth              | Xem repair logs               |

### PC Build (`/api/pc-build`)

| Method | Endpoint          | Access | Description                   |
| ------ | ----------------- | ------ | ----------------------------- |
| GET    | /components/:type | Public | Danh sách linh kiện theo loại |
| POST   | /check            | Public | Kiểm tra compatibility        |
| POST   | /suggest          | Public | Gợi ý linh kiện compatible    |
| GET    | /rules            | Admin  | Danh sách compatibility rules |
| POST   | /rules            | Admin  | Tạo rule                      |
| PATCH  | /rules/:id        | Admin  | Cập nhật rule                 |
| DELETE | /rules/:id        | Admin  | Xoá rule                      |

### Reviews (`/api/reviews`)

| Method | Endpoint            | Access              | Description                    |
| ------ | ------------------- | ------------------- | ------------------------------ |
| GET    | /product/:productId | Public              | Reviews theo sản phẩm          |
| POST   | /                   | Auth                | Tạo review (verified purchase) |
| PATCH  | /:id                | Auth (owner)        | Sửa review                     |
| DELETE | /:id                | Auth (owner), Admin | Xoá review                     |

### Suppliers (`/api/suppliers`)

| Method | Endpoint | Access | Description         |
| ------ | -------- | ------ | ------------------- |
| GET    | /        | Admin  | Danh sách suppliers |
| POST   | /        | Admin  | Tạo supplier        |
| PATCH  | /:id     | Admin  | Cập nhật supplier   |
| DELETE | /:id     | Admin  | Xoá supplier        |

### Notifications (`/api/notifications`)

| Method | Endpoint      | Access | Description           |
| ------ | ------------- | ------ | --------------------- |
| GET    | /             | Auth   | Danh sách thông báo   |
| PATCH  | /:id/read     | Auth   | Đánh dấu đã đọc       |
| PATCH  | /read-all     | Auth   | Đọc tất cả            |
| GET    | /unread-count | Auth   | Số thông báo chưa đọc |

### Shipping (`/api/shipping`)

| Method | Endpoint           | Access | Description       |
| ------ | ------------------ | ------ | ----------------- |
| POST   | /calculate         | Auth   | Tính phí ship     |
| GET    | /tracking/:orderId | Auth   | Tracking đơn hàng |

### Dashboard (`/api/dashboard`)

| Method | Endpoint          | Access | Description                        |
| ------ | ----------------- | ------ | ---------------------------------- |
| GET    | /overview         | Admin  | Tổng quan (revenue, orders, users) |
| GET    | /revenue          | Admin  | Doanh thu theo thời gian           |
| GET    | /top-products     | Admin  | Top sản phẩm bán chạy              |
| GET    | /order-stats      | Admin  | Thống kê đơn hàng                  |
| GET    | /warranty-stats   | Admin  | Thống kê bảo hành                  |
| GET    | /inventory-alerts | Admin  | Cảnh báo tồn kho                   |

### Upload (`/api/upload`)

| Method | Endpoint         | Access | Description               |
| ------ | ---------------- | ------ | ------------------------- |
| POST   | /image           | Auth   | Upload ảnh lên Cloudinary |
| DELETE | /image/:publicId | Auth   | Xoá ảnh                   |

---

## 7. FRONTEND PAGES

### Customer Pages

| Page           | Route               | Description                           |
| -------------- | ------------------- | ------------------------------------- |
| Home           | `/`                 | Banner, featured products, categories |
| Products       | `/products`         | Listing + filter + search + sort      |
| Product Detail | `/products/[slug]`  | Specs, images, reviews, add to cart   |
| PC Builder     | `/pc-build`         | Interactive PC builder                |
| Cart           | `/cart`             | Cart management                       |
| Checkout       | `/checkout`         | Address, voucher, payment method      |
| Payment        | `/checkout/payment` | QR code / MoMo redirect               |
| My Orders      | `/orders`           | Order list + tracking                 |
| Order Detail   | `/orders/[id]`      | Order detail + status                 |
| Warranty       | `/warranty`         | Submit warranty request               |
| My Warranties  | `/warranty/list`    | Warranty tickets list                 |
| Profile        | `/profile`          | User info, addresses                  |
| Notifications  | `/notifications`    | Notification list                     |

### Auth Pages

| Page            | Route              |
| --------------- | ------------------ |
| Login           | `/login`           |
| Register        | `/register`        |
| Forgot Password | `/forgot-password` |
| Reset Password  | `/reset-password`  |
| Verify Email    | `/verify-email`    |

### Staff Panel

| Page             | Route                |
| ---------------- | -------------------- |
| Orders Dashboard | `/staff/orders`      |
| Order Process    | `/staff/orders/[id]` |
| Customer Support | `/staff/customers`   |

### Technician Panel

| Page           | Route                      |
| -------------- | -------------------------- |
| My Tickets     | `/technician/tickets`      |
| Ticket Detail  | `/technician/tickets/[id]` |
| Repair History | `/technician/history`      |

### Warehouse Panel

| Page             | Route                  |
| ---------------- | ---------------------- |
| Stock Overview   | `/warehouse/stock`     |
| Import Goods     | `/warehouse/import`    |
| Export Goods     | `/warehouse/export`    |
| Low Stock Alerts | `/warehouse/alerts`    |
| Movement History | `/warehouse/movements` |

### Admin Dashboard

| Page                | Route               |
| ------------------- | ------------------- |
| Dashboard           | `/admin/dashboard`  |
| User Management     | `/admin/users`      |
| Product Management  | `/admin/products`   |
| Category Management | `/admin/categories` |
| Order Management    | `/admin/orders`     |
| Inventory           | `/admin/inventory`  |
| Warranty Management | `/admin/warranty`   |
| Suppliers           | `/admin/suppliers`  |
| Vouchers            | `/admin/vouchers`   |
| Reports             | `/admin/reports`    |
| Settings            | `/admin/settings`   |

---

## 8. PHASE BREAKDOWN & TIMELINE

### 🔵 PHASE 1 — Foundation (Tuần 1-2)

**Mục tiêu:** Project skeleton + Auth + User hoàn chỉnh

| Task                           | Chi tiết                                                 | Estimate     |
| ------------------------------ | -------------------------------------------------------- | ------------ |
| Project Setup BE               | NestJS + TypeORM + MySQL + Redis + Docker Compose        | 1 ngày       |
| Project Setup FE               | Next.js + TailwindCSS + shadcn/ui + Zustand              | 1 ngày       |
| Config Module                  | Environment config, validation                           | 0.5 ngày     |
| Database Setup                 | Data source, migrations cơ bản                           | 0.5 ngày     |
| Auth Module (BE)               | Register, Login, JWT, Refresh Token, Redis revocation    | 2 ngày       |
| Google OAuth                   | Passport Google Strategy                                 | 1 ngày       |
| Email Verify + Forgot Password | Brevo email service                                      | 1 ngày       |
| RBAC Guards                    | Role guard, Auth guard                                   | 0.5 ngày     |
| User Module (BE)               | CRUD, profile, addresses                                 | 1 ngày       |
| Auth Pages (FE)                | Login, Register, Forgot password UI                      | 2 ngày       |
| Global Setup (BE)              | Exception filter, validation pipe, interceptors, Swagger | 1 ngày       |
| **Tổng**                       |                                                          | **~11 ngày** |

**Deliverable:** Auth system hoàn chỉnh, Swagger docs, Login/Register UI

---

### 🟢 PHASE 2 — Core Commerce (Tuần 3-5)

**Mục tiêu:** Product + Cart + Order hoạt động end-to-end

| Task                         | Chi tiết                                              | Estimate     |
| ---------------------------- | ----------------------------------------------------- | ------------ |
| Category + Brand Module (BE) | CRUD, tree categories                                 | 1 ngày       |
| Product Module (BE)          | CRUD, search, filter, sort, pagination, specs, images | 3 ngày       |
| Upload Module                | Cloudinary integration                                | 0.5 ngày     |
| Supplier Module (BE)         | CRUD suppliers                                        | 0.5 ngày     |
| Cart Module (BE)             | Add, update, remove, validation                       | 1.5 ngày     |
| Voucher Module (BE)          | CRUD vouchers, validate, apply                        | 1 ngày       |
| Order Module (BE)            | Create order, status workflow, cancel                 | 3 ngày       |
| Shipping Module (BE)         | Fee calculation, tracking                             | 1 ngày       |
| Homepage (FE)                | Banner, featured, categories                          | 2 ngày       |
| Product Pages (FE)           | Listing, detail, filters                              | 3 ngày       |
| Cart + Checkout (FE)         | Cart drawer, checkout flow                            | 2 ngày       |
| Order Pages (FE)             | Order list, detail, tracking                          | 1.5 ngày     |
| **Tổng**                     |                                                       | **~20 ngày** |

**Deliverable:** Khách hàng có thể browse → add to cart → checkout → track order

---

### 🟡 PHASE 3 — Payment & Inventory (Tuần 6-7)

**Mục tiêu:** Payment flow + Stock reservation chống bán âm kho

| Task                               | Chi tiết                                                           | Estimate     |
| ---------------------------------- | ------------------------------------------------------------------ | ------------ |
| Payment Module (BE)                | VietQR, MoMo, COD — fake gateway + webhook pattern                 | 2 ngày       |
| Stock Reservation System           | Reserve on checkout, release on cancel/timeout, confirm on payment | 2 ngày       |
| Inventory Module (BE)              | Import, export, adjust, movement history, low-stock alert          | 2 ngày       |
| Payment UI (FE)                    | QR display, MoMo redirect, COD confirm                             | 1.5 ngày     |
| Warehouse Pages (FE)               | Stock overview, import/export forms, alerts                        | 2 ngày       |
| Cron: Release expired reservations | BullMQ scheduled job                                               | 0.5 ngày     |
| **Tổng**                           |                                                                    | **~10 ngày** |

**Deliverable:** Full payment flow, inventory management, stock reservation

---

### 🟠 PHASE 4 — Business Logic (Tuần 8-10)

**Mục tiêu:** PC Build + Warranty — feature tạo sự khác biệt

| Task                  | Chi tiết                                                           | Estimate     |
| --------------------- | ------------------------------------------------------------------ | ------------ |
| PC Build Module (BE)  | Compatibility engine, rules management, suggest                    | 3 ngày       |
| PC Build UI (FE)      | Interactive builder, drag-drop components, compatibility indicator | 3 ngày       |
| Warranty Module (BE)  | Ticket CRUD, assign, status workflow, repair logs                  | 2.5 ngày     |
| Warranty UI (FE)      | Submit form, ticket list, status tracking                          | 2 ngày       |
| Technician Panel (FE) | Ticket management, repair workflow                                 | 1.5 ngày     |
| Review Module (BE)    | CRUD, verified purchase, rating calculation                        | 1 ngày       |
| Review UI (FE)        | Review form, review list on product detail                         | 1 ngày       |
| **Tổng**              |                                                                    | **~14 ngày** |

**Deliverable:** PC builder engine, warranty system, review system

---

### 🔴 PHASE 5 — Notification & Dashboard (Tuần 11-12)

**Mục tiêu:** Realtime notifications + Admin analytics

| Task                     | Chi tiết                                              | Estimate     |
| ------------------------ | ----------------------------------------------------- | ------------ |
| Notification Module (BE) | BullMQ queue, Socket.IO gateway, email service        | 2 ngày       |
| Integrate notifications  | Order, payment, shipping, warranty events → queue     | 1.5 ngày     |
| Notification UI (FE)     | Bell icon, dropdown, notification page, realtime      | 1.5 ngày     |
| Dashboard Module (BE)    | Revenue, orders, top products, warranty stats queries | 2 ngày       |
| Dashboard UI (FE)        | Charts (recharts), stats cards, tables                | 3 ngày       |
| Staff Panel (FE)         | Order processing, customer support pages              | 2 ngày       |
| **Tổng**                 |                                                       | **~12 ngày** |

**Deliverable:** Realtime notifications, admin dashboard with charts

---

### ⚫ PHASE 6 — Production (Tuần 13-14)

**Mục tiêu:** Security + Logging + Deploy + CI/CD

| Task               | Chi tiết                                                     | Estimate     |
| ------------------ | ------------------------------------------------------------ | ------------ |
| Security hardening | Input sanitization, XSS, CSRF, secure cookies, rate limiting | 1.5 ngày     |
| Logging            | Winston logger, structured logs, audit logs                  | 1 ngày       |
| Error Monitoring   | Sentry integration (BE + FE)                                 | 0.5 ngày     |
| Health Check       | Terminus health check endpoint                               | 0.5 ngày     |
| Docker             | Production Dockerfile, docker-compose                        | 1 ngày       |
| CI/CD              | GitHub Actions: lint, test, build, deploy                    | 1 ngày       |
| Deploy BE          | Railway / Render                                             | 0.5 ngày     |
| Deploy FE          | Vercel                                                       | 0.5 ngày     |
| Deploy DB          | Clever Cloud MySQL + Redis Cloud                             | 0.5 ngày     |
| Testing            | Unit tests (services), E2E tests (critical flows)            | 3 ngày       |
| Documentation      | README, API docs, .env.example                               | 1 ngày       |
| **Tổng**           |                                                              | **~11 ngày** |

**Deliverable:** Production system chạy trên internet, CI/CD, monitoring

---

### 📊 Timeline Summary

```
Tuần 1-2   ████████████  Phase 1 — Foundation (Auth + User)
Tuần 3-5   ████████████████████  Phase 2 — Core Commerce (Product + Cart + Order)
Tuần 6-7   ██████████  Phase 3 — Payment & Inventory
Tuần 8-10  ██████████████  Phase 4 — Business Logic (PC Build + Warranty)
Tuần 11-12 ████████████  Phase 5 — Notification & Dashboard
Tuần 13-14 ███████████  Phase 6 — Production (Security + Deploy)

Tổng cộng: ~14 tuần (~3.5 tháng)
```

---

## 9. TECH STACK CHI TIẾT

### Backend

| Tech                   | Purpose                     | Version |
| ---------------------- | --------------------------- | ------- |
| **NestJS**             | Framework                   | 10.x    |
| **TypeScript**         | Language                    | 5.x     |
| **TypeORM**            | ORM                         | 0.3.x   |
| **MySQL**              | Database                    | 8.x     |
| **Redis**              | Cache + Token Store + Queue | 7.x     |
| **BullMQ**             | Job Queue                   | 5.x     |
| **Socket.IO**          | Realtime                    | 4.x     |
| **Passport.js**        | Auth strategies             | 0.7.x   |
| **JWT**                | Token auth                  | —       |
| **class-validator**    | DTO validation              | —       |
| **class-transformer**  | DTO transform               | —       |
| **@nestjs/swagger**    | API docs                    | —       |
| **@nestjs/throttler**  | Rate limiting               | —       |
| **@nestjs/terminus**   | Health check                | —       |
| **Cloudinary**         | Image upload                | —       |
| **Brevo (Sendinblue)** | Email                       | —       |
| **Winston**            | Logger                      | 3.x     |
| **Sentry**             | Error tracking              | —       |
| **bcrypt**             | Password hash               | —       |
| **helmet**             | Security headers            | —       |

### Frontend

| Tech                      | Purpose                | Version |
| ------------------------- | ---------------------- | ------- |
| **Next.js**               | Framework (App Router) | 14.x    |
| **TypeScript**            | Language               | 5.x     |
| **TailwindCSS**           | Styling                | 3.x     |
| **shadcn/ui**             | UI Components          | latest  |
| **Zustand**               | State management       | 4.x     |
| **Axios**                 | HTTP client            | 1.x     |
| **React Hook Form**       | Form handling          | 7.x     |
| **Zod**                   | Form validation        | 3.x     |
| **Recharts**              | Charts                 | 2.x     |
| **Lucide React**          | Icons                  | latest  |
| **Socket.IO Client**      | Realtime               | 4.x     |
| **next-auth**             | Auth (optional)        | 4.x     |
| **react-hot-toast**       | Toast notifications    | —       |
| **@tanstack/react-query** | Server state           | 5.x     |

### DevOps

| Tech                 | Purpose               |
| -------------------- | --------------------- |
| **Docker**           | Containerization      |
| **Docker Compose**   | Local dev environment |
| **GitHub Actions**   | CI/CD                 |
| **Render / Railway** | Backend hosting       |
| **Vercel**           | Frontend hosting      |
| **Clever Cloud**     | MySQL hosting         |
| **Redis Cloud**      | Redis hosting         |
| **Cloudinary**       | Image CDN             |

---

## 10. DEPLOY & CI/CD

### Docker Compose (Local Dev)

```yaml
services:
  mysql:
    image: mysql:8
    ports: ['3306:3306']
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: laptop_store
    volumes: [mysql_data:/var/lib/mysql]

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  backend:
    build: ./BeShopLapTop
    ports: ['3001:3001']
    depends_on: [mysql, redis]
    env_file: .env

volumes:
  mysql_data:
```

### CI/CD Pipeline (GitHub Actions)

```
Push to main
    │
    ├── Lint (eslint)
    ├── Type Check (tsc)
    ├── Unit Tests (jest)
    │
    ├── Build Docker Image
    │
    ├── Deploy Backend → Render/Railway
    └── Deploy Frontend → Vercel (auto)
```

### Environment Variables

```env
# Database
DB_HOST=
DB_PORT=3306
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=laptop_store

# Redis
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Brevo)
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=

# Sentry
SENTRY_DSN=

# App
APP_PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## 11. KEY ALGORITHMS

### Stock Reservation Flow

```
Customer Checkout
    │
    ├── 1. Validate cart items (price, availability)
    ├── 2. BEGIN TRANSACTION
    │      ├── Lock inventory rows (SELECT ... FOR UPDATE)
    │      ├── Check: available_qty >= requested_qty
    │      ├── Reserve: available_qty -= qty, reserved_qty += qty
    │      ├── Create order (status: pending)
    │      ├── Create order_items
    │      ├── Create stock_movements (type: reserve)
    │      └── COMMIT
    │
    ├── 3. Start payment timer (15 min)
    │
    ├── Payment SUCCESS:
    │      ├── reserved_qty -= qty
    │      ├── Order status → confirmed
    │      └── stock_movement (type: export)
    │
    ├── Payment TIMEOUT / CANCEL:
    │      ├── reserved_qty -= qty
    │      ├── available_qty += qty
    │      ├── Order status → cancelled
    │      └── stock_movement (type: release)
    │
    └── Cron Job: Every 5 min → release expired reservations
```

### PC Compatibility Check

```
Input: Selected components { cpu, mainboard, ram, vga, psu, case }
    │
    ├── 1. Load compatibility_rules from DB
    │
    ├── 2. For each rule:
    │      ├── Get spec_value from component A
    │      ├── Get spec_value from component B
    │      ├── Match based on match_type:
    │      │    ├── exact: A === B
    │      │    ├── contains: A.includes(B)
    │      │    ├── gte: A >= B (power)
    │      │    └── lte: A <= B (size)
    │      └── Return { compatible: boolean, message: string }
    │
    ├── 3. Aggregate results
    │      ├── All pass → ✅ Compatible Build
    │      └── Any fail → ❌ Show incompatible pairs
    │
    └── Output: { compatible, issues[], suggestions[] }
```

### Warranty Status Machine

```
                    ┌─────────────┐
                    │   PENDING   │ (Customer submit)
                    └──────┬──────┘
                           │ Staff receives device
                    ┌──────▼──────┐
                    │  RECEIVED   │
                    └──────┬──────┘
                           │ Technician assigned
                    ┌──────▼──────┐
                    │ DIAGNOSING  │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                │                     │
         ┌──────▼──────┐      ┌──────▼──────┐
         │  REPAIRING  │      │  REJECTED   │ (Not in warranty)
         └──────┬──────┘      └─────────────┘
                │
         ┌──────▼────────────┐
         │  WAITING_PARTS    │ (Optional)
         └──────┬────────────┘
                │
         ┌──────▼──────┐
         │  COMPLETED  │
         └──────┬──────┘
                │ Customer picks up
         ┌──────▼──────┐
         │  RETURNED   │
         └─────────────┘
```

---

## 12. TESTING STRATEGY

| Layer                 | Tool                     | Scope                                 |
| --------------------- | ------------------------ | ------------------------------------- |
| **Unit Tests**        | Jest                     | Services (business logic), Utils      |
| **Integration Tests** | Jest + Supertest         | Controller → Service → DB             |
| **E2E Tests**         | Jest + Supertest         | Full API flows (auth, order, payment) |
| **Frontend Tests**    | Vitest + Testing Library | Components, hooks                     |

### Critical Test Flows

1. **Auth Flow:** Register → Verify → Login → Refresh → Logout
2. **Order Flow:** Add to cart → Checkout → Pay → Confirm → Ship → Deliver
3. **Stock Reservation:** Checkout → Reserve → Pay (confirm) / Timeout (release)
4. **Warranty Flow:** Submit → Assign → Diagnose → Repair → Complete → Return
5. **PC Build:** Select components → Check compatibility → Show result

---

## 13. ERROR HANDLING STRATEGY

### 13.1 Global error model

```json
{
  "success": false,
  "error": {
    "code": "ORDER__INSUFFICIENT_STOCK",
    "message": "Not enough stock for product 123",
    "details": { "productId": 123, "available": 1, "requested": 2 },
    "requestId": "req_abc123",
    "timestamp": "2026-05-01T08:00:00.000Z"
  }
}
```

### 13.2 Error code convention

- Format: `<MODULE>__<ERROR_NAME>`
- Examples:
  - `AUTH__INVALID_CREDENTIALS`
  - `PAYMENT__SIGNATURE_INVALID`
  - `WARRANTY__INVALID_STATUS_TRANSITION`

### 13.3 Exception mapping

- `ValidationException` → 400
- `UnauthorizedException` → 401
- `ForbiddenException` → 403
- `EntityNotFoundException` → 404
- `ConflictException` → 409
- `RateLimitException` → 429
- `Domain/Internal` → 500

### 13.4 Retry policy (external services)

- Exponential backoff: `1s → 2s → 4s` (max 3 attempts)
- Retry chỉ áp dụng cho lỗi transient (timeout, 5xx, network reset)
- Không retry cho 4xx business errors
- Dead-letter queue cho job vượt retry limit

---

## 14. PERFORMANCE & SCALABILITY

### 14.1 Database indexing strategy

- `users(email)` unique index
- `products(slug)`, `products(status, category_id, brand_id)` composite index
- `orders(user_id, created_at)`, `orders(status, created_at)`
- `payments(order_id, status)`, `payments(transaction_id)`
- `warranty_tickets(status, assigned_to, created_at)`
- `reviews(product_id, created_at)`, `reviews(user_id, order_item_id)` unique

### 14.2 Redis caching patterns

- Cache-aside cho read-heavy endpoints:
  - `GET /products`, `GET /products/:slug`, dashboard aggregates
- Key convention: `app:<module>:<resource>:<params-hash>`
- TTL guideline:
  - Catalog: 5-15 phút
  - Dashboard aggregates: 1-5 phút
  - Session/token state: theo token expiration

### 14.3 Query optimization guidelines

- Không trả field thừa cho listing APIs
- Bắt buộc pagination cho endpoint có thể > 100 rows
- Dùng joins/select có chủ đích; tránh eager loading mù
- Theo dõi query plan các endpoint chậm (`EXPLAIN ANALYZE`)

### 14.4 N+1 prevention

- Dùng join/select relation theo batch
- Với aggregate/relation counts dùng grouped query thay vì loop query
- Review performance trong code review với endpoint list/details

---

## 15. SECURITY DETAILS

### 15.1 Input validation rules

- Global `ValidationPipe` với `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- DTO-level constraints cho từng request
- Sanitize HTML/text fields trước khi render

### 15.2 Injection/XSS/CSRF

- SQL injection: dùng TypeORM parameter binding, không concat SQL string
- XSS: sanitize rich text + escape output mặc định
- CSRF: áp dụng cho cookie-based auth endpoints (nếu dùng cookie session)

### 15.3 CORS & Rate limit

- CORS allowlist theo env (`FRONTEND_URL`, admin URL)
- Credentials chỉ bật khi cần
- Rate limiting:
  - Auth endpoints: strict (e.g., 5 req/min/IP)
  - Public read APIs: medium
  - Admin APIs: theo role + audit logs

### 15.4 File upload security

- Allowlist MIME types (jpeg/png/webp/pdf)
- Max size (ví dụ 5MB ảnh, 10MB tài liệu)
- Rename file tránh path traversal
- Quét metadata, reject executable/script content

---

## 16. DATA MIGRATION & SEED STRATEGY

### 16.1 Seed data

- Seed tối thiểu: roles, admin account, categories, brands, sample products
- Seed tách theo môi trường: `dev`, `staging` (không dùng production sample seed)

### 16.2 Migration rollback

- Mỗi migration phải có `up`/`down` rõ ràng
- Quy tắc backward-compatible trước khi rollout breaking schema
- Dry-run migration trên staging trước production

### 16.3 Backup strategy

- Daily DB snapshot + point-in-time recovery window
- Verify restore định kỳ (không chỉ backup)
- Lưu trữ backup encrypted, retention policy rõ ràng

---

## 17. MONITORING & OBSERVABILITY

### 17.1 Metrics cần theo dõi

- API latency (p50/p95/p99)
- Error rate theo endpoint/module
- Throughput (RPS)
- Queue depth + job failure rate
- DB slow query count

### 17.2 Logging standard

- JSON structured logs
- Levels: `debug`, `info`, `warn`, `error`, `fatal`
- Trường bắt buộc: `timestamp`, `level`, `message`, `requestId`, `userId?`, `module`

### 17.3 Alert rules

- 5xx error rate tăng đột biến
- p95 latency vượt ngưỡng SLA
- Queue backlog cao kéo dài
- Low-stock critical products

### 17.4 Health checks

- `/health/live` (app running)
- `/health/ready` (DB/Redis/queue dependencies ready)
- `/health/deps` (chi tiết trạng thái external services)

---

## 18. API VERSIONING STRATEGY

- Prefix route: `/api/v1/...`, `/api/v2/...`
- Breaking change => version mới, không sửa behavior silent trong cùng version
- Deprecation policy:
  - thông báo trước tối thiểu 1 release cycle
  - response header: `Deprecation`, `Sunset`
  - changelog migration guide bắt buộc

---

## 19. TRANSACTION MANAGEMENT

### 19.1 Local DB transactions

- Dùng transaction cho các flow nhiều bước ghi DB (checkout, payment settle, inventory adjust)
- `SELECT ... FOR UPDATE` cho critical rows trong stock/order flows

### 19.2 Cross-module consistency (Saga)

- Áp dụng choreography saga qua domain events
- Mỗi step có compensating action:
  - payment failed => release reservation
  - order cancelled => restore stock

### 19.3 Rollback strategies

- Rollback immediate cho cùng DB transaction
- Compensating transaction cho cross-service/external side effects

---

## 20. REAL-WORLD SCENARIOS & RESILIENCE

- **Concurrent order handling:** lock inventory rows + idempotent checkout key
- **Race condition prevention:** optimistic locking/version field cho update nhạy cảm
- **Deadlock handling:** retry bounded + consistent lock order
- **Payment webhook idempotency:** lưu `provider_event_id` unique + ignore duplicates

---

## 21. FRONTEND STATE MANAGEMENT DETAILS

### 21.1 Zustand store boundaries

- `authStore` (token/user/session flags)
- `cartStore` (cart items, totals, pending state)
- `uiStore` (theme/sidebar/modal/toast local UI state)
- Không đưa server list data lớn vào Zustand (để React Query xử lý)

### 21.2 React Query strategy

- Query key chuẩn: `['products', filters]`, `['orders', page]`
- Stale time theo domain:
  - Catalog: 60s
  - Dashboard/admin: 15-30s
  - Profile/session: 0-15s
- Invalidate chính xác theo mutation scope

### 21.3 Optimistic updates

- Áp dụng cho cart quantity, mark notification read
- Rollback UI khi mutation fail

### 21.4 Error boundary strategy

- Global error boundary cho app shell
- Route-level boundary cho page critical (checkout/payment)
- Component-level fallback cho widgets dashboard

---

## 22. DEVELOPMENT WORKFLOW

- Branching: `main` (stable), `develop` (integration), `feature/*`, `hotfix/*`
- Commit convention: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- PR checklist bắt buộc: test evidence, screenshot (nếu UI), risk notes, rollback note
- Code review yêu cầu ít nhất 1 approver + CI green

---

## 23. DOCUMENTATION STANDARDS

- Swagger bắt buộc cho public/admin APIs
- README mỗi module gồm: purpose, entities, endpoints, events, runbook
- Comment guideline: chỉ comment logic phức tạp/decision non-obvious, tránh comment dư

---

## 24. LOCAL DEVELOPMENT SETUP

### 24.1 Prerequisites

- Node.js LTS (>= 20)
- npm (>= 10)
- Docker + Docker Compose
- MySQL client, Redis insight (optional)

### 24.2 Setup steps

1. Copy `.env.example` -> `.env`
2. `docker compose up -d mysql redis`
3. Run migrations + seed
4. Start backend, admin frontend, client frontend

### 24.3 Troubleshooting nhanh

- Port conflict (3001/3002/3003/3306/6379)
- Migration drift giữa local và staging
- CORS mismatch do sai `FRONTEND_URL`

---

## 25. THIRD-PARTY FALLBACK STRATEGY

- **Cloudinary down:** queue upload retry + temporary local object storage fallback
- **Email service down:** queue + retry + show non-blocking warning
- **Payment gateway down:** cho phép COD fallback (nếu business rule cho phép)

---

## 26. MOBILE RESPONSIVENESS STRATEGY

- Mobile-first với breakpoint rõ (`sm`, `md`, `lg`, `xl`)
- Tối ưu touch targets (>= 44px)
- Sticky actions cho checkout/cart/warranty forms trên mobile
- Kiểm tra flow critical trên viewport nhỏ trước release

---

## 27. PHASE EXECUTION CHECKLIST (DoD + Acceptance + Owner)

> Mục tiêu: chuyển plan thành **phase-gates có thể kiểm tra được** trước khi merge/release.

### 27.1 Phase 1 — Foundation Gate

**Owner chính:** Backend Lead (Auth/User) + Frontend Lead (Auth UI)

**Deliverables bắt buộc:**

- Auth flows: register/login/refresh/logout/verify/reset hoạt động end-to-end
- RBAC guards + global validation/exception filter
- Swagger cho auth/users APIs

**Definition of Done (DoD):**

- [ ] Unit tests cho auth service pass
- [ ] Integration tests cho login/refresh pass
- [ ] FE auth pages xử lý success/error/loading đầy đủ
- [ ] Security baseline (password hash, token expiration, refresh rotation)

**Acceptance Criteria (AC):**

- [ ] User mới đăng ký + verify email thành công
- [ ] Login sai mật khẩu trả error code đúng format
- [ ] Refresh token cũ không dùng lại được sau rotate

### 27.2 Phase 2 — Core Commerce Gate

**Owner chính:** Product/Catalog Squad + Order/Checkout Squad

**Deliverables bắt buộc:**

- Product listing + detail + filter/sort/search/pagination
- Cart + checkout + order creation flow
- Category/brand/supplier CRUD (admin)

**Definition of Done (DoD):**

- [ ] Product APIs có pagination + filter server-side
- [ ] Cart mutation APIs idempotent và validate stock cơ bản
- [ ] FE checkout flow hoàn tất từ cart -> order created
- [ ] E2E flow commerce pass trên staging

**Acceptance Criteria (AC):**

- [ ] User tạo order thành công với địa chỉ hợp lệ
- [ ] Admin CRUD product/category/brand không lỗi
- [ ] Order detail hiển thị snapshot item/price đúng tại thời điểm mua

### 27.3 Phase 3 — Payment & Inventory Gate

**Owner chính:** Payment Owner + Inventory Owner

**Deliverables bắt buộc:**

- Payment create/status/webhook hoàn chỉnh
- Stock reservation + release + confirm
- Inventory import/export/adjust + movement history

**Definition of Done (DoD):**

- [ ] Webhook signature validation + idempotency key implemented
- [ ] Reservation transaction dùng row lock (`FOR UPDATE`)
- [ ] Cron/job release reservation timeout chạy ổn định
- [ ] Dashboard/log có metric payment success/failure

**Acceptance Criteria (AC):**

- [ ] Thanh toán thành công -> stock reserved được confirm
- [ ] Thanh toán thất bại/timeout -> stock được release đầy đủ
- [ ] Không xảy ra oversell trong test concurrent checkout

### 27.4 Phase 4 — Business Logic Gate

**Owner chính:** Warranty/Review Owner + PC Builder Owner

**Deliverables bắt buộc:**

- PC compatibility engine + rules management
- Warranty ticket lifecycle + assign tech + repair logs
- Review verified purchase + moderation

**Definition of Done (DoD):**

- [ ] Warranty status machine enforce transition hợp lệ
- [ ] Review aggregate rating cập nhật đúng sau create/delete
- [ ] Admin moderation pages có filter/search/pagination/export
- [ ] Technician + customer flows được test integration

**Acceptance Criteria (AC):**

- [ ] Ticket không thể nhảy trạng thái trái workflow
- [ ] Chỉ user mua hàng mới tạo review verified
- [ ] PC build trả về issues/suggestions chính xác với rules hiện có

### 27.5 Phase 5 — Notification & Dashboard Gate

**Owner chính:** Realtime/Queue Owner + Analytics Owner

**Deliverables bắt buộc:**

- Notification queue + realtime delivery + read/unread flows
- Dashboard APIs (overview/revenue/top-products/warranty/inventory alerts)
- Dashboard UI charts/cards/tables

**Definition of Done (DoD):**

- [ ] Queue retry + dead-letter policy cấu hình
- [ ] Socket reconnect + offline fallback được xử lý
- [ ] Dashboard queries có cache TTL hợp lý
- [ ] Alerting rule cơ bản hoạt động (error rate/latency)

**Acceptance Criteria (AC):**

- [ ] Event order/payment/warranty tạo notification đúng người nhận
- [ ] Dashboard số liệu khớp với dữ liệu DB trong cùng time window
- [ ] UI dashboard tải dưới ngưỡng p95 mục tiêu nội bộ

### 27.6 Phase 6 — Production Gate

**Owner chính:** Platform/DevOps Owner + Security Owner

**Deliverables bắt buộc:**

- CI/CD pipeline đầy đủ lint-test-build-deploy
- Monitoring + health checks + centralized logging
- Security hardening + backup/restore runbook

**Definition of Done (DoD):**

- [ ] Deploy staging + production có rollback procedure
- [ ] Health endpoints live/ready/deps hoạt động
- [ ] Sentry/log aggregation có trace requestId
- [ ] Backup restore drill pass trong môi trường staging

**Acceptance Criteria (AC):**

- [ ] Release production không downtime ngoài planned window
- [ ] P1 incident có playbook và on-call escalation rõ
- [ ] Audit trail cho admin-critical actions truy vết được

### 27.7 Global release checklist (áp dụng mọi phase)

- [ ] Scope phase freeze, không nhận thêm feature ngoài phase
- [ ] Tất cả API contract thay đổi đều cập nhật Swagger + changelog
- [ ] Test evidence đính kèm PR (logs/screenshots/report)
- [ ] Security checklist pass (validation, authz, rate-limit, upload rules)
- [ ] Performance smoke test pass (latency/error budget nội bộ)
- [ ] Runbook update: deploy, rollback, troubleshooting

---

## 28. EXECUTION BACKLOG MAPPING (BE / FE Admin / FE Client)

> Dùng section này để bẻ phase-gate thành task có thể giao việc và track tiến độ theo repo.

### 28.1 Task ID convention

- Format: `P<phase>-<repo>-<number>`
- `repo`:
  - `BE` = `BeShopLapTop`
  - `AD` = `fe-admin-laptop`
  - `FE` = `FeShopLaptop`

Ví dụ: `P4-AD-03` = task số 03 của Phase 4 thuộc FE Admin.

### 28.2 Backlog mapping template

| Task ID  | Repo     | Scope      | Owner  | Dependency       | Done khi nào?               |
| -------- | -------- | ---------- | ------ | ---------------- | --------------------------- |
| P?-??-?? | BE/AD/FE | Mô tả ngắn | @owner | Task ID trước đó | Link PR + test + build pass |

### 28.3 Phase 1 mapping (Foundation)

| Task ID  | Repo | Scope                                                    | Owner               | Dependency | Done khi nào?                   |
| -------- | ---- | -------------------------------------------------------- | ------------------- | ---------- | ------------------------------- |
| P1-BE-01 | BE   | Auth register/login/refresh/logout APIs + DTO validation | Backend Lead        | -          | Swagger + unit/integration pass |
| P1-BE-02 | BE   | Email verify + forgot/reset + token rotation             | Backend Lead        | P1-BE-01   | E2E auth flow pass              |
| P1-BE-03 | BE   | RBAC guard + global exception filter + error format      | Backend Lead        | P1-BE-01   | Error contract đúng Section 13  |
| P1-FE-01 | FE   | Login/register/forgot/reset pages + form validation      | Frontend Lead       | P1-BE-01   | Happy/edge/error flow pass      |
| P1-FE-02 | FE   | Session bootstrap + protected routes                     | Frontend Lead       | P1-BE-01   | Unauthorized redirect đúng      |
| P1-AD-01 | AD   | Admin login shell + route guard cơ bản                   | Frontend Admin Lead | P1-BE-01   | Build pass + role guard pass    |

### 28.4 Phase 2 mapping (Core Commerce)

| Task ID  | Repo | Scope                                                     | Owner                  | Dependency | Done khi nào?                    |
| -------- | ---- | --------------------------------------------------------- | ---------------------- | ---------- | -------------------------------- |
| P2-BE-01 | BE   | Category/brand/supplier CRUD APIs                         | Backend Catalog Owner  | P1-BE-03   | CRUD + RBAC tests pass           |
| P2-BE-02 | BE   | Product APIs (filter/sort/search/pagination/specs/images) | Backend Catalog Owner  | P2-BE-01   | Query perf baseline pass         |
| P2-BE-03 | BE   | Cart APIs + validate stock snapshot                       | Backend Commerce Owner | P2-BE-02   | Cart integration tests pass      |
| P2-BE-04 | BE   | Checkout + order create + order detail/list               | Backend Commerce Owner | P2-BE-03   | E2E checkout pass                |
| P2-FE-01 | FE   | Product listing/detail + filter/search UI                 | Frontend Shop Owner    | P2-BE-02   | UX + loading/error states đầy đủ |
| P2-FE-02 | FE   | Cart + checkout + order history pages                     | Frontend Shop Owner    | P2-BE-04   | End-to-end user flow pass        |
| P2-AD-01 | AD   | Admin catalog management pages                            | Frontend Admin Lead    | P2-BE-02   | Create/edit/delete + build pass  |

### 28.5 Phase 3 mapping (Payment & Inventory)

| Task ID  | Repo | Scope                                              | Owner                   | Dependency | Done khi nào?                    |
| -------- | ---- | -------------------------------------------------- | ----------------------- | ---------- | -------------------------------- |
| P3-BE-01 | BE   | Payment create/status/webhook + signature validate | Backend Payment Owner   | P2-BE-04   | Idempotency + webhook tests pass |
| P3-BE-02 | BE   | Stock reserve/release/confirm transaction-safe     | Backend Inventory Owner | P3-BE-01   | Concurrent checkout test pass    |
| P3-BE-03 | BE   | Inventory import/export/adjust/movements APIs      | Backend Inventory Owner | P3-BE-02   | Audit + movement logs đúng       |
| P3-FE-01 | FE   | Payment UI (QR/MoMo/COD) + status polling          | Frontend Shop Owner     | P3-BE-01   | Payment success/fail flow pass   |
| P3-AD-01 | AD   | Inventory management pages                         | Frontend Admin Lead     | P3-BE-03   | CRUD/import-export flows pass    |

### 28.6 Phase 4 mapping (Business Logic)

| Task ID  | Repo | Scope                                                          | Owner                  | Dependency        | Done khi nào?                     |
| -------- | ---- | -------------------------------------------------------------- | ---------------------- | ----------------- | --------------------------------- |
| P4-BE-01 | BE   | Warranty module (ticket, assign, status workflow, logs)        | Backend Warranty Owner | P3-BE-02          | Workflow tests pass               |
| P4-BE-02 | BE   | Review module (verified purchase, moderation APIs)             | Backend Review Owner   | P2-BE-04          | Aggregate rating đúng             |
| P4-BE-03 | BE   | PC build compatibility rules engine                            | Backend PCBuild Owner  | P2-BE-02          | Compatibility scenarios pass      |
| P4-FE-01 | FE   | Customer warranty submit/list/status pages                     | Frontend Shop Owner    | P4-BE-01          | User flow pass                    |
| P4-FE-02 | FE   | Review form/list in product detail                             | Frontend Shop Owner    | P4-BE-02          | Verified UX + error handling pass |
| P4-AD-01 | AD   | Warranty moderation dashboard + actions                        | Frontend Admin Lead    | P4-BE-01          | Filter/search/pagination pass     |
| P4-AD-02 | AD   | Review moderation dashboard + actions                          | Frontend Admin Lead    | P4-BE-02          | Filter/search/pagination pass     |
| P4-AD-03 | AD   | CSV export polish (field select/date format/BOM/quick actions) | Frontend Admin Lead    | P4-AD-01,P4-AD-02 | Export QA + build pass            |

### 28.7 Phase 5 mapping (Notification & Dashboard)

| Task ID  | Repo | Scope                                         | Owner                   | Dependency | Done khi nào?                 |
| -------- | ---- | --------------------------------------------- | ----------------------- | ---------- | ----------------------------- |
| P5-BE-01 | BE   | Notification queue + handlers + delivery APIs | Backend Realtime Owner  | P4-BE-01   | Queue retry/DLQ pass          |
| P5-BE-02 | BE   | Dashboard aggregate APIs + caching            | Backend Analytics Owner | P5-BE-01   | p95 + cache hit target đạt    |
| P5-FE-01 | FE   | Notification bell/list/realtime UI            | Frontend Shop Owner     | P5-BE-01   | Realtime + read state ổn định |
| P5-AD-01 | AD   | Admin analytics dashboard charts/tables       | Frontend Admin Lead     | P5-BE-02   | Data consistency QA pass      |

### 28.8 Phase 6 mapping (Production)

| Task ID   | Repo     | Scope                                                        | Owner               | Dependency                 | Done khi nào?                      |
| --------- | -------- | ------------------------------------------------------------ | ------------------- | -------------------------- | ---------------------------------- |
| P6-BE-01  | BE       | Security hardening (rate-limit, upload rules, CORS, headers) | Security Owner      | P5-BE-02                   | Security checklist pass            |
| P6-BE-02  | BE       | Monitoring/health/logging/Sentry integration                 | Platform Owner      | P6-BE-01                   | Alert + health endpoints pass      |
| P6-BE-03  | BE       | Migration/backup/restore runbook + drill                     | Platform Owner      | P6-BE-02                   | Restore drill pass                 |
| P6-FE-01  | FE       | Error boundaries + observability hooks                       | Frontend Lead       | P6-BE-02                   | Runtime error tracing pass         |
| P6-AD-01  | AD       | Admin critical actions audit visibility                      | Frontend Admin Lead | P6-BE-02                   | Audit trace QA pass                |
| P6-OPS-01 | BE/AD/FE | CI/CD workflow lint-test-build-deploy + rollback             | DevOps Owner        | P6-BE-03,P6-FE-01,P6-AD-01 | Staging + production release green |

### 28.9 Current progress snapshot (update mỗi batch)

- **Completed:** `P4-AD-03` (CSV export polish cho Warranty/Review moderation)
- **In Progress:** cập nhật theo batch hiện tại
- **Next suggested:**
  1. `P5-BE-01` Notification queue hardening
  2. `P5-AD-01` Dashboard admin analytics UI
  3. `P6-BE-02` Observability baseline

---

> **Next Step:** Bạn muốn bắt đầu Phase 1 (Setup project + Auth module) không?
