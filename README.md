# Supply Chain Blast-Radius Tracker (Frontend)

An interactive Angular application backed by a Spring Boot microservice and CognoDB graph database. This tool enables non-technical domain experts to search entities, analyze multi-tier supply chain dependencies, and quantify downstream blast radius when upstream disruptions occur.

- **Live Application:** https://supply-chain-frontend-74mv.onrender.com/
- **Backend Repository:** https://github.com/major-NEELKAMAL/supplychain-api
- **Video Walkthrough:** https://www.loom.com/share/591572ae2be3403f8c10cd1720adb4b3

---

## Why a Graph Database?

Evaluating supply chain disruption risk requires recursive multi-tier path traversal: *"If an upstream node fails, which sub-assemblies and end-products are affected, and at what hop depth?"*

* **Index-Free Adjacency:** Traversing dependencies in relational schemas requires heavy CTEs and recursive JOIN operations. CognoDB traverses graph pointers natively in O(1) time per hop step.
* **Flexible Edge Modeling:** Graph nodes (Supplier, RawMaterial, Component, SubAssembly, Product) and edges (SUPPLIES, YIELDS, ASSEMBLED_INTO, BUILDS) model real-world Bill-of-Materials (BOM) networks effortlessly.
* **Multi-Hop Cypher Traversals:** Executes clean, multi-tier path matching up to 4 hops deep without complex relational joins.

---

## Data Model & Architecture

(:Supplier) -[:SUPPLIES]-> (:RawMaterial) -[:YIELDS]-> (:Component) -[:ASSEMBLED_INTO]-> (:SubAssembly) -[:BUILDS]-> (:Product)

### Graph Schema
- **Nodes:** Supplier, RawMaterial, Component, SubAssembly, Product
- **Relationships:** SUPPLIES, YIELDS, ASSEMBLED_INTO, BUILDS

---

## Key UI & Visual Features

- **Interactive SVG Topology Canvas:** 
  - Clear pill-shaped nodes displaying complete entity names with high-contrast text and full hover tooltips.
  - Smooth Bézier curve connections styled on a light gray layout background.
  - Interactive pan, zoom controls, and dynamic path highlighting on node hover.
  - Subtree collapsing and expanding using interactive node badge toggles.
- **Entity Autocomplete Search:** Instant debounced searching across all 5 graph node tiers.
- **Dynamic Blast Radius Table:** Itemized downstream impact analysis with graph depth (hops) calculation.
- **Graceful UI States:** Includes responsive loading indicators, toast notifications, empty search states, and error alerts.

---

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- Angular CLI (npm install -g @angular/cli)

### Instructions
1. Clone the repository:
   git clone https://github.com/major-NEELKAMAL/supply-chain-frontend
   cd supply-chain-frontend

2. Install dependencies:
   npm install

3. Update backend endpoint URI in src/app/services/supply-chain.service.ts if running against local Spring Boot (http://localhost:8081/api/v1/supply-chain/healthcheck).

4. Start development server:
   ng serve --configuration=development

    or ssr build

   npm run build --configuration=development
   node dist/supply-chain-frontend/server/server.mjs

5. Open browser at http://localhost:4200/.

### Instructions for Production Build

1. Start and connect to production server:
   ng serve --configuration=production

   or ssr build

   npm run build --configuration=production
   node dist/supply-chain-frontend/server/server.mjs

2. Open browser at http://localhost:4200/ or if node start then use http://localhost:4000.

