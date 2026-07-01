# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Frontend\frontend\src\App.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if any(keyword in line for keyword in ["groupNameInput", "groupDescriptionInput", "groupAvatarInput", "isCrisisRoomInput", "newChannelNameInput"]):
        print(f"{i+1}: {line.strip()}")
