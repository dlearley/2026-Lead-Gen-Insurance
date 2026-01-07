#!/bin/bash
# Database maintenance automation script
# Usage: ./maintenance-database.sh [daily|weekly|monthly|status]

set -e

# Configuration
DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/insurance_leads}"
SLOW_QUERY_THRESHOLD="${SLOW_QUERY_THRESHOLD:-500}"
BLOAT_THRESHOLD="${BLOAT_THRESHOLD:-30}"
INDEX_SIZE_THRESHOLD_MB="${INDEX_SIZE_THRESHOLD_MB:-100}"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to vacuum tables
vacuum_tables() {
    local mode="$1" # analyze, full, or regular

    log "Starting VACUUM ($mode)..."

    PSQL_OUTPUT=$(psql "$DATABASE_URL" -t -c "
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    ")

    for table in $PSQL_OUTPUT; do
        table=$(echo "$table" | xargs)
        if [ -n "$table" ]; then
            log "Vacuuming table: $table ($mode)"
            psql "$DATABASE_URL" -c "VACUUM $mode $table;"
        fi
    done

    log "VACUUM completed"
}

# Function to analyze tables
analyze_tables() {
    log "Starting ANALYZE..."

    PSQL_OUTPUT=$(psql "$DATABASE_URL" -t -c "
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    ")

    for table in $PSQL_OUTPUT; do
        table=$(echo "$table" | xargs)
        if [ -n "$table" ]; then
            log "Analyzing table: $table"
            psql "$DATABASE_URL" -c "ANALYZE $table;"
        fi
    done

    log "ANALYZE completed"
}

# Function to reindex tables
reindex_tables() {
    log "Starting REINDEX..."

    PSQL_OUTPUT=$(psql "$DATABASE_URL" -t -c "
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    ")

    for table in $PSQL_OUTPUT; do
        table=$(echo "$table" | xargs)
        if [ -n "$table" ]; then
            log "Reindexing table: $table"
            psql "$DATABASE_URL" -c "REINDEX TABLE $table;"
        fi
    done

    log "REINDEX completed"
}

# Function to cleanup old soft-deleted records
cleanup_soft_deletes() {
    local days="${1:-90}"
    log "Cleaning up soft-deleted records older than $days days..."

    psql "$DATABASE_URL" -c "
        DO \$\$
        DECLARE
            table_rec RECORD;
            sql TEXT;
        BEGIN
            FOR table_rec IN 
                SELECT table_name 
                FROM information_schema.columns 
                WHERE column_name = 'deleted_at' 
                AND table_schema = 'public'
            LOOP
                sql := format('DELETE FROM %I WHERE deleted_at < NOW() - INTERVAL ''%s days''', 
                    table_rec.table_name, days);
                EXECUTE sql;
                RAISE NOTICE 'Cleaned up table: %', table_rec.table_name;
            END LOOP;
        END
        \$\$;
    "

    log "Soft-delete cleanup completed"
}

# Function to remove unused indexes
remove_unused_indexes() {
    log "Removing unused indexes..."

    psql "$DATABASE_URL" -c "
        WITH unused_indexes AS (
            SELECT
                schemaname,
                tablename,
                indexname,
                pg_relation_size(indexrelid) as size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND pg_relation_size(indexrelid) > ${INDEX_SIZE_THRESHOLD_MB} * 1024 * 1024
            AND indexname NOT LIKE '%_pkey'
        )
        SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(size) as index_size
        FROM unused_indexes
        ORDER BY size DESC;
    "

    read -p "Do you want to remove these indexes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql "$DATABASE_URL" -c "
            DO \$\$
            DECLARE
                index_rec RECORD;
            BEGIN
                FOR index_rec IN 
                    SELECT indexrelid::regclass as index_name
                    FROM pg_stat_user_indexes
                    WHERE idx_scan = 0
                    AND pg_relation_size(indexrelid) > ${INDEX_SIZE_THRESHOLD_MB} * 1024 * 1024
                    AND indexname NOT LIKE '%_pkey'
                LOOP
                    EXECUTE format('DROP INDEX CONCURRENTLY IF EXISTS %I', index_rec.index_name);
                    RAISE NOTICE 'Dropped index: %', index_rec.index_name;
                END LOOP;
            END
            \$\$;
        "
        log "Unused indexes removed"
    else
        log "Skipping index removal"
    fi
}

# Function to check for bloat
check_bloat() {
    log "Checking table and index bloat..."

    psql "$DATABASE_URL" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
            (SELECT n_dead_tup FROM pg_stat_user_tables psut 
             WHERE psut.schemaname = ps.schemaname 
             AND psut.tablename = ps.tablename) as dead_tuples,
            (SELECT n_live_tup FROM pg_stat_user_tables psut 
             WHERE psut.schemaname = ps.schemaname 
             AND psut.tablename = ps.tablename) as live_tuples
        FROM pg_tables ps
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# Function to get slow queries
get_slow_queries() {
    log "Retrieving slow queries (>$SLOW_QUERY_THRESHOLD ms)..."

    psql "$DATABASE_URL" -c "
        SELECT
            query,
            calls,
            total_exec_time as total_time,
            mean_exec_time as avg_time,
            max_exec_time as max_time,
            rows
        FROM pg_stat_statements
        WHERE mean_exec_time > ${SLOW_QUERY_THRESHOLD}
        ORDER BY mean_exec_time DESC
        LIMIT 20;
    "
}

# Function to check connection usage
check_connections() {
    log "Checking connection usage..."

    psql "$DATABASE_URL" -c "
        SELECT
            state,
            count(*) as connections,
            count(*) FILTER (WHERE state = 'active') as active,
            count(*) FILTER (WHERE state = 'idle') as idle,
            count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
        FROM pg_stat_activity
        GROUP BY state
        ORDER BY connections DESC;
    "
}

# Function to check replication lag
check_replication_lag() {
    log "Checking replication lag..."

    psql "$DATABASE_URL" -c "
        SELECT 
            CASE 
                WHEN pg_is_in_recovery() THEN
                    EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))
                ELSE 
                    0 
            END as lag_seconds,
            pg_is_in_recovery() as is_replica,
            pg_current_wal_lsn() as current_lsn,
            pg_last_xact_replay_timestamp() as last_replay_time;
    "
}

# Function to get table statistics
get_table_statistics() {
    log "Retrieving table statistics..."

    psql "$DATABASE_URL" -c "
        SELECT
            schemaname,
            tablename,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            seq_scan as seq_scans,
            seq_tup_read as seq_rows_read,
            idx_scan as idx_scans,
            idx_tup_fetch as idx_rows_fetched,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# Function to get index statistics
get_index_statistics() {
    log "Retrieving index statistics..."

    psql "$DATABASE_URL" -c "
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            indisunique as is_unique,
            indisprimary as is_primary
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY scans DESC;
    "
}

# Function to generate health report
generate_health_report() {
    log "Generating database health report..."

    echo ""
    echo "=== DATABASE HEALTH REPORT ==="
    echo "Generated: $(date)"
    echo ""

    echo "--- Connection Status ---"
    check_connections
    echo ""

    echo "--- Replication Status ---"
    check_replication_lag
    echo ""

    echo "--- Database Size ---"
    psql "$DATABASE_URL" -c "
        SELECT 
            datname,
            pg_size_pretty(pg_database_size(datname)) as size
        FROM pg_database
        WHERE datname = current_database();
    "
    echo ""

    echo "--- Bloat Status ---"
    check_bloat
    echo ""

    echo "--- Slow Queries ---"
    get_slow_queries
    echo ""

    echo "--- Top Tables by Size ---"
    psql "$DATABASE_URL" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            n_live_tup as rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    "
}

# Function to perform daily maintenance
daily_maintenance() {
    log "Starting daily maintenance..."

    vacuum_tables "ANALYZE"
    cleanup_soft_deletes 30

    log "Daily maintenance completed"
}

# Function to perform weekly maintenance
weekly_maintenance() {
    log "Starting weekly maintenance..."

    vacuum_tables "FULL, ANALYZE"
    remove_unused_indexes

    log "Weekly maintenance completed"
}

# Function to perform monthly maintenance
monthly_maintenance() {
    log "Starting monthly maintenance..."

    vacuum_tables "FULL, ANALYZE"
    reindex_tables
    cleanup_soft_deletes 90

    log "Monthly maintenance completed"
}

# Main execution
case "$1" in
    daily)
        daily_maintenance
        ;;
    weekly)
        weekly_maintenance
        ;;
    monthly)
        monthly_maintenance
        ;;
    vacuum)
        vacuum_tables "$2"
        ;;
    analyze)
        analyze_tables
        ;;
    reindex)
        reindex_tables
        ;;
    cleanup)
        cleanup_soft_deletes "${2:-90}"
        ;;
    remove-unused-indexes)
        remove_unused_indexes
        ;;
    bloat)
        check_bloat
        ;;
    slow-queries)
        get_slow_queries
        ;;
    connections)
        check_connections
        ;;
    replication)
        check_replication_lag
        ;;
    table-stats)
        get_table_statistics
        ;;
    index-stats)
        get_index_statistics
        ;;
    report)
        generate_health_report
        ;;
    status)
        echo "=== Database Status ==="
        echo ""
        check_connections
        echo ""
        check_replication_lag
        ;;
    *)
        echo "Usage: $0 {daily|weekly|monthly|vacuum|analyze|reindex|cleanup|remove-unused-indexes|bloat|slow-queries|connections|replication|table-stats|index-stats|report|status}"
        echo ""
        echo "Maintenance commands:"
        echo "  daily              - Run daily maintenance tasks"
        echo "  weekly             - Run weekly maintenance tasks"
        echo "  monthly            - Run monthly maintenance tasks"
        echo ""
        echo "Individual commands:"
        echo "  vacuum [MODE]      - Vacuum tables (mode: analyze, full, or empty for default)"
        echo "  analyze            - Analyze tables"
        echo "  reindex            - Reindex all tables"
        echo "  cleanup [DAYS]     - Cleanup soft-deleted records (default: 90 days)"
        echo "  remove-unused-indexes - Remove unused indexes"
        echo ""
        echo "Monitoring commands:"
        echo "  bloat              - Check table and index bloat"
        echo "  slow-queries       - Show slow queries"
        echo "  connections        - Show connection usage"
        echo "  replication        - Show replication status"
        echo "  table-stats        - Show table statistics"
        echo "  index-stats        - Show index statistics"
        echo "  report             - Generate comprehensive health report"
        echo "  status             - Quick status check"
        exit 1
        ;;
esac
