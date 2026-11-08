import { Block, BlockType } from '../types';

const makeBlock = (type: BlockType, content: string, properties?: Block['properties']): Block =>
  ({ id: `blk_${crypto.randomUUID()}`, type, content, ...(properties ? { properties } : {}) });

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let code: string[] | null = null;
  let language = '';
  let fence = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (code !== null) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) {
        blocks.push(makeBlock('code', code.join('\n'), { language })); code = null;
      } else code.push(line);
      continue;
    }
    if (fenceMatch) { code = []; fence = fenceMatch[1]; language = fenceMatch[2].trim(); continue; }
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const check = line.match(/^\s*[-*+]\s+\[([ xX])\]\s*(.*)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);
    if (heading) blocks.push(makeBlock(`h${Math.min(heading[1].length, 4)}` as BlockType, heading[2]));
    else if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) blocks.push(makeBlock('divider', ''));
    else if (check) blocks.push(makeBlock('checklist', check[2], { checked: check[1].toLowerCase() === 'x' }));
    else if (bullet) blocks.push(makeBlock('bullet', bullet[1]));
    else if (numbered) blocks.push(makeBlock('numbered', numbered[1]));
    else if (quote) blocks.push(makeBlock('quote', quote[1]));
    else if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      const headers = cells(line); const rows: string[][] = []; i++;
      while (i + 1 < lines.length && lines[i + 1].includes('|')) rows.push(cells(lines[++i]));
      blocks.push(makeBlock('table', '', { tableData: { headers, rows } }));
    } else blocks.push(makeBlock('paragraph', line));
  }
  if (code !== null) blocks.push(makeBlock('code', code.join('\n'), { language }));
  return blocks;
}

// Read only the document XML from a DOCX ZIP. No external services or uploads.
export async function readDocxXml(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('Tệp DOCX không hợp lệ hoặc đã bị hỏng.');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === 'word/document.xml') {
      if (view.getUint16(offset + 8, true) & 1) throw new Error('Không hỗ trợ DOCX có mật khẩu.');
      const size = view.getUint32(offset + 20, true);
      if (view.getUint32(offset + 24, true) > 20 * 1024 * 1024) throw new Error('Nội dung DOCX quá lớn (tối đa 20 MB).');
      const local = view.getUint32(offset + 42, true);
      if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) break;
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + size > bytes.length) break;
      const compressed = bytes.slice(start, start + size);
      const method = view.getUint16(offset + 10, true);
      if (method === 0) return new TextDecoder().decode(compressed);
      if (method !== 8) throw new Error('Kiểu nén DOCX này chưa được hỗ trợ.');
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const reader = stream.getReader(); const chunks: Uint8Array[] = []; let total = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        total += value.length;
        if (total > 20 * 1024 * 1024) { await reader.cancel(); throw new Error('Nội dung DOCX quá lớn.'); }
        chunks.push(value);
      }
      const output = new Uint8Array(total); let cursor = 0;
      for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
      return new TextDecoder().decode(output);
    }
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  throw new Error('Không tìm thấy nội dung văn bản trong DOCX.');
}

export function parseDocxXml(xml: string): Block[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Nội dung DOCX không hợp lệ.');
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const elements = (node: Element, name: string) => Array.from(node.getElementsByTagNameNS(ns, name));
  const text = (node: Element) => elements(node, '*').map(el => el.localName === 't' ? el.textContent || '' :
    el.localName === 'tab' ? '\t' : ['br', 'cr'].includes(el.localName) ? '\n' : '').join('');
  const body = doc.getElementsByTagNameNS(ns, 'body')[0];
  if (!body) throw new Error('DOCX không có nội dung văn bản.');
  return Array.from(body.children).flatMap((node): Block[] => {
    if (node.localName === 'tbl') {
      const rows = elements(node, 'tr').map(row => Array.from(row.children).filter(cell => cell.localName === 'tc').map(text));
      return rows.length ? [makeBlock('table', '', { tableData: { headers: rows[0], rows: rows.slice(1) } })] : [];
    }
    if (node.localName !== 'p' || !text(node).trim()) return [];
    const style = elements(node, 'pStyle')[0]?.getAttributeNS(ns, 'val') || '';
    const heading = style.match(/heading\s*([1-6])/i);
    return [makeBlock(heading ? `h${Math.min(Number(heading[1]), 4)}` as BlockType :
      elements(node, 'numPr').length ? 'bullet' : 'paragraph', text(node))];
  });
}

export async function importDocumentFile(file: File): Promise<{ title: string; blocks: Block[] }> {
  if (!file.size) throw new Error('Tệp trống. Vui lòng chọn tệp có nội dung.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Tệp quá lớn. Vui lòng chọn tệp tối đa 10 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  let blocks: Block[];
  if (extension === 'docx') blocks = parseDocxXml(await readDocxXml(await file.arrayBuffer()));
  else if (['md', 'markdown', 'txt'].includes(extension || '')) {
    const text = await file.text();
    if (text.includes('\0')) throw new Error('Tệp không phải văn bản hợp lệ.');
    blocks = extension === 'txt' ? text.replace(/^\uFEFF/, '').split(/\r\n?|\n/).filter(line => line.trim()).map(line => makeBlock('paragraph', line)) : parseMarkdown(text);
  } else throw new Error('Hãy chọn tệp .md, .markdown, .txt hoặc .docx.');
  if (!blocks.length) throw new Error('Tệp không có nội dung văn bản để nhập.');
  return { title: file.name.replace(/\.[^.]+$/, ''), blocks };
}
