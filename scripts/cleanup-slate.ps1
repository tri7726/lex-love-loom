$srcPath = "c:\Users\Pheo\OneDrive\Documents\NetBeansProjects\lex-love-loom\src"
$files = Get-ChildItem -Path $srcPath -Include "*.tsx","*.ts" -Recurse -File
$count = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    $content = $content -replace '\bbg-slate-300\b', 'bg-sakura-light/40'
    $content = $content -replace '\bbg-slate-200\b', 'bg-border'
    $content = $content -replace '\bborder-slate-300\b', 'border-border'
    $content = $content -replace '\bborder-slate-400\b', 'border-border'
    $content = $content -replace '\bborder-slate-50\b', 'border-border/30'
    $content = $content -replace '\bbg-slate-400\b', 'bg-muted-foreground/50'
    $content = $content -replace '\bhover:bg-slate-300\b', 'hover:bg-sakura-light/50'
    $content = $content -replace '\bhover:bg-slate-100\b', 'hover:bg-sakura-light/30'
    $content = $content -replace '\bbg-gray-200\b', 'bg-border'
    $content = $content -replace '\bbg-gray-300\b', 'bg-sakura-light/40'
    $content = $content -replace '\btext-gray-200\b', 'text-muted-foreground/40'
    $content = $content -replace '\btext-gray-300\b', 'text-muted-foreground/50'
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        $count++
        Write-Host "  Updated: $($file.Name)"
    }
}
Write-Host "Done! $count files updated." -ForegroundColor Green
