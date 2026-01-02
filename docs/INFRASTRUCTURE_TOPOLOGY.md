# ============================================
# Production Infrastructure Topology Documentation
# Insurance Lead Generation Platform - Phase 19.2
# ============================================

# Infrastructure Topology Overview
## Insurance Lead Generation Platform - Phase 19.2 Production Architecture

### Executive Summary
This document provides a comprehensive overview of the production infrastructure topology for the Insurance Lead Generation Platform, including network architecture, service dependencies, security boundaries, and disaster recovery configurations.

---

## 1. Network Architecture

### 1.1 VPC Configuration
```
┌─────────────────────────────────────────────────────────────┐
│                     Production VPC                          │
│                   10.0.0.0/16                               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Public     │  │  Private    │  │  Database   │         │
│  │  Subnet 1A  │  │  Subnet 1A  │  │  Subnet 1A  │         │
│  │10.0.101.0/24│  │10.0.1.0/24  │  │10.0.201.0/24│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Public     │  │  Private    │  │  Database   │         │
│  │  Subnet 1B  │  │  Subnet 1B  │  │  Subnet 1B  │         │
│  │10.0.102.0/24│  │10.0.2.0/24  │  │10.0.202.0/24│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Public     │  │  Private    │  │  Database   │         │
│  │  Subnet 1C  │  │  Subnet 1C  │  │  Subnet 1C  │         │
│  │10.0.103.0/24│  │10.0.3.0/24  │  │10.0.203.0/24│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Network Segmentation

#### Public Subnets (10.0.101.0/24, 10.0.102.0/24, 10.0.103.0/24)
- **Purpose**: Load balancers, NAT gateways, bastion hosts
- **Components**:
  - Application Load Balancer (ALB)
  - Network Load Balancer (NLB) for Ingress
  - NAT Gateways
  - Internet Gateway
- **Security**: Publicly accessible with WAF protection

#### Private Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
- **Purpose**: Application services and worker nodes
- **Components**:
  - EKS worker nodes
  - Application pods
  - Internal services
- **Security**: No direct internet access, egress via NAT Gateway

#### Database Subnets (10.0.201.0/24, 10.0.202.0/24, 10.0.203.0/24)
- **Purpose**: Database and caching layer
- **Components**:
  - RDS PostgreSQL instances
  - ElastiCache Redis clusters
  - Neptune graph database instances
- **Security**: Isolated subnets, no internet access

### 1.3 Security Groups Architecture

#### API Security Group (sg-api-xxxx)
- **Inbound Rules**:
  - HTTP (80) from ALB security group
  - HTTPS (443) from ALB security group
  - Internal communication from other security groups
- **Outbound Rules**:
  - All traffic to internet (0.0.0.0/0)
  - Specific ports to database and cache security groups

#### Database Security Group (sg-db-xxxx)
- **Inbound Rules**:
  - PostgreSQL (5432) from API and data service security groups
  - Redis (6379) from application security groups
- **Outbound Rules**:
  - Minimal outbound, only required services

#### EKS Node Security Group (sg-eks-nodes-xxxx)
- **Inbound Rules**:
  - All traffic from VPC CIDR (10.0.0.0/16)
  - Node communication ports
- **Outbound Rules**:
  - HTTPS (443) for EKS API calls
  - All traffic for application functionality

---

## 2. Application Architecture

### 2.1 Service Mesh Topology
```
┌─────────────────────────────────────────────────────────────┐
│                    Service Mesh Layer                       │
│                     (Linkerd 2.x)                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    API      │  │ Data Service│  │Orchestrator │         │
│  │  Gateway    │  │             │  │             │         │
│  │    Pod      │  │     Pod     │  │     Pod     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Backend   │  │  Frontend   │  │    NATS     │         │
│  │   Service   │  │   Service   │  │    Broker   │         │
│  │     Pod     │  │     Pod     │  │     Pod     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Service Dependencies

#### API Service Dependencies
- **Upstream**: External clients via ALB/Ingress
- **Downstream**: Data Service, Orchestrator, Backend Service
- **Data Stores**: Redis cache
- **Message Queue**: NATS
- **Monitoring**: Prometheus, Jaeger, Grafana

#### Data Service Dependencies
- **Upstream**: API Service, Orchestrator, Backend Service
- **Downstream**: Databases
- **Data Stores**: PostgreSQL, Neo4j, Qdrant, Redis
- **Message Queue**: NATS
- **Monitoring**: Prometheus, Jaeger

#### Orchestrator Dependencies
- **Upstream**: Data Service
- **Downstream**: External AI APIs
- **Message Queue**: NATS
- **Monitoring**: Prometheus, Jaeger

### 2.3 Ingress Architecture
```
Internet → CloudFlare CDN → AWS WAF → ALB/NLB → Ingress Controller → Services
                                      ↓
                                Certificate Manager
                                      ↓
                                 Auto-scaling Groups
```

---

## 3. Data Architecture

