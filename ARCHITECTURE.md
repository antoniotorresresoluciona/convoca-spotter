# 🏗️ Arquitectura del Sistema Migrado

## Vista General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KUBERNETES CLUSTER                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       Ingress Controller (NGINX)                       │ │
│  │                                                                        │ │
│  │  convoca.yourdomain.com → :80                                         │ │
│  │  webhooks.convoca.yourdomain.com → :80                                │ │
│  └──────────────┬──────────────────────────────┬──────────────────────────┘ │
│                 │                               │                            │
│                 │                               │                            │
│  ┌──────────────▼──────────────────────────┐  ┌─▼─────────────────────────┐ │
│  │   Namespace: changedetection           │  │ Namespace: convoca-ollama │ │
│  │                                        │  │                           │ │
│  │  ┌──────────────────────────────────┐ │  │ ┌──────────────────────┐  │ │
│  │  │  changedetection.io              │ │  │ │  Webhook Processor   │  │ │
│  │  │  ┌────────────────────────────┐  │ │  │ │  ┌─────────────────┐ │  │ │
│  │  │  │ Controller Pod             │  │ │  │ │  │ Express Server  │ │  │ │
│  │  │  │                            │  │ │  │ │  │                 │ │  │ │
│  │  │  │ - Watch manager            │  │ │  │ │  │ POST /webhook   │ │  │ │
│  │  │  │ - Change detection engine  │  │ │  │ │  │ GET  /health    │ │  │ │
│  │  │  │ - Notification dispatcher  │──┼─┼──┼─┼─►│ GET  /stats     │ │  │ │
│  │  │  │ - API REST                 │  │ │  │ │  │                 │ │  │ │
│  │  │  │                            │  │ │  │ │  └────────┬────────┘ │  │ │
│  │  │  └────────┬───────────────────┘  │ │  │ │           │          │  │ │
│  │  │           │                      │ │  │ │           │ HTTP     │  │ │
│  │  │           │ PVC 50Gi             │ │  │ │           ▼          │  │ │
│  │  │           │ (Datastore)          │ │  │ │  ┌─────────────────┐ │  │ │
│  │  │  ┌────────▼───────────────────┐  │ │  │ │  │  Ollama API     │ │  │ │
│  │  │  │                            │  │ │  │ │  │  (External)     │ │  │ │
│  │  │  │ /datastore/                │  │ │  │ │  │                 │ │  │ │
│  │  │  │  ├─ watches.json            │  │ │  │ │  │ 192.168.x.x     │ │  │ │
│  │  │  │  ├─ <uuid>.txt (snapshots) │  │ │  │ │  │ :11434          │ │  │ │
│  │  │  │  └─ history/               │  │ │  │ │  │ llama3.1        │ │  │ │
│  │  │  │                            │  │ │  │ │  └─────────────────┘ │  │ │
│  │  │  └────────────────────────────┘  │ │  │ │                      │  │ │
│  │  │                                  │ │  │ │  Replicas: 2-10      │  │ │
│  │  │  Replica: 1 (stateful)           │ │  │ │  HPA: CPU 70%        │  │ │
│  │  └──────────────────────────────────┘ │  │ └──────────────────────┘  │ │
│  │                                        │  └───────────────────────────┘ │
│  │  ┌──────────────────────────────────┐ │                                │
│  │  │  Browserless Playwright Pool     │ │                                │
│  │  │                                  │ │                                │
│  │  │  ┌────────┐  ┌────────┐  ┌─────┐│ │                                │
│  │  │  │ Pod 1  │  │ Pod 2  │  │ ... ││ │                                │
│  │  │  │        │  │        │  │     ││ │                                │
│  │  │  │ Chrome │  │ Chrome │  │     ││ │                                │
│  │  │  │ + PW   │  │ + PW   │  │     ││ │                                │
│  │  │  └────────┘  └────────┘  └─────┘│ │                                │
│  │  │                                  │ │                                │
│  │  │  Service: browserless-playwright │ │                                │
│  │  │  Port: 3000 (WebSocket)          │ │                                │
│  │  │  Replicas: 3-30 (HPA)            │ │                                │
│  │  │  HPA Trigger: CPU 70%            │ │                                │
│  │  └──────────────────────────────────┘ │                                │
│  │          ▲                             │                                │
│  │          │ WebSocket                   │                                │
│  │          │ ws://...playwright:3000     │                                │
│  │          │                             │                                │
│  │  ┌───────┴───────────────────────────┐│                                │
│  │  │  changedetection.io (Controller)  ││                                │
│  │  │  PLAYWRIGHT_DRIVER_URL config     ││                                │
│  │  └───────────────────────────────────┘│                                │
│  └────────────────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos: Monitoreo y Detección

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE MONITOREO                                │
└──────────────────────────────────────────────────────────────────────────┘

