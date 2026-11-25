@echo off
setlocal
title FreeLLMAPI Video Studio
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo The official Node.js 24 download will open in your browser.
  echo Install it, then double-click START_VIDEO_STUDIO again.
  start "" "https://nodejs.org/dist/v24.22.3/node-v24.22.3-x64.msi"
  pause
  exit /b 1
)

node scripts\launch-video-studio.mjs
if errorlevel 1 (
  echo.
  echo Setup could not finish. Please share the error text, without API keys.
  pause
  exit /b 1
)
