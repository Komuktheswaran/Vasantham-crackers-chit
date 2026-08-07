-- ============================================================
-- DB performance diagnostics — run in SSMS against VASANTHAMDBLIVE
-- Use BEFORE the test to capture a baseline, then AFTER to diff.
-- ============================================================

-- 1. TOP 10 slowest queries since SQL Server last started
-- Look for: high avg_elapsed_ms, high total_logical_reads.
SELECT TOP 10
    qs.execution_count,
    qs.total_elapsed_time / qs.execution_count / 1000  AS avg_elapsed_ms,
    qs.total_logical_reads / qs.execution_count        AS avg_logical_reads,
    qs.total_worker_time   / qs.execution_count / 1000 AS avg_cpu_ms,
    SUBSTRING(qt.text,
        (qs.statement_start_offset / 2) + 1,
        ((CASE qs.statement_end_offset
              WHEN -1 THEN DATALENGTH(qt.text)
              ELSE qs.statement_end_offset
          END - qs.statement_start_offset) / 2) + 1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY avg_elapsed_ms DESC;

-- 2. Live blocking / waiting sessions — run THIS while the load test is going.
-- Empty result = nothing is blocked. Rows = someone's waiting on someone else.
SELECT
    r.session_id, r.blocking_session_id, r.wait_type, r.wait_time AS wait_ms,
    r.command, DB_NAME(r.database_id) AS db, r.status, r.cpu_time, r.total_elapsed_time,
    SUBSTRING(t.text, (r.statement_start_offset / 2) + 1, 200) AS current_query
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID
  AND r.status IN ('running', 'suspended');

-- 3. Missing indexes (SQL Server's own recommendations)
-- Higher avg_user_impact = bigger win. Don't blindly create every one —
-- evaluate the suggested key columns first.
SELECT TOP 10
    mid.statement                                        AS table_name,
    migs.avg_user_impact,
    migs.user_seeks + migs.user_scans                    AS demand,
    'CREATE INDEX IX_' + REPLACE(REPLACE(REPLACE(mid.statement, '[', ''), ']', ''), '.', '_')
        + ' ON ' + mid.statement
        + ' (' + ISNULL(mid.equality_columns, '')
        + CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ',' ELSE '' END
        + ISNULL(mid.inequality_columns, '') + ')'
        + ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS suggested_ddl
FROM sys.dm_db_missing_index_details mid
JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
WHERE mid.database_id = DB_ID()
ORDER BY migs.avg_user_impact DESC;

-- 4. Connection pool state — look here if you see "timeout" errors in the API logs
SELECT
    DB_NAME(database_id)              AS db,
    COUNT(*)                          AS connections,
    SUM(CASE WHEN status = 'running'   THEN 1 ELSE 0 END) AS running,
    SUM(CASE WHEN status = 'sleeping'  THEN 1 ELSE 0 END) AS sleeping
FROM sys.dm_exec_sessions
WHERE database_id > 0
GROUP BY DB_NAME(database_id);

-- 5. Wait stats since startup — what's SQL Server actually spending time on?
-- LCK_*  = locking/blocking issues
-- PAGEIOLATCH_* = waiting on disk (slow storage or missing index)
-- CXPACKET = parallelism
-- ASYNC_NETWORK_IO = client is slow to read results (Node not draining fast enough)
SELECT TOP 10
    wait_type,
    waiting_tasks_count,
    wait_time_ms,
    wait_time_ms / NULLIF(waiting_tasks_count, 0) AS avg_wait_ms
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN ('SLEEP_TASK','BROKER_RECEIVE_WAITFOR','REQUEST_FOR_DEADLOCK_SEARCH',
                       'LAZYWRITER_SLEEP','CHECKPOINT_QUEUE','SQLTRACE_BUFFER_FLUSH',
                       'CLR_AUTO_EVENT','CLR_MANUAL_EVENT','XE_DISPATCHER_WAIT','XE_TIMER_EVENT')
  AND waiting_tasks_count > 0
ORDER BY wait_time_ms DESC;

-- 6. Reset wait stats before a clean test run (admin only)
-- DBCC SQLPERF('sys.dm_os_wait_stats', CLEAR);
