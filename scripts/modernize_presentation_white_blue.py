import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_BAK = ROOT / 'docs/presentations/templates/misa-note-strategy.pptx.bak'
TEMPLATE_OUT = ROOT / 'docs/presentations/templates/misa-note-strategy.pptx'
LAYOUT_PATH = ROOT / 'docs/presentations/templates/misa-note-strategy.layout.json'

P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
ET.register_namespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main')
ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')

layout = json.loads(LAYOUT_PATH.read_text())

with ZipFile(TEMPLATE_BAK) as z:
    parts = {name: z.read(name) for name in z.namelist()}

# Palette: White & Blue brand theme (NO BLACK)
# Primary Blue: 0066CC / 1D4ED8 / 2563EB
# Dark Navy Blue for headings: 1E3A8A / 0F3D78 (never black)
# Light Blue tints: EFF6FF / F0F7FF / DBEAFE
# Borders: CBD5E1 / BFDBFE
# Text body: 334155 (crisp dark slate)
# Card accents: All shades of Blue (Royal Blue, Electric Blue, Sky Blue, Cyan Blue)
BLUE_ACCENTS = ['2563EB', '0284C7', '0EA5E9', '3B82F6', '1D4ED8', '0284C7']

DIVIDER_SLIDES = {2, 5, 28, 37}

