# Multi-Tenant SaaS Architecture on Amazon EKS

A cloud-native multi-tenant SaaS gaming platform deployed on Amazon Elastic Kubernetes Service (Amazon EKS). This project demonstrates modern SaaS design patterns including dynamic tenant onboarding, tiered resource isolation (Basic vs. Pro), GitOps-driven deployment pipelines, and Kubernetes-native AWS resource orchestration using **Kro** and **AWS Controllers for Kubernetes (ACK)**.

---

## 🏗️ Architecture Overview

The platform uses a layered multi-tenant architecture:

- **Compute Layer**: Amazon EKS running containerized microservices with tier-based tenant context routing.
- **Dynamic Orchestration**: **Kro** (Kube Resource Orchestrator) ResourceGroups to dynamically generate tenant infrastructure bundles based on custom Kubernetes resources (`Tenant`).
- **Cloud Resource Management**: **AWS Controllers for Kubernetes (ACK)** to provision tenant-specific AWS resources (Amazon DynamoDB, Amazon S3, IAM roles with EKS Pod Identity) directly from Kubernetes manifests.
- **GitOps Continuous Delivery**: **ArgoCD ApplicationSets** for automated multi-environment and multi-tenant synchronization.
- **Generative AI Integration**: Amazon Bedrock integration providing AI-driven game clues and interactions tailored per tenant tier.

---

## 📁 Repository Structure

```text
├── saas-gaming-app/              # Node.js / TypeScript SaaS microservices
│   ├── src/
│   │   ├── middleware/           # Tenant context & tier resolution middleware
│   │   ├── routes/               # API routes (game, player, analytics, health)
│   │   └── services/             # Bedrock, DynamoDB, S3, and usage metrics services
│   ├── test/                     # Unit and integration test suites (Jest)
│   └── Dockerfile                # Multi-stage container build
│
├── saas-platform-configs/        # Platform-level GitOps definitions & Kro ResourceGraphs
│   ├── applicationsets/          # ArgoCD ApplicationSets for platform deployments
│   └── resourceGraphs/           # Kro definitions for shared & tiered tenant resources
│       ├── tenant-basic-tier.yaml
│       ├── tenant-pro-tier.yaml
│       └── tenant-iam-role.yaml
│
└── saas-workloads/               # Tenant workloads, custom resources, and examples
    ├── applicationsets/          # ArgoCD ApplicationSets for tenant onboarding
    ├── tenants/                  # Tenant custom resource instances (Basic, Pro)
    └── examples/                 # ACK, Kro, and security policy reference manifests