1. SCHEDULING
   ┌────────────────────────┐
   │  changedetection.io    │
   │  Internal Scheduler    │
   │  ▸ Check every 2h      │
   │  ▸ 45 watches          │
   └───────────┬────────────┘
               │
               │ Triggers check
               ▼
2. FETCH
   ┌────────────────────────┐      ┌──────────────────┐
   │ Simple HTML Watch?     │──Yes─▶│ Direct HTTP GET  │
   └───────────┬────────────┘      └──────────────────┘
               │
               No (JS required)
               │
               ▼
   ┌────────────────────────┐      ┌──────────────────┐
   │ Connect to Playwright  │─────▶│ Browserless Pod  │
   │ Pool via WebSocket     │      │ Render with JS   │
   └────────────────────────┘      └──────────────────┘
               │
               │ HTML content
               ▼
3. DETECT CHANGES
   ┌────────────────────────┐
   │ Compare with last      │
   │ snapshot (diff)        │
   │                        │
   │ ▸ Content hash         │
   │ ▸ Visual diff          │
   │ ▸ Text changes         │
   └───────────┬────────────┘
               │
               ├─ No change ──► Skip, reschedule
               │
               └─ Change detected
                  │
                  ▼
4. STORE SNAPSHOT
   ┌────────────────────────┐
   │ Save to datastore      │
   │ /datastore/<uuid>.txt  │
   │ + history entry        │
   └───────────┬────────────┘
               │
               ▼
5. TRIGGER NOTIFICATION
   ┌────────────────────────┐
   │ Send webhook POST      │
   │ to configured URLs     │
   └───────────┬────────────┘
               │
               │ HTTP POST
               ▼
6. WEBHOOK PROCESSING
   ┌────────────────────────┐      ┌──────────────────┐
   │ Webhook Processor      │      │ Ollama API       │
   │ receives payload       │─────▶│ llama3.1:latest  │
   │                        │      │                  │
   │ POST /webhook          │◀─────│ AI Analysis      │
   └───────────┬────────────┘      └──────────────────┘
               │
               │ Analysis result
               ▼
7. LOG/STORE
   ┌────────────────────────┐
   │ Log analysis to stdout │
   │ (or save to DB)        │
   │                        │
   │ ▸ Summary              │
   │ ▸ Relevance: HIGH/MED  │
   │ ▸ Keywords             │
   │ ▸ Is new convocatoria? │
   └────────────────────────┘
```

## Escalado Automático (HPA)

```
┌───────────────────────────────────────────────────────────────┐
│              HORIZONTAL POD AUTOSCALER (HPA)                  │
└───────────────────────────────────────────────────────────────┘

Browserless Playwright Pool:
─────────────────────────────

Current Replicas: 3
Min: 3 | Max: 30

Metrics:
  CPU Usage: ▓▓▓▓▓▓▓░░░ 70%  ◀─ Scale up trigger
  Memory:    ▓▓▓▓▓▓▓▓░░ 80%

Scale Up Policy:
  ▸ Double pods every 60s (max)
  ▸ Or add 4 pods/60s
  ▸ Whichever is higher

Scale Down Policy:
  ▸ Wait 300s (stabilization)
  ▸ Then reduce 50%/120s
  ▸ Or 2 pods/120s (whichever is lower)

Example Timeline:
  t=0    : 3 pods  @ 50% CPU  ✓ Normal
  t=60   : 3 pods  @ 75% CPU  ⚠ Scale up triggered
  t=120  : 6 pods  @ 60% CPU  ↗ Scaling
  t=180  : 6 pods  @ 85% CPU  ⚠ Scale up again
  t=240  : 12 pods @ 55% CPU  ↗ Scaled
  t=540  : 12 pods @ 40% CPU  ⏸ Stabilizing (5 min wait)
  t=840  : 6 pods  @ 50% CPU  ↘ Scaled down


