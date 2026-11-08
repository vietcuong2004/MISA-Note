import React from 'react';
import { Block, BlockProperties } from '../../types';

interface Props {
  block: Block;
  readOnly: boolean;
  onChange: (content: string, properties: BlockProperties) => void;
}

// Keep each command's configuration with the block so it survives saving and reopening.
export const UtilityBlock: React.FC<Props> = ({ block, readOnly, onChange }) => {
  const props = block.properties || {};
  const title = props.commandTitle || props.provider || block.type;
  const inputClass = 'w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm focus:outline-none focus:border-[#86868B]';
  const updateProps = (patch: Partial<BlockProperties>) => onChange(block.content, { ...props, ...patch });
  const url = props.url || '';
  const safeUrl = /^https?:\/\//i.test(url) ? url : '';

  if (props.utilityKind === 'columns') {
    return <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${props.columns || 2}, minmax(0, 1fr))` }}>
      {Array.from({ length: props.columns || 2 }, (_, index) => <textarea key={index} rows={4}
        aria-label={`Cột ${index + 1}`} disabled={readOnly} className={inputClass}
        value={props.columnContents?.[index] || ''} placeholder={`Cột ${index + 1}`}
        onChange={event => {
          const values = [...(props.columnContents || [])]; values[index] = event.target.value;
          updateProps({ columnContents: values });
        }} />)}
    </div>;
  }

  const isMedia = block.type === 'video' || block.type === 'audio';
  const isEmbed = block.type === 'embed';
  const isHtml = isEmbed && props.provider === 'HTML';
  const isImport = props.utilityKind === 'import';
  const textImport = isImport && ['Tệp CSV', 'Văn bản và Markdown'].includes(props.provider || '');

  return <div className="w-full my-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 space-y-3">
    <p className="text-sm font-medium">{title}</p>
    {(isMedia || isEmbed || props.utilityKind === 'database') && !isHtml && <>
      <input aria-label={`Liên kết ${title}`} type="url" disabled={readOnly} className={inputClass}
        value={url} onChange={event => updateProps({ url: event.target.value })}
        placeholder={props.utilityKind === 'database' ? 'Liên kết nguồn dữ liệu...' : 'Dán liên kết https://...'} />
      {url && !safeUrl && <p className="text-xs text-red-600">Nhập liên kết bắt đầu bằng https:// hoặc http://.</p>}
      {safeUrl && block.type === 'video' && <video controls src={safeUrl} className="w-full max-h-96" />}
      {safeUrl && block.type === 'audio' && <audio controls src={safeUrl} className="w-full" />}
      {safeUrl && isEmbed && <>
        <iframe title={title} src={safeUrl} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer"
          loading="lazy" className="w-full h-80 rounded-md bg-[var(--ui-surface)] border border-[var(--ui-border)]" />
        <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Mở liên kết gốc</a>
        <p className="text-xs text-[var(--ui-muted)]">Nếu dịch vụ không cho phép nhúng, hãy mở liên kết gốc.</p>
      </>}
    </>}
    {isImport && (textImport ? <label className="block text-xs text-[var(--ui-muted)]">
      Chọn tệp để đọc nội dung vào khối
      <input type="file" disabled={readOnly} accept={props.provider === 'Tệp CSV' ? '.csv' : '.txt,.md,.markdown'}
        className="block mt-2 text-sm" onChange={async event => {
          const file = event.target.files?.[0];
          if (file) onChange(await file.text(), { ...props, fileName: file.name });
        }} />
    </label> : <p className="text-xs text-[var(--ui-muted)]">Chưa kết nối trình nhập {props.provider}. Bạn có thể dán nội dung văn bản bên dưới để lưu vào ghi chú.</p>)}
    <textarea disabled={readOnly} rows={isHtml ? 5 : 3} className={inputClass}
      aria-label={`Nội dung ${title}`} value={block.content}
      placeholder={isHtml ? 'Dán mã HTML để xem trước...' : isMedia || isEmbed ? 'Chú thích...' : `Nhập nội dung ${title}...`}
      onChange={event => onChange(event.target.value, props)} />
    {isHtml && block.content && <iframe title="Xem trước HTML" srcDoc={block.content} sandbox=""
      referrerPolicy="no-referrer" className="w-full h-64 bg-[var(--ui-surface)] rounded-md border border-[var(--ui-border)]" />}
    {props.utilityKind === 'database' && <p className="text-xs text-[var(--ui-muted)]">Đã lưu cấu hình {props.view}. Chưa kết nối nguồn dữ liệu để hiển thị chế độ xem.</p>}
    {block.type === 'utility' && !['columns', 'database', 'import'].includes(props.utilityKind || '') &&
      <p className="text-xs text-[var(--ui-muted)]">Khối nội dung đã được lưu. Tính năng tương tác {title} chưa được kết nối.</p>}
  </div>;
};
