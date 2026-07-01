# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
with open(r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Frontend\frontend\src\App.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "activeIdentity" in line:
        print(f"{i+1}: {line.strip()}")