Webhook Processor:
──────────────────

Current Replicas: 2
Min: 2 | Max: 10

Metrics:
  CPU Usage: ▓▓▓░░░░░░░ 30%  ✓ Normal

HPA behavior similar to Browserless but:
  ▸ Less aggressive (smaller workload)
  ▸ Usually stays at minimum (2 pods)
```

## Persistencia de Datos

```
┌───────────────────────────────────────────────────────────────┐
│                  PERSISTENT VOLUME CLAIM (PVC)                │
└───────────────────────────────────────────────────────────────┘

Name: cdio-datastore
Size: 50Gi
AccessMode: ReadWriteOnce (RWO)
StorageClass: <depends on cloud provider>

Mounted at: /datastore

Directory Structure:
/datastore/
  ├── url-watches.json           ← Main config (all watches)
  │
  ├── <uuid1>.txt                ← Snapshot: HTML content
  ├── <uuid1>-history.json       ← Change history
  │
  ├── <uuid2>.txt
  ├── <uuid2>-history.json
  │
  ├── ... (45+ watches)
  │
  └── backups/                   ← Automated backups (optional)
      ├── backup-20251020.tar.gz
      └── backup-20251019.tar.gz

⚠️  IMPORTANT: Only 1 pod can mount this PVC (RWO)
    That's why changedetection has only 1 replica.

Backup Strategy:
  ▸ CronJob runs daily at 3 AM
  ▸ Creates tar.gz of /datastore
  ▸ Stores in /backups PVC
  ▸ Keeps last 7 backups
```

## Networking y Seguridad

```
┌───────────────────────────────────────────────────────────────┐
│                      NETWORK POLICIES                         │
└───────────────────────────────────────────────────────────────┘

changedetection namespace:

  Ingress (incoming):
    ✓ From Ingress Controller → changedetection:5000
    ✗ Deny all other ingress

  Egress (outgoing):
    ✓ To kube-dns:53 (DNS)
    ✓ To browserless:3000 (Playwright pool)
    ✓ To internet:80,443 (scraping)
    ✓ To convoca-ollama:80 (webhooks)
    ✗ Deny all other egress

convoca-ollama namespace:

  Ingress (incoming):
    ✓ From changedetection namespace
    ✓ From Ingress Controller (optional)
    ✗ Deny all other ingress

  Egress (outgoing):
    ✓ To kube-dns:53 (DNS)
    ✓ To Ollama external IP:11434
    ✗ Deny all other egress

┌───────────────────────────────────────────────────────────────┐
│                       TLS TERMINATION                         │
└───────────────────────────────────────────────────────────────┘

