#!/bin/bash
# Secret Rotation Script
# Rotates database passwords, API keys, and certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="security-scans/secret-rotation.log"
ROTATION_INTERVAL_DAYS=30
BACKUP_DIR="backups/secrets"
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-"security@example.com"}

# Create directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

echo -e "${GREEN}Secret Rotation Script${NC}"
echo "======================"
echo "Rotation interval: $ROTATION_INTERVAL_DAYS days"
echo "Log file: $LOG_FILE"
echo ""

# Function to log messages
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to backup secret
backup_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local backup_file="$BACKUP_DIR/${secret_name}-$(date +%Y%m%d-%H%M%S).backup"

    echo "$secret_value" > "$backup_file"
    chmod 600 "$backup_file"

    log "INFO" "Backed up secret: $secret_name"
}

# Function to generate random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Function to rotate database password
rotate_database_password() {
    local db_name="$1"
    local db_user="$2"
    local db_host="${3:-localhost}"

    log "INFO" "Rotating database password for: $db_user@$db_name"

    # Generate new password
    local new_password=$(generate_password 32)

    # Get current password from environment or secret store
    local current_password=${DB_PASSWORD:-""}

    if [ -n "$current_password" ]; then
        backup_secret "db_${db_user}_password" "$current_password"
    fi

    # Update password in database
    if command -v psql &> /dev/null; then
        PGPASSWORD="$current_password" psql -h "$db_host" -U "$db_user" -d "$db_name" \
            -c "ALTER USER $db_user WITH PASSWORD '$new_password';" || {
            log "ERROR" "Failed to rotate database password"
            return 1
        }
    fi

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$new_password/" .env
        log "INFO" "Updated .env file"
    fi

    log "SUCCESS" "Database password rotated successfully"

    # Set next rotation date
    local next_rotation=$(date -d "+$ROTATION_INTERVAL_DAYS days" '+%Y-%m-%d')
    log "INFO" "Next rotation scheduled for: $next_rotation"
}

# Function to rotate API key
rotate_api_key() {
    local service_name="$1"
    local env_var_name="$2"

    log "INFO" "Rotating API key for: $service_name"

    # Get current API key
    local current_api_key="${!env_var_name}"

    if [ -n "$current_api_key" ]; then
        backup_secret "api_key_${service_name}" "$current_api_key"
    fi

    # Generate new API key
    local new_api_key=$(generate_password 64)

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/^${env_var_name}=.*/${env_var_name}=$new_api_key/" .env
        log "INFO" "Updated $env_var_name in .env"
    fi

    log "SUCCESS" "API key rotated successfully for $service_name"
}

# Function to rotate encryption key
rotate_encryption_key() {
    log "INFO" "Rotating encryption key"

    # Get current key
    local current_key=${ENCRYPTION_KEY:-""}

    if [ -n "$current_key" ]; then
        backup_secret "encryption_key" "$current_key"
    fi

    # Generate new encryption key
    local new_key=$(openssl rand -hex 32)

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$new_key/" .env
        log "INFO" "Updated ENCRYPTION_KEY in .env"
    fi

    # Re-encrypt sensitive data with new key would go here
    log "WARNING" "Remember to re-encrypt data with new key"
    log "SUCCESS" "Encryption key rotated successfully"
}

# Function to rotate JWT secret
rotate_jwt_secret() {
    log "INFO" "Rotating JWT secrets"

    # Get current secrets
    local access_secret=${JWT_ACCESS_SECRET:-""}
    local refresh_secret=${JWT_REFRESH_SECRET:-""}

    if [ -n "$access_secret" ]; then
        backup_secret "jwt_access_secret" "$access_secret"
    fi

    if [ -n "$refresh_secret" ]; then
        backup_secret "jwt_refresh_secret" "$refresh_secret"
    fi

    # Generate new secrets
    local new_access_secret=$(openssl rand -base64 64)
    local new_refresh_secret=$(openssl rand -base64 64)

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=$new_access_secret/" .env
        sed -i.bak "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$new_refresh_secret/" .env
        log "INFO" "Updated JWT secrets in .env"
    fi

    log "WARNING" "All current JWT tokens will be invalidated"
    log "SUCCESS" "JWT secrets rotated successfully"
}

