# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import os

frontend_path = r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Frontend\frontend\src"

for root, dirs, files in os.walk(frontend_path):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "CreatorID" in content or "creatorId" in content or "CreatedBy" in content or "createdBy" in content:
                print(f"Found in {os.path.relpath(filepath, frontend_path)}")
                for i, line in enumerate(content.splitlines()):
                    if any(x in line for x in ["CreatorID", "creatorId", "CreatedBy", "createdBy"]):
                        print(f"  Line {i+1}: {line.strip()}")