for i, spec in enumerate(layout['slides'], 1):
    path = f'ppt/slides/slide{i}.xml'
    doc = ET.fromstring(parts[path])
    cSld = doc.find(f'{P}cSld')
    spTree = cSld.find(f'{P}spTree')
    
    # 1. Slide Background: Always clean WHITE (FFFFFF) or very subtle cool white (F8FAFC)
    bg = cSld.find(f'{P}bg')
    if bg is None:
        bg = ET.Element(f'{P}bg')
        cSld.insert(0, bg)
    else:
        bg.clear()
    bgPr = ET.SubElement(bg, f'{P}bgPr')
    fill = ET.SubElement(bgPr, f'{A}solidFill')
    # White background across all slides
    ET.SubElement(fill, f'{A}srgbClr', val='FFFFFF')
    
    shapes = {s.find(f'{P}nvSpPr/{P}cNvPr').get('id'): s for s in doc.findall(f'.//{P}sp')}
    
    # Shape 2: Top header accent bar -> Vibrant MISA Blue
    if '2' in shapes:
        spPr2 = shapes['2'].find(f'{P}spPr')
        fill2 = spPr2.find(f'{A}solidFill/{A}srgbClr')
        if fill2 is not None:
            fill2.set('val', '0066CC')
            
    # Slide 1: Cover Slide (White & Blue Theme)
    if i == 1:
        # Tagline / Subtitle top
        if '3' in shapes:
            for rpr in shapes['3'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '0066CC')
                rpr.set('b', '1')
        # Title: "MISA NOTE\nTừ ghi chú đến tri thức dùng được"
        if '4' in shapes:
            for rpr in shapes['4'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '1E3A8A') # Rich dark blue
                rpr.set('b', '1')
        # 4 Cards on Slide 1: Clean white cards with light blue tint / border
        for idx, cid in enumerate(['5', '8', '11', '14']):
            if cid in shapes:
                spPr = shapes[cid].find(f'{P}spPr')
                spPr.find(f'{A}solidFill/{A}srgbClr').set('val', 'F0F7FF') # Light soft blue card
                ln = spPr.find(f'{A}ln')
                if ln is None:
                    ln = ET.SubElement(spPr, f'{A}ln', w='12700')
                lnClr = ln.find(f'{A}solidFill/{A}srgbClr')
                if lnClr is None:
                    sf = ET.SubElement(ln, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val='BFDBFE')
                else:
                    lnClr.set('val', 'BFDBFE')
                    
                # Add top blue accent bar on each card
                xfrm = spPr.find(f'{A}xfrm')
                if xfrm is not None:
                    cx = int(xfrm.find(f'{A}off').get('x'))
                    cy = int(xfrm.find(f'{A}off').get('y'))
                    cw = int(xfrm.find(f'{A}ext').get('cx'))
                    acc = ET.SubElement(spTree, f'{P}sp')
                    nv = ET.SubElement(acc, f'{P}nvSpPr')
                    ET.SubElement(nv, f'{P}cNvPr', id=f'99{cid}', name=f'CoverCardAccent_{cid}')
                    ET.SubElement(nv, f'{P}cNvSpPr')
                    ET.SubElement(nv, f'{P}nvPr')
                    aspPr = ET.SubElement(acc, f'{P}spPr')
                    aaxfrm = ET.SubElement(aspPr, f'{A}xfrm')
                    ET.SubElement(aaxfrm, f'{A}off', x=str(cx), y=str(cy))
                    ET.SubElement(aaxfrm, f'{A}ext', cx=str(cw), cy='40000') # top 3.5pt line
                    ET.SubElement(aspPr, f'{A}prstGeom', prst='roundRect')
                    sf = ET.SubElement(aspPr, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val='0066CC')
                    ln = ET.SubElement(aspPr, f'{A}ln')
                    ET.SubElement(ln, f'{A}noFill')

        # Card headers: "Phần I", "Phần II", "Phần III", "Phần IV" -> Vivid Blue 0066CC
        for hid in ['6', '9', '12', '15']:
            if hid in shapes:
                for rpr in shapes[hid].findall(f'.//{A}rPr'):
                    clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                    if clr is not None: clr.set('val', '0066CC')
                    rpr.set('b', '1')
        # Card descriptions -> Dark Navy-Slate 1E3A8A
        for did in ['7', '10', '13', '16']:
            if did in shapes:
                for rpr in shapes[did].findall(f'.//{A}rPr'):
                    clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                    if clr is not None: clr.set('val', '334155')
        if '19' in shapes:
            for rpr in shapes['19'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '64748B')
                
    # Section Dividers (Slides 2, 5, 28, 37) in White & Blue Theme
    elif i in DIVIDER_SLIDES:
        # Section tag (Shape 3) -> MISA Blue 0066CC bold
        if '3' in shapes:
            for rpr in shapes['3'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '0066CC')
                rpr.set('b', '1')
        # Main Title (Shape 4) -> Deep Royal Navy 1E3A8A bold
        if '4' in shapes:
            for rpr in shapes['4'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '1E3A8A')
                rpr.set('b', '1')
        # Description / Context (Shape 5) -> Slate-700 334155
        if '5' in shapes:
            for rpr in shapes['5'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '334155')
        # Decorative divider card/line behind title on divider slides
        if '4' in shapes:
            xfrm4 = shapes['4'].find(f'{P}spPr/{A}xfrm')
            if xfrm4 is not None:
                x4 = int(xfrm4.find(f'{A}off').get('x'))
                y4 = int(xfrm4.find(f'{A}off').get('y'))
                h4 = int(xfrm4.find(f'{A}ext').get('cy'))
                # Add an elegant vertical decorative bar to the left of the title
                div_bar = ET.SubElement(spTree, f'{P}sp')
                nv = ET.SubElement(div_bar, f'{P}nvSpPr')
                ET.SubElement(nv, f'{P}cNvPr', id='9988', name='DividerAccentBar')
                ET.SubElement(nv, f'{P}cNvSpPr')
                ET.SubElement(nv, f'{P}nvPr')
                dspPr = ET.SubElement(div_bar, f'{P}spPr')
                daxfrm = ET.SubElement(dspPr, f'{A}xfrm')
                ET.SubElement(daxfrm, f'{A}off', x=str(max(0, x4 - 200000)), y=str(y4 + 50000))
                ET.SubElement(daxfrm, f'{A}ext', cx='80000', cy=str(max(300000, h4 - 100000)))
                ET.SubElement(dspPr, f'{A}prstGeom', prst='roundRect')
                sf = ET.SubElement(dspPr, f'{A}solidFill')
                ET.SubElement(sf, f'{A}srgbClr', val='0066CC')
                ln = ET.SubElement(dspPr, f'{A}ln')
                ET.SubElement(ln, f'{A}noFill')
                
        # Page number
        for pid in ['6', '8', '19', '21']:
            if pid in shapes:
                for rpr in shapes[pid].findall(f'.//{A}rPr'):
                    clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                    if clr is not None: clr.set('val', '94A3B8')

    # Content Slides (all other 40 slides)
    else:
        # Section tag (Shape 3) -> MISA Blue 0066CC
        if '3' in shapes:
            for rpr in shapes['3'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '0066CC')
                rpr.set('b', '1')
                
        # Slide Title (Shape 4) -> Deep Blue 1E3A8A (NOT black)
        if '4' in shapes:
            for rpr in shapes['4'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '1E3A8A')
                rpr.set('b', '1')
                
        # Intro / Subtitle (Shape 5) if present and not a table cell
        if '5' in shapes and spec.get('profile') != 'table' and spec.get('kind') not in ['table', 'board-table']:
            for rpr in shapes['5'].findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None: clr.set('val', '475569')
                
        is_table = spec.get('profile') == 'table' or spec.get('kind') in ['table', 'board-table']
        card_counter = 0
        
        for sid, sp in shapes.items():
            if sid in ['2', '3', '4']:
                continue
                
            spPr = sp.find(f'{P}spPr')
            fill = spPr.find(f'{A}solidFill/{A}srgbClr')
            fill_val = fill.get('val') if fill is not None else None
            
            # Bottom callout banner (usually EAF3FF)
            if fill_val == 'EAF3FF':
                fill.set('val', 'EFF6FF')
                ln = spPr.find(f'{A}ln')
                if ln is None:
                    ln = ET.SubElement(spPr, f'{A}ln', w='12700')
                lnClr = ln.find(f'{A}solidFill/{A}srgbClr')
                if lnClr is None:
                    sf = ET.SubElement(ln, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val='BFDBFE')
                else:
                    lnClr.set('val', 'BFDBFE')
                    
                for rpr in sp.findall(f'.//{A}rPr'):
                    clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                    if clr is not None: clr.set('val', '0066CC') # MISA Blue
                    rpr.set('b', '1')
                
                # Left accent border strip
                xfrm = spPr.find(f'{A}xfrm')
                if xfrm is not None:
                    bx = int(xfrm.find(f'{A}off').get('x'))
                    by = int(xfrm.find(f'{A}off').get('y'))
                    bh = int(xfrm.find(f'{A}ext').get('cy'))
                    left_bar = ET.SubElement(spTree, f'{P}sp')
                    nv = ET.SubElement(left_bar, f'{P}nvSpPr')
                    ET.SubElement(nv, f'{P}cNvPr', id=f'98{sid}', name=f'CalloutLeftBar_{sid}')
                    ET.SubElement(nv, f'{P}cNvSpPr')
                    ET.SubElement(nv, f'{P}nvPr')
                    lspPr = ET.SubElement(left_bar, f'{P}spPr')
                    laxfrm = ET.SubElement(lspPr, f'{A}xfrm')
                    ET.SubElement(laxfrm, f'{A}off', x=str(bx), y=str(by))
                    ET.SubElement(laxfrm, f'{A}ext', cx='50000', cy=str(bh))
                    ET.SubElement(lspPr, f'{A}prstGeom', prst='rect')
                    sf = ET.SubElement(lspPr, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val='0066CC')
                    ln = ET.SubElement(lspPr, f'{A}ln')
                    ET.SubElement(ln, f'{A}noFill')
                continue
                
            # Table slides
            if is_table:
                if fill_val == '0066CC': # Table Header
                    fill.set('val', '0066CC') # Pure MISA Blue
                    for rpr in sp.findall(f'.//{A}rPr'):
                        clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                        if clr is not None: clr.set('val', 'FFFFFF')
                        rpr.set('b', '1')
                elif fill_val == 'F8FAFC': # Table Body Cell
                    fill.set('val', 'FFFFFF')
                    ln = spPr.find(f'{A}ln')
                    if ln is not None:
                        lnClr = ln.find(f'{A}solidFill/{A}srgbClr')
                        if lnClr is not None: lnClr.set('val', 'DBEAFE')
                    for rpr in sp.findall(f'.//{A}rPr'):
                        clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                        if clr is not None:
                            if clr.get('val') in ['111827', '000000']:
                                clr.set('val', '334155')
                continue
                
            # Standard Card Backgrounds (F8FAFC)
            if fill_val == 'F8FAFC':
                fill.set('val', 'FFFFFF') # Pure white card
                ln = spPr.find(f'{A}ln')
                if ln is None:
                    ln = ET.SubElement(spPr, f'{A}ln', w='12700')
                lnClr = ln.find(f'{A}solidFill/{A}srgbClr')
                if lnClr is None:
                    sf = ET.SubElement(ln, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val='CBD5E1')
                else:
                    lnClr.set('val', 'CBD5E1')
                    
                # Add top blue accent pill to each card
                xfrm = spPr.find(f'{A}xfrm')
                if xfrm is not None:
                    cx = int(xfrm.find(f'{A}off').get('x'))
                    cy = int(xfrm.find(f'{A}off').get('y'))
                    cw = int(xfrm.find(f'{A}ext').get('cx'))
                    
                    accent_color = BLUE_ACCENTS[card_counter % len(BLUE_ACCENTS)]
                    card_counter += 1
                    
                    acc = ET.SubElement(spTree, f'{P}sp')
                    nv = ET.SubElement(acc, f'{P}nvSpPr')
                    ET.SubElement(nv, f'{P}cNvPr', id=f'97{sid}', name=f'CardAccent_{sid}')
                    ET.SubElement(nv, f'{P}cNvSpPr')
                    ET.SubElement(nv, f'{P}nvPr')
                    aspPr = ET.SubElement(acc, f'{P}spPr')
                    aaxfrm = ET.SubElement(aspPr, f'{A}xfrm')
                    ET.SubElement(aaxfrm, f'{A}off', x=str(cx + 150000), y=str(cy + 100000))
                    ET.SubElement(aaxfrm, f'{A}ext', cx='450000', cy='45000') # 35pt x 3.5pt pill
                    ET.SubElement(aspPr, f'{A}prstGeom', prst='roundRect')
                    sf = ET.SubElement(aspPr, f'{A}solidFill')
                    ET.SubElement(sf, f'{A}srgbClr', val=accent_color)
                    ln = ET.SubElement(aspPr, f'{A}ln')
                    ET.SubElement(ln, f'{A}noFill')
                continue
                
            # Text shapes: Card Titles vs Card Body
            for rpr in sp.findall(f'.//{A}rPr'):
                clr = rpr.find(f'{A}solidFill/{A}srgbClr')
                if clr is not None:
                    cval = clr.get('val')
                    if cval in ['0066CC', '1E3A8A']: # Card title
                        clr.set('val', '0066CC')
                        rpr.set('b', '1')
                    elif cval in ['111827', '000000']: # Body text (no black!)
                        clr.set('val', '334155')
                    elif cval == '64748B':
                        sz = int(rpr.get('sz', '1000'))
                        if sz <= 900:
                            clr.set('val', '94A3B8')
                        else:
                            clr.set('val', '475569')

    parts[path] = ET.tostring(doc, encoding='utf-8', xml_declaration=True)

with ZipFile(TEMPLATE_OUT, 'w', ZIP_DEFLATED) as z:
    for name, blob in parts.items():
        z.writestr(name, blob)

print('Updated docs/presentations/templates/misa-note-strategy.pptx with White & Blue theme (no black).')
