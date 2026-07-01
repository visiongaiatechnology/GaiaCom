# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
with open(r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Backend\repository\sql_store.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if "func (s *SQLStore) FindRoomByID" in line:
        found = True
    if found:
        print(f"{i+1}: {line.rstrip()}")
        if line.startswith("}"):
            break
