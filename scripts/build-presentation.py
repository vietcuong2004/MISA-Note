#!/usr/bin/env python3
"""Render presentation content from JSON into a fixed, editable PowerPoint layout.
Uses only Python's standard library; LibreOffice is optional for PDF export.
"""
from __future__ import annotations
import argparse
import bisect
import copy
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from xml.etree import ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / 'docs/presentations/misa-note-strategy.data.json'
DEFAULT_LAYOUT = ROOT / 'docs/presentations/templates/misa-note-strategy.layout.json'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PK = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
ET.register_namespace('p', P)
ET.register_namespace('a', A)
ET.register_namespace('r', R)
ET.register_namespace('', PK)


class Font:
    """Read TrueType glyph advance widths, including Vietnamese Unicode characters."""
    def __init__(self, bold: bool):
        name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
        candidates = [Path('/usr/share/fonts/truetype/dejavu') / name,
                      Path('/usr/share/fonts/dejavu') / name]
        path = next((p for p in candidates if p.exists()), None)
        if path is None:
            raise ValueError('Không tìm thấy font DejaVu Sans. Cần font này để giữ đúng bố cục slide.')
        self.data = path.read_bytes()
        u16 = lambda p: struct.unpack_from('>H', self.data, p)[0]
        u32 = lambda p: struct.unpack_from('>I', self.data, p)[0]
        tables = {}
        for i in range(u16(4)):
            off = 12 + i * 16
            tag, _, start, _ = struct.unpack_from('>4sIII', self.data, off)
            tables[tag.decode('ascii')] = start
        self.units = u16(tables['head'] + 18)
        count = u16(tables['hhea'] + 34)
        glyphs = u16(tables['maxp'] + 4)
        self.widths = [u16(tables['hmtx'] + 4 * i) for i in range(count)]
        self.widths += [self.widths[-1]] * (glyphs - count)
        cmap = tables['cmap']
        offsets = [cmap + u32(cmap + 4 + i * 8 + 4) for i in range(u16(cmap + 2))]
        self.cmap4 = next((o for o in offsets if u16(o) == 4), None)
        cmap12 = next((o for o in offsets if u16(o) == 12), None)
        self.groups = []
        if cmap12 is not None:
            self.groups = [struct.unpack_from('>III', self.data, cmap12 + 16 + i * 12)
                           for i in range(u32(cmap12 + 12))]
        self.starts = [g[0] for g in self.groups]
        self.u16 = u16

    def glyph(self, code: int) -> int:
        if self.groups:
            i = bisect.bisect_right(self.starts, code) - 1
            if i >= 0:
                start, end, glyph = self.groups[i]
                if code <= end:
                    return glyph + code - start
        if self.cmap4 is None or code > 0xffff:
            return 0
        off = self.cmap4
        count = self.u16(off + 6) // 2
        for i in range(count):
            end = self.u16(off + 14 + 2 * i)
            start = self.u16(off + 16 + 2 * count + 2 * i)
            if start <= code <= end:
                delta = self.u16(off + 16 + 4 * count + 2 * i)
                addr = off + 16 + 6 * count + 2 * i
                ro = self.u16(addr)
                if not ro:
                    return (code + delta) & 0xffff
                glyph = self.u16(addr + ro + 2 * (code - start))
                return (glyph + delta) & 0xffff if glyph else 0
        return 0

    def width(self, text: str, size: float) -> float:
        return sum(self.widths[self.glyph(ord(c))] for c in text) * size / self.units


def value_at(data, path):
    value = data
    for key in path:
        value = value[key]
    if not isinstance(value, str):
        raise ValueError(f'Trường {path} phải là chuỗi.')
    return value


def wrap(text: str, font: Font, size: float, width: float) -> list[str]:
    lines = []
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            if line and font.width(candidate, size) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    return lines


