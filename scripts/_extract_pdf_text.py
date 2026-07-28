from pathlib import Path
import pypdf
pdf = Path(r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\Image\12245858_01.pdf")
out = Path(r"D:\Year4\Project Thesis\Expert System\Project\CamTraffic\data\pputmp_12245858_01_extracted.txt")
r = pypdf.PdfReader(str(pdf))
chunks=[]
for i,p in enumerate(r.pages, start=1):
    t = p.extract_text() or ''
    chunks.append(f"\n\n===== PAGE {i} =====\n" + t)
out.write_text(''.join(chunks), encoding='utf-8')
print('wrote', out, 'chars', out.stat().st_size)
