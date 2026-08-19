$port = 3000

$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if ($existing) {
    foreach ($processId in $existing) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
        }
    }
}

& ".\\node_modules\\.bin\\next.cmd" dev -p $port
