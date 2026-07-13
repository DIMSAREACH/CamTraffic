# Use Case Diagram — CamTraffic

**Task:** 371 · **Ref:** P009 · **Parent:** `docs/ARCHITECTURE-DIAGRAMS.md` §1

---

## Actors

| Actor | Description |
|-------|-------------|
| System Admin | Manages users, infrastructure, system settings |
| Traffic Police | Runs detection, reviews violations, issues fines |
| Driver | Views fines, pays, submits appeals, manages vehicles |
| AI Engine | External actor performing sign/vehicle detection |

---

## Use cases

| ID | Use case | Primary actor |
|----|----------|---------------|
| UC-01 | Manage users & roles | Admin |
| UC-02 | Manage signs & cameras | Admin, Police |
| UC-03 | Run AI detection | Admin, Police |
| UC-04 | Review violations | Police |
| UC-05 | Issue & pay fines | Police, Driver |
| UC-06 | Submit & review appeals | Driver, Police |
| UC-07 | View reports & audit | Admin, Police |
| UC-08 | Manage vehicles | Driver |
| UC-09 | Receive notifications | Driver |

---

## Diagram

```mermaid
flowchart LR
  subgraph Actors
    Admin([System Admin])
    Police([Traffic Police])
    Driver([Driver])
    AI([AI Engine])
  end

  subgraph CamTraffic System
    UC1(Manage users & roles)
    UC2(Manage signs & cameras)
    UC3(Run AI detection)
    UC4(Review violations)
    UC5(Issue & pay fines)
    UC6(Submit & review appeals)
    UC7(View reports & audit)
    UC8(Manage vehicles)
    UC9(Receive notifications)
  end

  Admin --> UC1
  Admin --> UC2
  Admin --> UC7
  Admin --> UC3

  Police --> UC3
  Police --> UC4
  Police --> UC5
  Police --> UC6
  Police --> UC2
  Police --> UC7

  Driver --> UC5
  Driver --> UC6
  Driver --> UC8
  Driver --> UC9

  UC3 --> AI
```

---

## Actor ↔ use case matrix

| | UC-01 | UC-02 | UC-03 | UC-04 | UC-05 | UC-06 | UC-07 | UC-08 | UC-09 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Admin | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| Police | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Driver | | | | | ✓ | ✓ | | ✓ | ✓ |
