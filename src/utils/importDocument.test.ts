import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { importDocumentFile, parseMarkdown, readDocxXml } from './importDocument';

test('Markdown preserves headings, tasks, code, quotes, lists and tables', () => {
  const blocks = parseMarkdown('\uFEFF# Họp tuần\r\n\r\n- [x] Đã xong\r\n- [ ] Cần làm\r\n- Ghi chú\r\n1. Thảo luận\r\n> Kết luận\r\n#### Chi tiết\r\n---\r\n```ts\r\nconst a = 1;\r\n```\r\n| Tên | Vai trò |\r\n| --- | --- |\r\n| An | Chủ trì |');
  assert.deepEqual(blocks.map(block => block.type), ['h1', 'checklist', 'checklist', 'bullet', 'numbered', 'quote', 'h4', 'divider', 'code', 'table']);
  assert.equal(blocks[1].properties?.checked, true);
  assert.equal(blocks[2].properties?.checked, false);
  assert.equal(blocks[8].properties?.language, 'ts');
  assert.equal(blocks[8].content, 'const a = 1;');
  assert.deepEqual(blocks[9].properties?.tableData, { headers: ['Tên', 'Vai trò'], rows: [['An', 'Chủ trì']] });
  assert.equal(new Set(blocks.map(block => block.id)).size, blocks.length);
});

test('an unfinished code fence retains all source text', () => {
  assert.equal(parseMarkdown('~~~js\n# source\n\nconst x = 1')[0].content, '# source\n\nconst x = 1');
});

test('text import retains Vietnamese and uses the filename as title', async () => {
  const parsed = await importDocumentFile(new File(['Đề mục\n- Giữ nguyên văn bản'], 'Tài liệu.TXT'));
  assert.equal(parsed.title, 'Tài liệu');
  assert.deepEqual(parsed.blocks.map(block => block.type), ['paragraph', 'paragraph']);
  assert.equal(parsed.blocks[1].content, '- Giữ nguyên văn bản');
});

test('invalid, empty, binary and oversized input is rejected', async () => {
  await assert.rejects(importDocumentFile(new File([''], 'empty.md')), /trống/);
  await assert.rejects(importDocumentFile(new File(['  \n'], 'empty.md')), /không có nội dung/);
  await assert.rejects(importDocumentFile(new File(['%PDF'], 'test.pdf')), /chọn tệp/);
  await assert.rejects(importDocumentFile(new File(['a\0b'], 'binary.txt')), /văn bản hợp lệ/);
  await assert.rejects(importDocumentFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.md')), /quá lớn/);
  await assert.rejects(readDocxXml(new ArrayBuffer(8)), /không hợp lệ/);
});

function zipDocument(xml: string, compressed: boolean): ArrayBuffer {
  const name = Buffer.from('word/document.xml'); const original = Buffer.from(xml);
  const body = compressed ? deflateRawSync(original) : original;
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(compressed ? 8 : 0, 8); local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(original.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(compressed ? 8 : 0, 10); central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(original.length, 24); central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(local.length + name.length + body.length, 16);
  return Uint8Array.from(Buffer.concat([local, name, body, central, name, end])).buffer;
}

test('reads both uncompressed and compressed DOCX document entries', async () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>Biên bản họp</w:t></w:r></w:p></w:body></w:document>';
  assert.equal(await readDocxXml(zipDocument(xml, false)), xml);
  assert.equal(await readDocxXml(zipDocument(xml, true)), xml);
});

test('truncated DOCX archives cannot be imported as success', async () => {
  const archive = zipDocument('test', true);
  await assert.rejects(readDocxXml(archive.slice(0, archive.byteLength - 10)));
});
