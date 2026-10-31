@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22 ou superior para iniciar o jogo.
  pause
  exit /b 1
)
echo Abra http://localhost:3000 no navegador.
echo Mantenha esta janela aberta enquanto joga. Ctrl+C encerra o servidor.
node server.js
pause