Ingress (NGINX):
  ┌─────────────────────────────────────────┐
  │  HTTPS (443)                            │
  │  convoca.yourdomain.com                 │
  │                                         │
  │  ▸ TLS Cert from cert-manager           │
  │    (Let's Encrypt)                      │
  │                                         │
  │  ▸ Terminates TLS here                  │
  │                                         │
  │  ▸ Forwards HTTP to backend             │
  └───────────┬─────────────────────────────┘
              │
              │ HTTP (unencrypted inside cluster)
              ▼
      ┌───────────────────┐
      │ changedetection   │
      │ Service :80       │
      └───────────────────┘

All traffic inside the cluster is HTTP (no TLS overhead).
```

## Monitoring y Observabilidad

```
┌───────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY STACK                      │
└───────────────────────────────────────────────────────────────┘

Logs:
  ┌────────────────┐
  │  Pods          │───► stdout/stderr
  │  (all)         │
  └────────────────┘
          │
          │ collected by
          ▼
  ┌────────────────┐
  │  kubelet       │───► K8s API
  └────────────────┘
          │
          │ queryable via
          ▼
  ┌────────────────┐
  │  kubectl logs  │
  │  -f -l app=... │
  └────────────────┘

Metrics:
  ┌────────────────┐
  │  Pods          │
  │  - CPU         │
  │  - Memory      │
  │  - Network     │
  └────────┬───────┘
           │ scraped by
           ▼
  ┌────────────────┐
  │  Metrics       │
  │  Server        │
  └────────┬───────┘
           │ used by
           ▼
  ┌────────────────┐
  │  HPA           │
  │  (autoscaler)  │
  └────────────────┘

Optional (not included):
  ┌────────────────┐
  │  Prometheus    │───► Scrapes metrics
  └────────┬───────┘
           │
           ▼
  ┌────────────────┐
  │  Grafana       │───► Dashboards
  └────────────────┘
```

## Comparativa: Antes vs Después

```
╔═══════════════════════════════════════════════════════════════╗
║              SISTEMA ACTUAL vs NUEVA ARQUITECTURA             ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA ACTUAL                           │
│                   (Pre-migración)                            │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │       Debian Server (Single VM)              │
  │                                              │
  │  ┌────────────────────────────────────────┐ │
  │  │ systemd service: convoca-spotter       │ │
  │  │                                        │ │
  │  │  ┌──────────────────┐                 │ │
  │  │  │ Node.js Process  │                 │ │
  │  │  │ - Express API    │                 │ │
  │  │  │ - Monitor loop   │                 │ │
  │  │  │ - fetch()        │                 │ │
  │  │  └─────────┬────────┘                 │ │
  │  │            │                           │ │
  │  │            ▼                           │ │
  │  │  ┌──────────────────┐                 │ │
  │  │  │ SQLite local.db  │                 │ │
  │  │  │ (9 MB)           │                 │ │
  │  │  └──────────────────┘                 │ │
  │  │                                        │ │
  │  │  Single process, sequential scraping  │ │
  │  └────────────────────────────────────────┘ │
  │                                              │
  │  systemd timer: cada 2h                      │
  │  No HA, no scaling                           │
  └──────────────────────────────────────────────┘

       ⚠️  Issues:
          - Single point of failure
          - Can't scale horizontally
          - Sequential scraping (slow)
          - Manual deployment
          - Hard to update


┌─────────────────────────────────────────────────────────────┐
│               NUEVA ARQUITECTURA                            │
│              (Post-migración K8s)                            │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │     Kubernetes Cluster (Multi-node)          │
  │                                              │
  │  ┌────────────────────────────────────────┐ │
  │  │  changedetection namespace             │ │
  │  │                                        │ │
  │  │  ┌──────────────┐  ┌───────────────┐  │ │
  │  │  │ Controller   │  │ Browserless   │  │ │
  │  │  │ (1 pod)      │  │ Pool (3-30)   │  │ │
  │  │  │              │  │               │  │ │
  │  │  │ + PVC 50Gi   │  │ Parallel      │  │ │
  │  │  └──────────────┘  │ scraping      │  │ │
  │  │                    └───────────────┘  │ │
  │  └────────────────────────────────────────┘ │
  │                                              │
  │  ┌────────────────────────────────────────┐ │
  │  │  convoca-ollama namespace              │ │
  │  │                                        │ │
  │  │  ┌──────────────────────────────────┐  │ │
  │  │  │ Webhook Processor (2-10 pods)    │  │ │
  │  │  │ + Ollama integration             │  │ │
  │  │  └──────────────────────────────────┘  │ │
  │  └────────────────────────────────────────┘ │
  │                                              │
  │  HPA: auto-scaling based on CPU              │
  │  HA: multiple replicas                       │
  │  Declarative: GitOps ready                   │
  └──────────────────────────────────────────────┘

       ✓  Benefits:
          - High availability (multi-replica)
          - Horizontal scaling (HPA)
          - Parallel scraping (3-30x faster)
          - Declarative deployment (K8s)
          - Easy updates (rolling)
          - Persistent storage (PVC)
          - Professional monitoring
```

---

## Recursos por Componente

| Component              | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas    |
|------------------------|-------------|-----------|----------------|--------------|-------------|
| changedetection        | 250m        | 2000m     | 512Mi          | 4Gi          | 1 (fixed)   |
| browserless-playwright | 1000m       | 3000m     | 2Gi            | 6Gi          | 3-30 (HPA)  |
| webhook-processor      | 100m        | 1000m     | 256Mi          | 1Gi          | 2-10 (HPA)  |
| **TOTAL (min)**        | **1.35**    | **6**     | **2.76Gi**     | **11Gi**     | **6 pods**  |
| **TOTAL (max)**        | **11.25**   | **92**    | **42.76Gi**    | **181Gi**    | **41 pods** |

> Nota: 1000m = 1 vCPU

**Cluster recomendado:** 4-8 vCPU, 16-32 GB RAM (mínimo para operación normal)

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Autor:** Migration Assistant
