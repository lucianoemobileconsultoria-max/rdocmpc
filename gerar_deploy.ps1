# Script PowerShell de geracao do pacote de Deploy para Netlify
$ErrorActionPreference = "Stop"

$workspace = "C:\Users\Admin\Downloads\RDO_ENG"
$outDir = Join-Path $workspace "out"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GERANDO PACOTE DE DEPLOY PARA NETLIFY (PASTA 'out')" -ForegroundColor Green
Write-Host "  Sistema de Gestao da Qualidade - Engenharia CMPC" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Limpando pasta 'out' anterior..." -ForegroundColor Gray
if (Test-Path $outDir) {
    Remove-Item -Recurse -Force $outDir
}

New-Item -ItemType Directory -Path (Join-Path $outDir "css") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "js") -Force | Out-Null

Write-Host "[2/5] Copiando arquivos HTML, imagens e manuais..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "index.html") $outDir -Force
Copy-Item (Join-Path $workspace "logo cmpc.png") $outDir -Force
if (Test-Path (Join-Path $workspace "MANUAL_DE_USO.md")) {
    Copy-Item (Join-Path $workspace "MANUAL_DE_USO.md") $outDir -Force
}

Write-Host "[3/5] Copiando arquivos CSS..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "css\*") (Join-Path $outDir "css") -Recurse -Force

Write-Host "[4/5] Copiando scripts JavaScript..." -ForegroundColor Gray
Copy-Item (Join-Path $workspace "js\*") (Join-Path $outDir "js") -Recurse -Force

Write-Host "[5/5] Gerando configuracoes de rotas e seguranca do Netlify..." -ForegroundColor Gray
# Netlify SPA Redirect
Set-Content -Path (Join-Path $outDir "_redirects") -Value "/*    /index.html   200"

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
