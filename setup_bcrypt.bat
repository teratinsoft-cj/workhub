@echo off
echo Installing/Reinstalling bcrypt for Windows compatibility...
pip uninstall bcrypt -y
pip install bcrypt==4.1.2
echo.
echo Bcrypt installation complete. Please restart your backend server.

