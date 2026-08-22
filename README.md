# Supply Chain Blast-Radius Tracker (Frontend)

An interactive Angular application backed by a Spring Boot microservice and **CognoDB** graph database. This tool enables non-technical domain experts to analyze component dependencies and quantify downstream impact (blast radius) when a supplier experiences disruptions.

- **Live Application:** [https://supply-chain-frontend-bknf.onrender.com](https://supply-chain-frontend-bknf.onrender.com)
- **Backend Repository:** [https://github.com/major-NEELKAMAL/supplychain-api](https://github.com/major-NEELKAMAL/supplychain-api)
- **Video Walkthrough:** [https://www.loom.com/share/591572ae2be3403f8c10cd1720adb4b3](https://www.loom.com/share/591572ae2be3403f8c10cd1720adb4b3)

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
   git clone https://github.com/major-NEELKAMAL/supply-chain-frontend
   cd supply-chain-frontend

2. Install dependencies:
   npm install

3. Update `src/app/services/supply-chain.service.ts` if running against a local backend (`http://localhost:8081/api/supply-chain`).

4. Start dev server:
   ng serve

5. Navigate to [http://localhost:4200/](http://localhost:4200/).