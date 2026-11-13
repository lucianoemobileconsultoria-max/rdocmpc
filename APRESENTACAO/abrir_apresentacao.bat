@echo off
title Apresentacao do Sistema RDO - Engenharia CMPC
cd /d "%~dp0"

echo ================================================================
echo   ABRINDO APRESENTACAO DO SISTEMA E APP RDO (CMPC)
echo ================================================================
echo.
echo   Abrindo no navegador padrao...
echo   Dica de Apresentacao:
echo   - Pressione [F] para Tela Cheia
echo   - Use [Espaco] ou as Setas [->] e [<-] para navegar
echo   - Pressione [O] para ver o indice de miniaturas
echo   - Pressione [P] para exportar ou imprimir em PDF
echo.
echo ================================================================

start "" "index.html"

exit