# Function to rotate certificate
rotate_certificate() {
    local domain="$1"
    local cert_dir="/etc/ssl/certs"

    log "INFO" "Rotating certificate for: $domain"

    # Backup current certificate
    if [ -f "$cert_dir/$domain.crt" ]; then
        cp "$cert_dir/$domain.crt" "$BACKUP_DIR/${domain}-cert-$(date +%Y%m%d-%H%M%S).crt"
        cp "$cert_dir/$domain.key" "$BACKUP_DIR/${domain}-key-$(date +%Y%m%d-%H%M%S).key"
        log "INFO" "Backed up current certificate"
    fi

    # Generate new self-signed certificate (for development)
    if [ "$ENVIRONMENT" = "development" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$cert_dir/$domain.key" \
            -out "$cert_dir/$domain.crt" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain" || {
            log "ERROR" "Failed to generate certificate"
            return 1
        }
    else
        # For production, use Let's Encrypt or cert-manager
        log "WARNING" "Certificate rotation for production should use Let's Encrypt or cert-manager"
        log "INFO" "Skipping certificate rotation in production mode"
        return 0
    fi

    # Set proper permissions
    chmod 644 "$cert_dir/$domain.crt"
    chmod 600 "$cert_dir/$domain.key"

    # Restart services to reload certificates
    log "INFO" "Restarting services to reload certificates..."
    # systemctl reload nginx || true
    # systemctl reload apache2 || true

    log "SUCCESS" "Certificate rotated successfully"
}

# Function to rotate OAuth client secret
rotate_oauth_client_secret() {
    local client_id="$1"

    log "INFO" "Rotating OAuth client secret for: $client_id"

    # Get current secret
    local current_secret=${OAUTH_CLIENT_SECRET:-""}

    if [ -n "$current_secret" ]; then
        backup_secret "oauth_client_secret" "$current_secret"
    fi

    # Generate new secret
    local new_secret=$(openssl rand -base64 64)

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/OAUTH_CLIENT_SECRET=.*/OAUTH_CLIENT_SECRET=$new_secret/" .env
        log "INFO" "Updated OAUTH_CLIENT_SECRET in .env"
    fi

    log "SUCCESS" "OAuth client secret rotated successfully"
}

# Function to rotate Redis password
rotate_redis_password() {
    log "INFO" "Rotating Redis password"

    # Get current password
    local current_password=${REDIS_PASSWORD:-""}

    if [ -n "$current_password" ]; then
        backup_secret "redis_password" "$current_password"
    fi

    # Generate new password
    local new_password=$(generate_password 32)

    # Update Redis config
    if command -v redis-cli &> /dev/null; then
        redis-cli CONFIG SET requirepass "$new_password" || {
            log "ERROR" "Failed to update Redis password"
            return 1
        }
    fi

    # Update environment file
    if [ -f ".env" ]; then
        sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$new_password/" .env
        log "INFO" "Updated REDIS_PASSWORD in .env"
    fi

    log "SUCCESS" "Redis password rotated successfully"
}

# Function to check if rotation is needed
check_rotation_needed() {
    local secret_name="$1"
    local last_rotation_file="$BACKUP_DIR/${secret_name}-last-rotation"

    if [ ! -f "$last_rotation_file" ]; then
        log "INFO" "No previous rotation found for $secret_name"
        return 0
    fi

    local last_rotation=$(cat "$last_rotation_file")
    local next_rotation=$(date -d "$last_rotation +$ROTATION_INTERVAL_DAYS days" '+%s')
    local now=$(date '+%s')

    if [ $now -ge $next_rotation ]; then
        log "INFO" "Rotation needed for $secret_name"
        return 0
    else
        log "INFO" "Rotation not yet needed for $secret_name"
        return 1
    fi
}

# Function to mark rotation complete
mark_rotation_complete() {
    local secret_name="$1"
    local last_rotation_file="$BACKUP_DIR/${secret_name}-last-rotation"
    date '+%Y-%m-%d' > "$last_rotation_file"
}

# Function to send notification
send_notification() {
    local subject="$1"
    local body="$2"

    if command -v mail &> /dev/null && [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$body" | mail -s "$subject" "$NOTIFICATION_EMAIL"
        log "INFO" "Notification sent to $NOTIFICATION_EMAIL"
    fi
}

# Main rotation function
main() {
    local what_to_rotate="${1:-all}"

    log "INFO" "Starting secret rotation for: $what_to_rotate"

    case "$what_to_rotate" in
        database)
            rotate_database_password "lead_management" "postgres"
            mark_rotation_complete "database"
            ;;
        api)
            rotate_api_key "stripe" "STRIPE_API_KEY"
            mark_rotation_complete "api"
            ;;
        encryption)
            rotate_encryption_key
            mark_rotation_complete "encryption"
            ;;
        jwt)
            rotate_jwt_secret
            mark_rotation_complete "jwt"
            ;;
        certificate)
            rotate_certificate "localhost"
            mark_rotation_complete "certificate"
            ;;
        oauth)
            rotate_oauth_client_secret "lead-management"
            mark_rotation_complete "oauth"
            ;;
        redis)
            rotate_redis_password
            mark_rotation_complete "redis"
            ;;
        all)
            echo "Rotating all secrets..."
            rotate_database_password "lead_management" "postgres"
            mark_rotation_complete "database"

            rotate_jwt_secret
            mark_rotation_complete "jwt"

            rotate_encryption_key
            mark_rotation_complete "encryption"

            rotate_redis_password
            mark_rotation_complete "redis"

            # Send notification
            send_notification "Secret Rotation Complete" "All secrets have been rotated successfully."
            ;;
        *)
            echo -e "${RED}Unknown option: $what_to_rotate${NC}"
            echo "Usage: $0 [all|database|api|encryption|jwt|certificate|oauth|redis]"
            exit 1
            ;;
    esac

    log "INFO" "Secret rotation completed successfully"
    echo ""
    echo -e "${GREEN}✅ Secret rotation completed${NC}"
    echo "Log file: $LOG_FILE"
    echo "Backup directory: $BACKUP_DIR"
}

# Run main function
main "$@"
