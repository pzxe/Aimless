@echo off
rem Removes the "downloaded from the internet" mark from Aimless.exe, then starts it.
cd /d "%~dp0"
powershell -NoProfile -Command "Unblock-File -Path .\Aimless.exe"
start "" "%~dp0Aimless.exe"
