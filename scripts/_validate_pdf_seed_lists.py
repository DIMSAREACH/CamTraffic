import re
from pathlib import Path
from importlib.machinery import SourceFileLoader

text = Path(r'D:\Year4\Project Thesis\Expert System\Project\CamTraffic\data\pputmp_12245858_01_extracted.txt').read_text(encoding='utf-8', errors='ignore').lower()
mod = SourceFileLoader('seed', r'D:\Year4\Project Thesis\Expert System\Project\CamTraffic\scripts\generate_pdf_based_demo_seed.py').load_module()

def norm(s):
    s = s.lower()
    s = s.replace('boulevard','blvd').replace('street','st').replace('road','rd')
    s = re.sub(r'\s+',' ',s)
    return s.strip()

missing=[]
for r in mod.REAL_ROADS:
    n = norm(r)
    alts = {n, n.replace('blvd', 'boulevard'), n.replace('st ', 'street '), n.replace('nr', 'national road '), n.replace(' (c1)','').replace(' approach','')}
    if not any(a in text for a in alts if a):
        missing.append(r)
print('roads total', len(mod.REAL_ROADS), 'missing', len(missing))
for x in missing:
    print(' -', x)

missing_i=[]
for it in mod.REAL_INTERSECTIONS:
    parts=[p.strip() for p in re.split(r'/| and ', it.lower()) if p.strip()]
    if len(parts)>=2:
        p1,p2 = parts[0], parts[1]
        ok1 = norm(p1) in text or p1 in text
        ok2 = norm(p2) in text or p2 in text
        if not (ok1 and ok2):
            missing_i.append(it)
print('intersections total', len(mod.REAL_INTERSECTIONS), 'missing approx', len(missing_i))
for x in missing_i[:60]:
    print(' -', x)