def paragraphs(text: str):
    """Keep one bullet per semantic item, not one bullet per wrapped display line."""
    result = []
    for raw in text.split('\n'):
        match = re.match(r'^\s*(?:[•●▪]|[-*]\s)\s*(.*)$', raw)
        result.append((bool(match), match.group(1) if match else raw))
    if sum(bullet for bullet, _ in result) == 1:
        result = [(False, value) for _, value in result]
    return result


def set_text(shape, text: str, fonts, *, fit: bool, context: str):
    body = shape.find(f'{{{P}}}txBody')
    first = body.find(f'{{{A}}}p')
    old_rpr = first.find(f'.//{{{A}}}rPr') if first is not None else None
    old_ppr = first.find(f'{{{A}}}pPr') if first is not None else None
    bodypr = body.find(f'{{{A}}}bodyPr')
    size = int(old_rpr.get('sz', '1200')) / 100 if old_rpr is not None else 12
    bold = old_rpr is not None and old_rpr.get('b') == '1'
    source = paragraphs(text)
    if fit:
        ext = shape.find(f'{{{P}}}spPr/{{{A}}}xfrm/{{{A}}}ext')
        width = int(ext.get('cx')) / 12700 - 16
        height = int(ext.get('cy')) / 12700 - 9
        font = fonts[bold]
        def measure(point_size):
            groups = [(bullet, wrap(value, font, point_size, width - (12 if bullet else 0)))
                      for bullet, value in source]
            gap = sum(1 for bullet, _ in groups[:-1] if bullet)
            return groups, sum(len(lines) for _, lines in groups) * point_size * 1.25 + gap
        groups, needed = measure(size)
        minimum = min(size, 9)
        while size > minimum and needed > height:
            size = max(minimum, size - .25)
            groups, needed = measure(size)
        if text and (needed > height + 1 or any(
                font.width(line, size) > width - (12 if bullet else 0) + 1
                for bullet, lines in groups for line in lines)):
            raise ValueError(f'{context}: nội dung dài hơn vùng hiển thị. Hãy rút gọn hoặc cập nhật bố cục mẫu.')
    else:
        groups = [(bullet, [value]) for bullet, value in source]
    if bodypr is not None:
        bodypr.set('wrap', 'none' if fit else 'square')
    for paragraph in list(body.findall(f'{{{A}}}p')):
        body.remove(paragraph)
    bullet_properties = {'buNone', 'buChar', 'buAutoNum', 'buBlip', 'buFont',
                         'buFontTx', 'buSzPct', 'buSzPts', 'buSzTx', 'buClr', 'buClrTx', 'spcAft'}
    for group_index, (bullet, lines) in enumerate(groups):
        paragraph = ET.SubElement(body, f'{{{A}}}p')
        props = copy.deepcopy(old_ppr) if old_ppr is not None else ET.Element(f'{{{A}}}pPr')
        for child in list(props):
            if child.tag.rsplit('}', 1)[-1] in bullet_properties:
                props.remove(child)
        props.set('marL', '152400' if bullet else '0')
        props.set('indent', '-114300' if bullet else '0')
        if bullet:
            if group_index < len(groups) - 1:
                after = ET.SubElement(props, f'{{{A}}}spcAft')
                ET.SubElement(after, f'{{{A}}}spcPts', val='100')
            # Explicit bullet color/size makes the appearance consistent across Office viewers.
            color = old_rpr.find(f'{{{A}}}solidFill') if old_rpr is not None else None
            bullet_color = ET.SubElement(props, f'{{{A}}}buClr')
            if color is not None and len(color):
                bullet_color.append(copy.deepcopy(color[0]))
            else:
                ET.SubElement(bullet_color, f'{{{A}}}srgbClr', val='111827')
            ET.SubElement(props, f'{{{A}}}buSzPct', val='100000')
            ET.SubElement(props, f'{{{A}}}buFont', typeface='DejaVu Sans')
            ET.SubElement(props, f'{{{A}}}buChar', char='•')
        else:
            ET.SubElement(props, f'{{{A}}}buNone')
        paragraph.append(props)
        for line_index, line in enumerate(lines):
            if line_index:
                ET.SubElement(paragraph, f'{{{A}}}br')
            run = ET.SubElement(paragraph, f'{{{A}}}r')
            runprops = copy.deepcopy(old_rpr) if old_rpr is not None else ET.Element(f'{{{A}}}rPr')
            runprops.set('sz', str(round(size * 100)))
            run.append(runprops)
            ET.SubElement(run, f'{{{A}}}t').text = line


