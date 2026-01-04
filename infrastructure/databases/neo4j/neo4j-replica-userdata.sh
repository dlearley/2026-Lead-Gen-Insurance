#!/bin/bash
# Neo4j Read Replica Node User Data Script

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install Java (required for Neo4j)
apt-get install -y openjdk-17-jre-headless

# Download and install Neo4j Enterprise
cd /tmp
wget https://dist.neo4j.org/neo4j-enterprise-5.15.0-unix.tar.gz
tar -xzf neo4j-enterprise-5.15.0-unix.tar.gz
mv neo4j-enterprise-5.15.0 /opt/neo4j

# Create neo4j user
useradd -r -s /bin/false neo4j
chown -R neo4j:neo4j /opt/neo4j

# Configure Neo4j Read Replica
cat <<EOF > /opt/neo4j/conf/neo4j.conf
# Network configuration
dbms.default_listen_address=0.0.0.0
dbms.connector.bolt.listen_address=:7687
dbms.connector.http.listen_address=:7474
dbms.connector.https.listen_address=:7473

# Initial discovery configuration
dbms.default_advertised_address=$(hostname -I | awk '{print $1}')
initial.discovery_members=${initial_members}

# Memory configuration
dbms.memory.heap.initial_size=${dbms_memory_heap}
dbms.memory.heap.max_size=${dbms_memory_heap}
dbms.memory.pagecache.size=${dbms_memory_pagecache}

# Cluster configuration
dbms.mode=READ_REPLICA

# Transaction configuration
dbms.transaction.timeout=60s

# Security
dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.bolt.base_directory=certificates/bolt
dbms.ssl.policy.bolt.private_key=private.key
dbms.ssl.policy.bolt.public_certificate=public.crt

dbms.ssl.policy.https.enabled=true
dbms.ssl.policy.https.base_directory=certificates/https
dbms.ssl.policy.https.private_key=private.key
dbms.ssl.policy.https.public_certificate=public.crt

# Logging
dbms.logs.http.enabled=true
dbms.logs.query.enabled=false  # Disable query logging on replicas for performance
dbms.logs.query.parameter_logging_enabled=false

# Performance
dbms.track_query_cpu_time=false
dbms.track_query_allocation=false
EOF

# Generate SSL certificates
/opt/neo4j/bin/neo4j-admin server initialize --from-config

# Create systemd service
cat <<EOF > /etc/systemd/system/neo4j.service
[Unit]
Description=Neo4j Graph Database (Read Replica)
After=network.target

[Service]
User=neo4j
Group=neo4j
LimitNOFILE=60000
ExecStart=/opt/neo4j/bin/neo4j
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Neo4j
systemctl daemon-reload
systemctl enable neo4j
systemctl start neo4j

# Wait for Neo4j to start
sleep 30

# Verify cluster status
/opt/neo4j/bin/cypher-shell -u neo4j -p "${NEO4J_PASSWORD}" "CALL dbms.cluster.overview()"

echo "Neo4j read replica node setup completed successfully"
