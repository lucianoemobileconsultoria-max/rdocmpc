@echo off
title Servidor Local - RDO Engenharia CMPC
cd /d "%~dp0"

echo ================================================================
echo   INICIANDO SERVIDOR LOCAL (LOCALHOST)
echo   Sistema de Gestao da Qualidade - Engenharia CMPC
echo ================================================================
echo.
echo   URL de Acesso: http://localhost:8080
echo   Para encerrar o servidor, feche esta janela ou pressione CTRL + C.
echo.
echo ================================================================

:: Abrir o navegador automaticamente em 1 segundo
start "" http://localhost:8080

:: Iniciar o servidor HTTP via Python ou Node
python -m http.server 8080 2>nul
if errorlevel 1 (
    echo Python nao encontrado, iniciando via Node.js / npx...
    npx -y serve -l 8080 .
)

pause
