import re
from pathlib import Path

p = Path(__file__).parent / "upload_card_block.tsx"
t = p.read_text(encoding="utf-8")
t = re.sub(r"<motion(\s)", r"<div\1", t)
t = t.replace("</motion>", "</div>")
p.write_text(t, encoding="utf-8")
print("fixed", p)
