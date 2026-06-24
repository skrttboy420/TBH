# -*- mode: python ; coding: utf-8 -*-
# Build the double-click agent:  build_exe.bat   (or)   pyinstaller tbh-agent.spec
# Produces a single dist/tbh-agent.exe (console). On a fresh machine it asks only
# for the agent token, then starts the agent — no Python needed on that PC.

# Dynamic imports the analyzer can't see by following `import` statements:
#   control.py  → win32gui / win32con / win32ui (pywin32), keyboard, PIL
#   es3.py      → cryptography (handled by PyInstaller's bundled hook)
hiddenimports = [
    "win32gui",
    "win32con",
    "win32ui",
    "win32api",
    "pywintypes",
    "pythoncom",
    "keyboard",
    "PIL.Image",
    "PIL.ImageGrab",
]

a = Analysis(
    ["run.py"],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "numpy", "matplotlib", "pytest"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="tbh-agent",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
