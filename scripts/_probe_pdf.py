from pathlib import Path
pdf_path = Path(r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\Image\12245858_01.pdf")
print('exists', pdf_path.exists(), 'size', pdf_path.stat().st_size if pdf_path.exists() else 0)
text = ''
try:
    import pypdf
    r = pypdf.PdfReader(str(pdf_path))
    print('pages', len(r.pages))
    for i,p in enumerate(r.pages[:20]):
        t = p.extract_text() or ''
        if i < 2:
            print('\n--- page', i+1, 'sample ---')
            print(t[:1200])
        text += '\n' + t
except Exception as e:
    print('pypdf failed', e)

if not text.strip():
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        print('fitz pages', doc.page_count)
        for i in range(min(20, doc.page_count)):
            t = doc.load_page(i).get_text('text')
            if i < 2:
                print('\n--- fitz page', i+1, 'sample ---')
                print(t[:1200])
            text += '\n' + t
    except Exception as e:
        print('fitz failed', e)

print('total extracted chars', len(text))