def image_size(blob: bytes) -> tuple[int, int, str]:
    if blob.startswith(b'\x89PNG\r\n\x1a\n'):
        width, height = struct.unpack_from('>II', blob, 16)
        return width, height, 'png'
    if blob.startswith(b'\xff\xd8'):
        i = 2
        while i < len(blob):
            if blob[i] != 0xff:
                i += 1
                continue
            while blob[i] == 0xff:
                i += 1
            marker = blob[i]
            i += 1
            if marker in [0x01, 0xd8, 0xd9] or 0xd0 <= marker <= 0xd7:
                continue
            length = struct.unpack_from('>H', blob, i)[0]
            if marker in [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]:
                height, width = struct.unpack_from('>HH', blob, i + 3)
                return width, height, 'jpeg'
            i += length
    raise ValueError('Ảnh minh họa phải là PNG hoặc JPEG hợp lệ.')


def markdown(data) -> str:
    slides = data['slides']
    lines = ['# Đề xuất chiến lược tái phát triển MISA Ghi Chú thành MISA Note', '',
             f'**{len(slides)} slide · 4 phần**', '', '## Mục lục',
             '| Phần | Slide |', '| --- | --- |', '| Mở đầu | 1 |']
    sections = []
    for i, slide in enumerate(slides[1:], 2):
        name = slide['section']
        if not sections or sections[-1][0] != name:
            sections.append([name, i, i])
        else:
            sections[-1][2] = i
    for name, start, end in sections:
        lines.append(f'| {name} | {start}–{end} |')
    for i, d in enumerate(slides, 1):
        lines += ['', '---', f'## Slide {i:02d} — {d["title"]}', f'**Phần:** {d["section"]}', '']
        for key in ['intro', 'message', 'context']:
            if d.get(key):
                lines += [d[key], '']
        table = d.get('profile') == 'table' or d['kind'] in ['table', 'board-table']
        if table:
            for ri, row in enumerate(d['items']):
                lines.append('| ' + ' | '.join(v.replace('\n', '<br>').replace('|', '\\|') for v in row) + ' |')
                if ri == 0:
                    lines.append('| ' + ' | '.join(['---'] * len(row)) + ' |')
        else:
            for title, body in d.get('items', []):
                rendered = []
                for bullet, value in paragraphs(body):
                    rendered.append('- ' + value if bullet else value)
                lines += ['### ' + title, '', '\n'.join(rendered), '']
        for asset in d.get('images', []):
            lines += [f'![Minh họa](assets/{asset})', '']
        for key in ['basis', 'value', 'principle', 'conclusion']:
            if d.get(key):
                lines += [d[key], '']
        if d.get('notes'):
            lines += ['**Ghi chú thuyết trình:**', '', d['notes'], '']
    return '\n'.join(line.rstrip() for line in lines).rstrip() + '\n'


def atomic_write(path: Path, content: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False, prefix='.' + path.name) as f:
        f.write(content)
        temp = Path(f.name)
    os.replace(temp, path)


