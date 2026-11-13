"""Integration checks for JSON → PowerPoint and live rebuilds (no PDF dependency)."""
import copy
import json
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'docs/presentations/misa-note-strategy.data.json'
SCRIPT = ROOT / 'scripts/build-presentation.py'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'


def ppt_text(path, part='ppt/slides/slide6.xml'):
    with ZipFile(path) as z:
        root = ET.fromstring(z.read(part))
        return ' '.join(t.text or '' for t in root.iter(A + 't'))


class PresentationBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / 'test.data.json'
        self.output = self.root / 'out'
        self.model = json.loads(DATA.read_text())
        self.data.write_text(json.dumps(self.model, ensure_ascii=False))
        self.command = [sys.executable, str(SCRIPT), '--data', str(self.data), '--output-dir', str(self.output)]
        self.ppt = self.output / 'test.pptx'

    def test_title_body_notes_and_images_follow_json_without_modifying_input(self):
        model = copy.deepcopy(self.model)
        model['slides'][5]['title'] = '3 nền tảng nổi bật'
        model['slides'][5]['items'][0][1] = 'Nội dung kiểm tra cập nhật trực tiếp từ JSON.'
        model['slides'][-1]['notes'] = 'Ghi chú được cập nhật từ JSON.'
        raw = json.dumps(model, ensure_ascii=False)
        self.data.write_text(raw)
        result = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = ppt_text(self.ppt)
        self.assertIn('3 nền tảng nổi bật', text)
        self.assertIn('Nội dung kiểm tra cập nhật trực tiếp từ JSON.', text)
        self.assertEqual(ppt_text(self.ppt, f'ppt/notesSlides/notesSlide{len(model["slides"])}.xml'), model['slides'][-1]['notes'])
        self.assertEqual(self.data.read_text(), raw)
        self.assertIn('3 nền tảng nổi bật', (self.output / 'test.md').read_text())
        with ZipFile(self.ppt) as z:
            self.assertEqual(len([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml', n)]), len(model['slides']))
            self.assertTrue(any(n.startswith('ppt/media/rendered-') for n in z.namelist()))
            for name in z.namelist():
                if name.endswith(('.xml', '.rels')):
                    ET.fromstring(z.read(name))

    def test_bullets_are_native_items_with_hanging_wrapped_lines(self):
        self.model['slides'][5]['items'][0][1] = (
            '• Một ý đủ dài để xuống dòng trong thẻ nội dung, nhưng vẫn chỉ có một dấu đầu dòng cho cả ý này.\n'
            '• Ý thứ hai có dấu đầu dòng riêng.'
        )
        self.data.write_text(json.dumps(self.model, ensure_ascii=False))
        result = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        layout = json.loads((ROOT / 'docs/presentations/templates/misa-note-strategy.layout.json').read_text())
        binding = next(b for b in layout['slides'][5]['bindings'] if b.get('path') == ['items', 0, 1])
        pns = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
        with ZipFile(self.ppt) as z:
            slide = ET.fromstring(z.read('ppt/slides/slide6.xml'))
            shape = next(sp for sp in slide.iter(pns + 'sp')
                         if sp.find(pns + 'nvSpPr/' + pns + 'cNvPr').get('id') == binding['shape_id'])
            paragraphs = shape.find(pns + 'txBody').findall(A + 'p')
            self.assertEqual(len(paragraphs), 2)
            self.assertGreater(len(shape.findall('.//' + A + 'br')), 0)
            for paragraph in paragraphs:
                props = paragraph.find(A + 'pPr')
                self.assertEqual(props.find(A + 'buChar').get('char'), '•')
                self.assertIsNotNone(props.find(A + 'buClr'))
                self.assertEqual(props.find(A + 'buSzPct').get('val'), '100000')
                self.assertGreater(int(props.get('marL')), 0)
                self.assertLess(int(props.get('indent')), 0)
            self.assertNotIn('•', ''.join(t.text or '' for t in shape.iter(A + 't')))
        self.assertIn('- Ý thứ hai có dấu đầu dòng riêng.', (self.output / 'test.md').read_text())

    def test_single_item_is_plain_text_in_powerpoint_and_markdown(self):
        self.model['slides'][5]['items'][0][1] = '• Một ý duy nhất không cần gạch đầu dòng.'
        self.data.write_text(json.dumps(self.model, ensure_ascii=False))
        result = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        layout = json.loads((ROOT / 'docs/presentations/templates/misa-note-strategy.layout.json').read_text())
        binding = next(b for b in layout['slides'][5]['bindings'] if b.get('path') == ['items', 0, 1])
        pns = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
        with ZipFile(self.ppt) as z:
            slide = ET.fromstring(z.read('ppt/slides/slide6.xml'))
            shape = next(sp for sp in slide.iter(pns + 'sp')
                         if sp.find(pns + 'nvSpPr/' + pns + 'cNvPr').get('id') == binding['shape_id'])
            self.assertEqual(shape.findall('.//' + A + 'buChar'), [])
            self.assertNotIn('•', ''.join(t.text or '' for t in shape.iter(A + 't')))
        md = (self.output / 'test.md').read_text()
        self.assertIn('Một ý duy nhất không cần gạch đầu dòng.', md)
        self.assertNotIn('- Một ý duy nhất', md)

    def test_invalid_structure_does_not_replace_previous_output(self):
        good = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stderr)
        previous = self.ppt.read_bytes()
        self.model['slides'].pop()
        self.data.write_text(json.dumps(self.model))
        bad = subprocess.run(self.command, capture_output=True, text=True)
        self.assertNotEqual(bad.returncode, 0)
        self.assertIn('Cần cập nhật mẫu', bad.stderr)
        self.assertEqual(self.ppt.read_bytes(), previous)

    def test_watch_updates_after_save_and_recovers_from_invalid_json(self):
        with (self.root / 'watch.log').open('w') as log:
            process = subprocess.Popen(self.command + ['--watch'], stdout=log, stderr=log)
            try:
                self.wait_for(lambda: self.ppt.exists(), process)
                self.model['slides'][5]['title'] = 'Tiêu đề lưu lần hai'
                self.data.write_text(json.dumps(self.model, ensure_ascii=False))
                self.wait_for(lambda: 'Tiêu đề lưu lần hai' in ppt_text(self.ppt), process)
                previous = self.ppt.read_bytes()
                self.data.write_text('{')
                self.wait_for(lambda: 'Chưa cập nhật' in (self.root / 'watch.log').read_text(), process)
                self.assertEqual(self.ppt.read_bytes(), previous)
                self.model['slides'][5]['title'] = 'Tiêu đề sau khi sửa JSON'
                self.data.write_text(json.dumps(self.model, ensure_ascii=False))
                self.wait_for(lambda: 'Tiêu đề sau khi sửa JSON' in ppt_text(self.ppt), process)
            finally:
                process.send_signal(signal.SIGINT)
                process.wait(timeout=10)

    def wait_for(self, condition, process):
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            self.assertIsNone(process.poll(), 'Watcher stopped unexpectedly')
            try:
                if condition():
                    return
            except (FileNotFoundError, OSError):
                pass
            time.sleep(.15)
        self.fail((self.root / 'watch.log').read_text())


if __name__ == '__main__':
    unittest.main()