### 3.1 Database Topology
```
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │   Redis     │  │    Neo4j    │         │
│  │   (RDS)     │  │ (ElastiCache)│  │  (Neptune)  │         │
│  │             │  │             │  │             │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │ Primary │ │  │ │ Primary │ │  │ │ Primary │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │Replica 1│ │  │ │Replica 1│ │  │ │Replica 1│ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │Replica 2│ │  │ │Replica 2│ │  │ │Replica 2│ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐                                              │
│  │   Qdrant    │                                              │
│  │  (Vector)   │                                              │
│  │             │                                              │
│  │ ┌─────────┐ │                                              │
│  │ │ Cluster │ │                                              │
│  │ │ Node 1  │ │                                              │
│  │ └─────────┘ │                                              │
│  │ ┌─────────┐ │                                              │
│  │ │ Cluster │ │                                              │
│  │ │ Node 2  │ │                                              │
│  │ └─────────┘ │                                              │
│  │ ┌─────────┐ │                                              │
│  │ │ Cluster │ │                                              │
│  │ │ Node 3  │ │                                              │
│  │ └─────────┘ │                                              │
│  └─────────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Ingestion  │───▶│  Processing │───▶│  Storage    │
│   Layer     │    │   Layer     │    │   Layer     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    API      │    │ Orchestrator│    │PostgreSQL   │
│   Gateway   │    │   Service   │    │   (RDS)     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Redis     │    │    NATS     │    │   Neo4j     │
│   Cache     │    │   Message   │    │   Graph     │
│             │    │   Broker    │    │  Database   │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   Qdrant    │
                                       │   Vector    │
                                       │  Database   │
                                       └─────────────┘
```

---

## 4. Security Architecture

### 4.1 Security Boundaries
```
┌─────────────────────────────────────────────────────────────┐
│                    Security Zones                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   DMZ Zone  │  │  App Zone   │  │  Data Zone  │         │
│  │             │  │             │  │             │         │
│  │ • WAF       │  │ • EKS       │  │ • RDS       │         │
│  │ • ALB/NLB   │  │ • Services  │  │ • ElastiCache│         │
│  │ • CloudFlare│  │ • Pods      │  │ • Neptune   │         │
│  │ • Cert Mgr  │  │ • Ingress   │  │ • Qdrant    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Security Controls:                                         │
│  • Network segmentation                                     │
│  • Security groups                                          │
│  • NACLs                                                   │
│  • WAF rules                                               │
│  • Service mesh security                                   │
│  • Pod security policies                                   │
│  • RBAC                                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Authentication & Authorization Flow
```
User Request → WAF → ALB → Ingress → Auth Service → Service Mesh → Backend
     ↓              ↓       ↓         ↓              ↓             ↓
  TLS/SSL      Rate     JWT      RBAC         mTLS        Authorization
              Limiting  Token   Policies      Certificate
```

### 4.3 Secrets Management
```
┌─────────────────────────────────────────────────────────────┐
│                 Secrets Management                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ AWS Secrets │  │   Vault     │  │   Cert      │         │
│  │  Manager    │  │  (Optional) │  │  Manager    │         │
│  │             │  │             │  │             │         │
│  │ • Database  │  │ • App       │  │ • SSL       │         │
│  │ • API Keys  │  │   Secrets   │  │ • TLS       │         │
│  │ • JWT       │  │ • Dynamic   │  │ • Renewal   │         │
│  │ • Encrypted │  │   Secrets   │  │ • Auto      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Access via:                                                 │
│  • CSI Drivers                                               │
│  • Sidecars                                                  │
│  • Environment Variables                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Monitoring & Observability Architecture

### 5.1 Observability Stack
```
┌─────────────────────────────────────────────────────────────┐
│                 Observability Layer                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Prometheus  │  │   Grafana   │  │   Jaeger    │         │
│  │             │  │             │  │             │         │
│  │ • Metrics   │  │ • Dashboards│  │ • Tracing   │         │
│  │ • Alerts    │  │ • Visualization│ • Spans     │         │
│  │ • Storage   │  │ • Anomaly   │  │ • Services  │         │
│  │ • Recording │  │   Detection │  │ • Dependencies│       │
│  │   Rules     │  │ • Reports   │  │ • Performance│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│           │                │                │              │
│           ▼                ▼                ▼              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Loki     │  │AlertManager │  │  Elastic    │         │
│  │             │  │             │  │  Search     │         │
│  │ • Logs      │  │ • Notifications│ • Storage   │         │
│  │ • Aggregation│  │ • Escalation│  │ • Indexing  │         │
│  │ • Retention │  │ • Routing   │  │ • Search    │         │
│  │ • Queries   │  │ • Silence   │  │ • Analysis  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Metrics Collection Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Applications│───▶│   Pod       │───▶│ Prometheus  │
│   (Metrics) │    │ Annotations │    │  (Scrape)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                   │
       ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│    Node     │                    │   Grafana   │
│   Exporter  │                    │ (Visualize) │
└─────────────┘                    └─────────────┘
```

---

