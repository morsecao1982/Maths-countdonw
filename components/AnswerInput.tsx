'use client';
import katex from 'katex';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  btnClass?: string;
  countdown?: number | null;
}

export default function AnswerInput({ value, onChange, onSubmit, btnClass = 'bg-yellow-400 hover:bg-yellow-300 text-black', countdown }: Props) {
  let preview = '';
  if (value.trim()) {
    try {
      preview = katex.renderToString(value, { throwOnError: false, displayMode: false });
    } catch {
      preview = '';
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {countdown != null && (
        <div className="text-center text-yellow-400 font-black text-2xl">{countdown}s</div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="Answer (LaTeX OK)…"
          className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1"
          autoFocus
        />
        <button onClick={onSubmit} className={`${btnClass} font-bold px-3 py-2 rounded-lg text-sm`}>✓</button>
      </div>
      {preview && (
        <div
          className="text-sm text-gray-200 bg-gray-900/60 rounded px-2 py-1"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}
    </div>
  );
}
