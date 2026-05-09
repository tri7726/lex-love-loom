$srcPath = "c:\Users\Pheo\OneDrive\Documents\NetBeansProjects\lex-love-loom\src"

# Fix index.css - Remove .dark{} and .theme-tokyo{} blocks
$cssPath = "$srcPath\index.css"
$css = [System.IO.File]::ReadAllText($cssPath)
$css = [regex]::Replace($css, '(?s)\r?\n  \.dark\s*\{.*?\r?\n  \}', '')
$css = [regex]::Replace($css, '(?s)\r?\n  \.theme-tokyo\s*\{.*?\r?\n  \}', '')
[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.UTF8Encoding]::new($false))
Write-Host "Fixed: index.css" -ForegroundColor Green

# Process all tsx/ts files
$files = Get-ChildItem -Path $srcPath -Include "*.tsx","*.ts" -Recurse -File
$count = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # Button combos - specific first
    $content = $content -replace 'bg-slate-900 text-white hover:bg-black', 'bg-primary text-primary-foreground hover:bg-primary/90'
    $content = $content -replace 'bg-slate-900 hover:bg-black text-white', 'bg-primary hover:bg-primary/90 text-primary-foreground'
    $content = $content -replace 'bg-slate-900 text-white hover:bg-slate-800', 'bg-primary text-primary-foreground hover:bg-primary/90'

    # Remove all dark: variant classes
    $content = [regex]::Replace($content, '\s+dark:[a-zA-Z0-9/:_\[\]#.\-]+', '')

    # Replace dark backgrounds
    $content = $content -replace '\bbg-slate-950\b', 'bg-background'
    $content = $content -replace '\bbg-slate-900\b', 'bg-card'
    $content = $content -replace '\bbg-slate-800\b', 'bg-muted'
    $content = $content -replace '\bbg-slate-700\b', 'bg-muted'
    $content = $content -replace '\bbg-gray-900\b', 'bg-card'
    $content = $content -replace '\bbg-gray-800\b', 'bg-muted'
    $content = $content -replace '\bhover:bg-slate-900\b', 'hover:bg-primary/90'
    $content = $content -replace '\bhover:bg-slate-800\b', 'hover:bg-muted'
    $content = $content -replace '\bhover:bg-black\b', 'hover:bg-primary/90'
    $content = $content -replace '\bbg-black\b', 'bg-primary'
    $content = $content -replace '\bbg-slate-100\b', 'bg-sakura-light/20'
    $content = $content -replace '\bbg-slate-50\b', 'bg-cream'
    $content = $content -replace '\bbg-gray-100\b', 'bg-sakura-light/20'
    $content = $content -replace '\bbg-gray-50\b', 'bg-cream'

    # Replace text colors
    $content = $content -replace '\btext-slate-900\b', 'text-foreground'
    $content = $content -replace '\btext-slate-800\b', 'text-foreground'
    $content = $content -replace '\btext-slate-700\b', 'text-foreground/80'
    $content = $content -replace '\btext-slate-600\b', 'text-foreground/70'
    $content = $content -replace '\btext-slate-500\b', 'text-muted-foreground'
    $content = $content -replace '\btext-slate-400\b', 'text-muted-foreground/70'
    $content = $content -replace '\btext-slate-300\b', 'text-muted-foreground/50'
    $content = $content -replace '\btext-slate-200\b', 'text-muted-foreground/40'
    $content = $content -replace '\btext-slate-100\b', 'text-primary-foreground'
    $content = $content -replace '\btext-gray-900\b', 'text-foreground'
    $content = $content -replace '\btext-gray-800\b', 'text-foreground'
    $content = $content -replace '\btext-gray-700\b', 'text-foreground/80'
    $content = $content -replace '\btext-gray-600\b', 'text-foreground/70'
    $content = $content -replace '\btext-gray-500\b', 'text-muted-foreground'
    $content = $content -replace '\btext-gray-400\b', 'text-muted-foreground/70'

    # Replace border colors
    $content = $content -replace '\bborder-slate-900\b', 'border-border'
    $content = $content -replace '\bborder-slate-800\b', 'border-border'
    $content = $content -replace '\bborder-slate-700\b', 'border-border'
    $content = $content -replace '\bborder-slate-600\b', 'border-border'
    $content = $content -replace '\bborder-slate-200\b', 'border-border'
    $content = $content -replace '\bborder-slate-100\b', 'border-border/50'
    $content = $content -replace '\bborder-gray-800\b', 'border-border'
    $content = $content -replace '\bborder-gray-200\b', 'border-border'
    $content = $content -replace '\bborder-gray-100\b', 'border-border/50'

    # KanaRain rain field
    $content = $content -replace 'from-slate-950 via-slate-900 to-slate-800', 'from-sakura-light/40 via-cream to-sakura-light/20'
    $content = $content -replace 'border-slate-700', 'border-sakura-light/50'
    $content = $content -replace 'from-red-900/30', 'from-primary/20'
    $content = $content -replace 'border-red-500/20', 'border-primary/20'
    $content = $content -replace 'bg-white/10 backdrop-blur-sm text-white border-white/10', 'bg-white/80 backdrop-blur-sm text-foreground border-sakura-light/50'
    $content = $content -replace 'bg-cyan-400 text-white border-cyan-300 scale-110', 'bg-sakura text-white border-sakura/70 scale-110'
    $content = $content -replace 'text-white/20 font-black text-sm uppercase tracking-widest', 'text-muted-foreground/40 font-black text-sm uppercase tracking-widest'
    $content = $content -replace 'from-cyan-400 to-blue-400', 'from-sakura to-sakura-dark'
    $content = $content -replace 'from-cyan-400 to-blue-500', 'from-sakura to-sakura-dark'
    $content = $content -replace 'focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50', 'focus:border-primary focus:ring-4 focus:ring-primary/10'
    $content = $content -replace '\btext-cyan-500\b', 'text-primary'
    $content = $content -replace '\btext-cyan-400\b', 'text-primary'
    $content = $content -replace '\btext-cyan-200\b', 'text-sakura-light'
    $content = $content -replace '\bhover:text-cyan-500\b', 'hover:text-primary'
    $content = $content -replace '\bborder-cyan-300\b', 'border-primary/70'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        $count++
        Write-Host "  Updated: $($file.Name)"
    }
}

Write-Host "Done! $count files updated." -ForegroundColor Green
