$path = "supabase\clean_schema\UNIFIED_SCHEMA.sql"
$content = Get-Content -Path $path
$content | Set-Content -Path $path -Encoding utf8
