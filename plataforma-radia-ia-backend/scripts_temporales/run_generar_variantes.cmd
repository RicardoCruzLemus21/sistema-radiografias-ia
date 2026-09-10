@echo off
cd /d "%~dp0\.."
echo ==== Corrida: %date% %time% ==== >> "scripts_temporales\generar_variantes.log"
"C:\Program Files\nodejs\node.exe" scripts_temporales\generar_variantes_patologias.js >> "scripts_temporales\generar_variantes.log" 2>&1