## 6. Disaster Recovery Architecture

### 6.1 Multi-Region Setup
```
Primary Region (us-east-1)          Secondary Region (us-west-2)
┌─────────────────────┐             ┌─────────────────────┐
│  Production VPC     │             │  DR VPC             │
│  10.0.0.0/16        │             │  10.1.0.0/16        │
│                     │             │                     │
│  ┌─────────────┐   │             │  ┌─────────────┐     │
│  │ EKS Cluster │   │◄───────────►│  │ EKS Cluster │     │
│  │  (Primary)  │   │   Replication │  │ (Standby)  │     │
│  └─────────────┘   │             │  └─────────────┘     │
│                     │             │                     │
│  ┌─────────────┐   │             │  ┌─────────────┐     │
│  │ RDS Primary │   │◄───────────►│  │ RDS Replica │     │
│  │             │   │   Backup    │  │ (Hot Standby)│     │
│  └─────────────┘   │             │  └─────────────┘     │
│                     │             │                     │
│  ┌─────────────┐   │             │  ┌─────────────┐     │
│  │   S3 Buckets│   │◄───────────►│  │ S3 Replicas │     │
│  │ (Cross-region│   │   Sync     │  │             │     │
│  │  Replication)│   │             │  └─────────────┘     │
│  └─────────────┘   │             │                     │
└─────────────────────┘             └─────────────────────┘
```

### 6.2 Backup Strategy
- **Automated Daily Backups**: RDS, ElastiCache, Neptune
- **Cross-Region Replication**: S3 buckets, databases
- **Point-in-Time Recovery**: 5-minute granularity
- **Backup Verification**: Monthly restore tests
- **RTO**: 4 hours
- **RPO**: 1 hour

---

## 7. Performance & Scaling Architecture

### 7.1 Auto-scaling Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    Scaling Layers                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    HPA      │  │    VPA      │  │  Cluster    │         │
│  │             │  │             │  │  Autoscaler │         │
│  │ • Pod-based │  │ • Resource  │  │             │         │
│  │ • Metrics   │  │   tuning    │  │ • Node      │         │
│  │ • Custom    │  │ • Predictive│  │   scaling   │         │
│  │   metrics   │  │   analysis  │  │ • Capacity  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Database    │  │   Redis     │  │    CDN      │         │
│  │ Scaling     │  │  Clustering │  │  Scaling    │         │
│  │             │  │             │  │             │         │
│  │ • Read      │  │ • Cluster   │  │ • Global    │         │
│  │   replicas  │  │   mode      │  │   distribution│       │
│  │ • Connection│  │ • Sharding  │  │ • Edge      │         │
│  │   pooling   │  │ • Eviction  │  │   caching   │         │
│  │             │  │   policies  │  │ • Compression│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Performance Targets
- **API Response Time**: < 500ms (p95)
- **Database Query Time**: < 100ms (p95)
- **Cache Hit Rate**: > 90%
- **Service Availability**: 99.9% uptime
- **Error Rate**: < 0.1%
- **Throughput**: 10,000 requests/second

---

## 8. Cost Optimization

### 8.1 Resource Optimization
- **Reserved Instances**: 70% of baseline capacity
- **Spot Instances**: Non-critical workloads
- **Auto-scaling**: Dynamic capacity adjustment
- **Storage Tiering**: S3 Intelligent Tiering
- **Data Lifecycle**: Automated data archival

### 8.2 Cost Monitoring
- **AWS Cost Explorer**: Daily cost tracking
- **Budget Alerts**: Automated notifications
- **Resource Tagging**: Cost center allocation
- **Utilization Metrics**: Waste identification
- **Monthly Reviews**: Cost optimization analysis

---

## 9. Compliance & Governance

### 9.1 Compliance Framework
- **SOC 2 Type II**: Security and availability
- **GDPR**: Data privacy and protection
- **HIPAA**: Healthcare data protection (if applicable)
- **PCI DSS**: Payment card data security
- **ISO 27001**: Information security management

### 9.2 Governance Controls
- **Change Management**: GitOps workflow
- **Access Control**: Principle of least privilege
- **Audit Logging**: Comprehensive activity tracking
- **Policy Enforcement**: Automated compliance checks
- **Risk Assessment**: Quarterly security reviews

---

## 10. Operational Excellence

### 10.1 Incident Response
- **Detection**: Automated monitoring and alerting
- **Response**: 15-minute MTTR target
- **Communication**: Stakeholder notification system
- **Recovery**: Automated failover procedures
- **Post-Mortem**: Learning and improvement process

### 10.2 Maintenance Windows
- **Scheduled**: Weekly maintenance (Sunday 2-4 AM EST)
- **Emergency**: 24/7 on-call support
- **Communication**: 48-hour advance notice
- **Rollback**: Automated rollback procedures
- **Validation**: Post-maintenance testing

---

*This infrastructure topology document should be reviewed and updated quarterly or after any significant architectural changes. Last updated: $(date +%Y-%m-%d)*