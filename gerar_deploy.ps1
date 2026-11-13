# Script PowerShell de geracao do pacote de Deploy para Netlify
$ErrorActionPreference = "Stop"

$workspace = "C:\Users\Admin\Downloads\RDO_ENG"
$outDir = Join-Path $workspace "out"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GERANDO PACOTE DE DEPLOY PARA NETLIFY (PASTA 'out')" -ForegroundColor Green
Write-Host "  Sistema de Gestao da Qualidade - Engenharia CMPC" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/6] Limpando pasta 'out' anterior..." -ForegroundColor Gray
if (Test-Path $outDir) {
    Remove-Item -Recurse -Force $outDir
}

New-Item -ItemType Directory -Path (Join-Path $outDir "css") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "js") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "desktop") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "mobile") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "admin") -Force | Out-Null

Write-Host "[2/7] Copiando arquivos raiz..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "index.html") $outDir -Force
Copy-Item (Join-Path $workspace "logo cmpc.png") $outDir -Force
if (Test-Path (Join-Path $workspace "MANUAL_DE_USO.md")) {
    Copy-Item (Join-Path $workspace "MANUAL_DE_USO.md") $outDir -Force
}

Write-Host "[3/7] Copiando arquivos CSS e JS raiz..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "css\*") (Join-Path $outDir "css") -Recurse -Force
Copy-Item (Join-Path $workspace "js\*") (Join-Path $outDir "js") -Recurse -Force

Write-Host "[4/7] Copiando pasta DESKTOP..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "desktop\*") (Join-Path $outDir "desktop") -Recurse -Force

Write-Host "[5/7] Copiando pasta MOBILE..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "mobile\*") (Join-Path $outDir "mobile") -Recurse -Force

Write-Host "[6/7] Copiando pasta ADMIN (Super Admin Master)..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "admin\*") (Join-Path $outDir "admin") -Recurse -Force

Write-Host "[7/7] Gerando configuracoes de rotas e seguranca do Netlify..." -ForegroundColor Gray
# Netlify SPA Redirects
$redirects = "/admin/*    /admin/index.html   200`n/mobile/*    /mobile/index.html   200`n/desktop/*   /desktop/index.html  200`n/*           /index.html          200"
Set-Content -Path (Join-Path $outDir "_redirects") -Value $redirects

# Netlify Security Headers
$headers = "/*`n  X-Frame-Options: SAMEORIGIN`n  X-XSS-Protection: 1; mode=block`n  X-Content-Type-Options: nosniff`n  Referrer-Policy: strict-origin-when-cross-origin"
Set-Content -Path (Join-Path $outDir "_headers") -Value $headers

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PACOTE DE DEPLOY GERADO COM SUCESSO EM:" -ForegroundColor Green
Write-Host "  $outDir" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "INSTRUCOES PARA DEPLOY MANUAL NO NETLIFY:" -ForegroundColor Yellow
Write-Host "1. Abra seu navegador em: https://app.netlify.com/drop"
Write-Host "2. Faca login na sua conta Netlify."
Write-Host "3. Arraste e solte a pasta 'out' inteira para a area de upload."
Write-Host "4. Seu sistema estara publicado e online em poucos segundos!"
Write-Host ""
