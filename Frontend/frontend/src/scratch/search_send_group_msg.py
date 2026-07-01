# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import re

file_path = r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Frontend\frontend\src\App.js"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "async function handleSendGroupMessage" in line or "function handleSendGroupMessage" in line:
        print(f"Line {i + 1}: {line.strip()}")
        # print 20 lines after
        for j in range(1, 35):
            print(f"Line {i + 1 + j}: {lines[i + j].strip()}")
        break
