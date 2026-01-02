# Runbook: File Storage Operations (MinIO)

## Overview
This runbook describes the management of MinIO, the S3-compatible object storage service used for file uploads, backups, and static assets.

## Architecture
- **Service**: MinIO (distributed or standalone mode)
- **Buckets**:
  - `leads`: Lead-related documents (scanned IDs, policies).
  - `backups`: Database and system snapshots.
  - `assets`: Static application assets.

## Monitoring

### Metrics
- `minio_bucket_usage_bytes`: Size of each bucket.
- `minio_online_nodes`: Number of healthy nodes in the cluster.
- `minio_request_total`: Total S3 API requests.

### Alerts
- **MinIONodeDown**: Alert if any node in the cluster is offline.
- **MinIODiskFull**: Alert at 85% disk usage.
- **MinIOUnreachable**: Critical alert if the service is down.

## Troubleshooting

### Issue: Access Denied (403 Forbidden)
- **Check**:
  1. Verify Access Key and Secret Key in the application environment variables.
  2. Check Bucket Policies in the MinIO Console (port 9001).
  3. Ensure the bucket exists.

### Issue: Slow Uploads/Downloads
- **Check**:
  1. Network throughput between application and MinIO.
  2. Disk I/O wait times on the MinIO storage nodes.
  3. MinIO server logs: `kubectl logs -l app=minio -n production`.

## Administrative Tasks

### Creating a Bucket
Via MinIO Client (mc):
```bash
mc mb myminio/new-bucket
```

### Setting Bucket Policy (e.g., Public Read)
```bash
mc anonymous set download myminio/assets
```

### Listing Buckets and Usage
```bash
mc du myminio
```

### Manual Backup (Mirroring)
To mirror a bucket to another location (e.g., AWS S3):
```bash
mc mirror myminio/leads s3/my-backup-bucket
```

## Maintenance
- **Drive Replacement**: In distributed mode, replace failed drives and MinIO will self-heal.
- **Security**: Regularly rotate Access/Secret keys in Kubernetes secrets and restart dependent services.
