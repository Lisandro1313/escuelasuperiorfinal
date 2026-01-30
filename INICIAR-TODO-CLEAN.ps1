#!/usr/bin/env pwsh
# Script para iniciar todo el sistema Campus Virtual

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 INICIANDO CAMPUS VIRTUAL - SISTEMA COMPLETO  " -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Rutas
$backendPath = "$PSScriptRoot\backend"
$frontendPath = "$PSScriptRoot\frontend"

# Verificar que existan los directorios
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Error: No se encuentra el directorio backend" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Error: No se encuentra el directorio frontend" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Backend:  $backendPath" -ForegroundColor Gray
Write-Host "📂 Frontend: $frontendPath" -ForegroundColor Gray
Write-Host ""

# Iniciar backend en nueva ventana
Write-Host "🟢 Iniciando Backend (Puerto 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host '🚀 BACKEND - CAMPUS VIRTUAL' -ForegroundColor Green; npm start"
)

Start-Sleep -Seconds 2

# Iniciar frontend en nueva ventana
Write-Host "🟢 Iniciando Frontend (Puerto 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; Write-Host '🚀 FRONTEND - CAMPUS VIRTUAL' -ForegroundColor Cyan; npm run dev"
)

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "          ✅ SISTEMA INICIADO CORRECTAMENTE           " -ForegroundColor White -BackgroundColor Green
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 ACCEDE EN:" -ForegroundColor Yellow
Write-Host "   👉 " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 CREDENCIALES:" -ForegroundColor Yellow
Write-Host "   Admin:      norma.admin@escuelanorma.com / Norma2025!Secure"
Write-Host "   Profesor:   maria.gonzalez@campus.com / Test123!"
Write-Host "   Estudiante: ana.lopez@estudiante.com / Test123!"
Write-Host ""
Write-Host "💡 TIP: Presiona Ctrl+Shift+R en el navegador para limpiar cache" -ForegroundColor Gray
Write-Host ""
Write-Host "Se abrieron 2 ventanas de PowerShell:" -ForegroundColor Cyan
Write-Host "  - Backend (Node.js + Express)" -ForegroundColor Gray
Write-Host "  - Frontend (React + Vite)" -ForegroundColor Gray
Write-Host ""
Write-Host "Para detener el sistema, cierra esas ventanas." -ForegroundColor Gray
Write-Host ""
