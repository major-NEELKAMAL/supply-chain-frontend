# Supply Chain Blast-Radius Tracker (Frontend)

An interactive Angular application backed by a Spring Boot microservice and **CognoDB** graph database. This tool enables non-technical domain experts to analyze component dependencies and quantify downstream impact (blast radius) when a supplier experiences disruptions.

- **Live Application:** `https://supply-chain-frontend-bknf.onrender.com`
- **Backend Repository:** `https://github.com/major-NEELKAMAL/supplychain-api`
- **Video Walkthrough:** `https://www.loom.com/share/591572ae2be3403f8c10cd1720adb4b3`

---

## Why a Graph Database?

In multi-tiered supply chains, evaluating risk requires answering recursive questions: *"If Supplier X fails, which finished products and sub-assemblies are impacted, and at what depth?"*

* **Index-Free Adjacency:** Relational databases require expensive, multi-table `JOIN` operations or complex recursive Common Table Expressions (CTEs) that degrade exponentially as dependency depth increases. CognoDB traverses graph pointers natively in $O(1)$ time per relationship step.
* **Flexible Edge Modeling:** Graph nodes (`Supplier`, `Component`, `Product`) and relationships (`SUPPLIES`, `USED_IN`) naturally mirror real-world bill-of-materials (BOM) networks without forcing unnatural relational normalization.
* **Declarative Traversals:** Cypher allows variable-length path matching like `(s:Supplier)-[:SUPPLIES|USED_IN*1..4]->(p:Product)` in a single clean query.

---

## Data Model & Architecture
(:Supplier) -[:SUPPLIES]-> (:Component) -[:USED_IN]-> (:Component) -[:USED_IN]-> (:Product)

### Graph Schema
- **Nodes:**
  - `Supplier`: `{ id: String, name: String, region: String }`
  - `Component`: `{ id: String, name: String }`
  - `Product`: `{ id: String, name: String }`
- **Relationships:**
  - `SUPPLIES`: Connects `Supplier` to `Component`
  - `USED_IN`: Connects `Component` to sub-components or final `Product`

---

## UI Features
- **One-Click Data Seeding:** Trigger graph populating via the backend REST endpoint.
- **Dynamic Blast Radius Analysis:** Input any supplier ID (e.g., `SUP-50`) to view multi-hop impacts formatted by distance (hops).
- **Graceful States:** Includes responsive loading indicators, empty states for unknown IDs, and clear error alerts.

---

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- Angular CLI (`npm install -g @angular/cli`)

### Instructions
1. Clone the repository:
   ```bash
   git clone `https://github.com/major-NEELKAMAL/supply-chain-frontend`
   cd supply-chain-frontend
   
Install dependencies:

Bash
npm install
Update src/app/services/supply-chain.service.ts if running against a local backend (http://localhost:8081/api/supply-chain).

Start dev server:

Bash
ng serve
Navigate to http://localhost:4200/.


---

### 2. Backend Repository (`supply-chain-backend/README.md`)

```markdown
# Supply Chain Blast-Radius Tracker (Backend API)

Spring Boot REST API service powering the Supply Chain Blast-Radius Tracker. Built with Java 21, Spring Boot, and the official Neo4j Java Driver over the Bolt protocol to interact with **CognoDB Cloud**.

- **Live API Endpoint:** `https://supplychain-api-3ntq.onrender.com/api/supply-chain`
- **Frontend Repository:** `https://github.com/major-NEELKAMAL/supply-chain-frontend`

---

## Core Cypher Queries

### 1. Multi-Hop Impact Query (Parameterized)
Executes variable-length path traversals (2 to 4 hops) to return affected downstream end-products along with the exact hop distance:

```cypher
MATCH path = (s:Supplier {id: $supplierId})-[:SUPPLIES|USED_IN*1..4]->(p:Product)
RETURN DISTINCT p.id AS productId, p.name AS productName, length(path) AS depth
2. Data Seeding Query
Populates CognoDB using MERGE idempotency to prevent duplicate node creation:

Cypher
MERGE (s1:Supplier {id: 'SUP-50'}) SET s1.name = 'MicroChip Corp', s1.region = 'Taiwan'
MERGE (c1:Component {id: 'CMP-101'}) SET c1.name = 'Microcontroller Unit'
MERGE (c2:Component {id: 'CMP-202'}) SET c2.name = 'Control Board'
MERGE (p1:Product {id: 'PRD-900'}) SET p1.name = 'Medical Monitor'
MERGE (p2:Product {id: 'PRD-901'}) SET p2.name = 'Automotive ECU'

MERGE (s1)-[:SUPPLIES]->(c1)
MERGE (c1)-[:USED_IN]->(c2)
MERGE (c2)-[:USED_IN]->(p1)
MERGE (c1)-[:USED_IN]->(p2)