def build(args):
    data = json.loads(args.data.read_text())
    layout = json.loads(args.layout.read_text())
    slides = data.get('slides', [])
    if len(slides) != len(layout['slides']):
        raise ValueError(f'Mẫu có {len(layout["slides"])} slide, JSON có {len(slides)}. Cần cập nhật mẫu khi thêm/xóa slide.')
    for i, (slide, spec) in enumerate(zip(slides, layout['slides']), 1):
        if slide['kind'] != spec['kind'] or slide.get('profile') != spec['profile']:
            raise ValueError(f'Slide {i}: thay đổi kiểu bố cục cần cập nhật mẫu.')
        if [len(row) for row in slide.get('items', [])] != spec['item_columns']:
            raise ValueError(f'Slide {i}: thay đổi số thẻ/hàng/cột cần cập nhật mẫu.')
        if len(slide.get('images', [])) != spec['image_count']:
            raise ValueError(f'Slide {i}: số ảnh khác bố cục mẫu.')
    template = args.layout.parent / layout['template']
    with ZipFile(template) as z:
        parts = {name: z.read(name) for name in z.namelist()}
    fonts = {False: Font(False), True: Font(True)}
    assets = args.assets or ROOT / layout['assets_dir']
    for i, (d, spec) in enumerate(zip(slides, layout['slides']), 1):
        path = f'ppt/slides/slide{i}.xml'
        doc = ET.fromstring(parts[path])
        shapes = {s.find(f'{{{P}}}nvSpPr/{{{P}}}cNvPr').get('id'): s for s in doc.findall(f'.//{{{P}}}sp')}
        for binding in spec['bindings']:
            if 'path' in binding:
                value = value_at(d, binding['path'])
            elif binding.get('page_number'):
                value = f'{i:02d}/{len(slides):02d}'
            else:
                continue
            set_text(shapes[binding['shape_id']], value, fonts, fit=True,
                     context=f'Slide {i}, {binding.get("path", "số trang")}')
        relpath = f'ppt/slides/_rels/slide{i}.xml.rels'
        rel = ET.fromstring(parts[relpath])
        links = {r.get('Id'): r for r in rel}
        pictures = {s.find(f'{{{P}}}nvPicPr/{{{P}}}cNvPr').get('id'): s for s in doc.findall(f'.//{{{P}}}pic')}
        for binding in spec['pictures']:
            source = assets / d['images'][binding['image_index']]
            blob = source.read_bytes()
            width, height, extension = image_size(blob)
            name = f'ppt/media/rendered-{hashlib.sha256(blob).hexdigest()[:20]}.{extension}'
            parts[name] = blob
            picture = pictures[binding['shape_id']]
            rid = picture.find(f'.//{{{A}}}blip').get(f'{{{R}}}embed')
            links[rid].set('Target', posixpath.relpath(name, 'ppt/slides'))
            transform = picture.find(f'{{{P}}}spPr/{{{A}}}xfrm')
            off, ext = transform.find(f'{{{A}}}off'), transform.find(f'{{{A}}}ext')
            x, y, w, h = (int(off.get('x')), int(off.get('y')), int(ext.get('cx')), int(ext.get('cy')))
            ratio = min(w / width, h / height)
            nw, nh = round(width * ratio), round(height * ratio)
            off.set('x', str(x + (w - nw) // 2)); off.set('y', str(y + (h - nh) // 2))
            ext.set('cx', str(nw)); ext.set('cy', str(nh))
        parts[path] = ET.tostring(doc, encoding='utf-8', xml_declaration=True)
        parts[relpath] = ET.tostring(rel, encoding='utf-8', xml_declaration=True)
        path = f'ppt/notesSlides/notesSlide{i}.xml'
        note = ET.fromstring(parts[path])
        for shape in note.findall(f'.//{{{P}}}sp'):
            set_text(shape, d.get('notes', ''), fonts, fit=False, context=f'Ghi chú slide {i}')
        parts[path] = ET.tostring(note, encoding='utf-8', xml_declaration=True)
    referenced = set()
    for name, blob in parts.items():
        if not name.endswith('.rels'):
            continue
        base = posixpath.dirname(posixpath.dirname(name)) if name != '_rels/.rels' else ''
        for r in ET.fromstring(blob):
            if r.get('TargetMode') != 'External':
                t = r.get('Target').split('#')[0]
                referenced.add(t.lstrip('/') if t.startswith('/') else posixpath.normpath(posixpath.join(base, t)))
    for name in list(parts):
        if name.startswith('ppt/media/') and name not in referenced:
            del parts[name]
    if not referenced.issubset(parts.keys()):
        raise ValueError('Mẫu chứa liên kết tài nguyên không hợp lệ.')
    output = args.output_dir or args.data.parent
    output.mkdir(parents=True, exist_ok=True)
    stem = args.data.name.removesuffix('.data.json')
    if stem == args.data.name:
        stem = args.data.stem
    with tempfile.TemporaryDirectory(prefix='misa-slide-build-') as td:
        temporary = Path(td) / (stem + '.pptx')
        with ZipFile(temporary, 'w', ZIP_DEFLATED) as z:
            for name, blob in parts.items():
                z.writestr(name, blob)
        if args.pdf:
            libreoffice = shutil.which('libreoffice')
            if not libreoffice:
                raise ValueError('Không tìm thấy LibreOffice để xuất PDF. Bỏ --pdf nếu chỉ cần PowerPoint và Markdown.')
            profile = Path(td) / 'libreoffice-profile'
            cmd = [libreoffice, '-env:UserInstallation=' + profile.as_uri(), '--headless', '--convert-to', 'pdf', '--outdir', td, str(temporary)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            pdf = Path(td) / (stem + '.pdf')
            if result.returncode or not pdf.exists():
                raise ValueError('Không xuất được PDF: ' + (result.stderr + result.stdout).strip())
            atomic_write(output / pdf.name, pdf.read_bytes())
        atomic_write(output / temporary.name, temporary.read_bytes())
        atomic_write(output / (stem + '.md'), markdown(data).encode())
    print(f'Đã cập nhật {len(slides)} slide từ {args.data.name}: PowerPoint, Markdown' + (', PDF.' if args.pdf else '.'), flush=True)


def fingerprint(args):
    digest = hashlib.sha256()
    for path in [args.data, args.layout, args.layout.parent / 'misa-note-strategy.pptx']:
        digest.update(path.read_bytes())
    assets = args.assets or ROOT / 'docs/presentations/assets'
    if assets.exists():
        for p in sorted(assets.rglob('*')):
            if p.is_file():
                stat = p.stat()
                digest.update(f'{p}:{stat.st_size}:{stat.st_mtime_ns}'.encode())
    return digest.digest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=DEFAULT_DATA)
    parser.add_argument('--layout', type=Path, default=DEFAULT_LAYOUT)
    parser.add_argument('--assets', type=Path)
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--pdf', action='store_true', help='Xuất thêm PDF bằng LibreOffice.')
    parser.add_argument('--watch', action='store_true', help='Dựng lại khi lưu JSON; Ctrl+C để dừng.')
    args = parser.parse_args()
    if not args.watch:
        try:
            build(args)
            return 0
        except (ValueError, KeyError, OSError, subprocess.TimeoutExpired) as error:
            print(f'Lỗi: {error}', file=sys.stderr)
            return 1
    print(f'Đang theo dõi {args.data}. Lưu JSON để cập nhật; Ctrl+C để dừng.', flush=True)
    previous = None
    try:
        while True:
            try:
                current = fingerprint(args)
            except OSError:
                time.sleep(.35)
                continue
            if current != previous:
                time.sleep(.6)
                if current != fingerprint(args):
                    continue
                try:
                    build(args)
                except (ValueError, KeyError, OSError, subprocess.TimeoutExpired) as error:
                    print(f'Chưa cập nhật: {error}. Giữ bản xuất trước; thử lại khi bạn lưu tiếp.', file=sys.stderr, flush=True)
                previous = current
            time.sleep(.35)
    except KeyboardInterrupt:
        print('\nĐã dừng theo dõi.', flush=True)
        return 0


if __name__ == '__main__':
    sys.exit(main())
