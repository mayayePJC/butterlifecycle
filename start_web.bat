@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

start "" "http://127.0.0.1:8787"
"%NODE_EXE%" webapp\server.js

pause
