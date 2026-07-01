# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import json

log_trans = r"C:\Users\Masterboard\.gemini\antigravity\brain\a50d6dcd-e474-4094-bf5f-7cecafe6e5e4\.system_generated\logs\transcript_full.jsonl"
dest_path = r"C:\Users\Masterboard\.gemini\antigravity\brain\a50d6dcd-e474-4094-bf5f-7cecafe6e5e4\step_3620_content.txt"

with open(log_trans, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if idx + 1 == 3620:
            data = json.loads(line)
            content = data.get('content', '')
            with open(dest_path, 'w', encoding='utf-8') as outf:
                outf.write(content)
            print("Saved step 3620 content to destination successfully.")
            break
