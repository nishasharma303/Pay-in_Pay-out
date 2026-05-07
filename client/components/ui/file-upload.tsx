'use client';
import { useRef, useState } from 'react';
import { Upload, X, CheckCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  name: string;
  accept?: string;
  required?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
}

export function FileUpload({ label, name, accept = 'image/*', required, value, onChange, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }
    onChange(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border rounded-xl transition-all duration-200 overflow-hidden',
          value
            ? 'border-success/30 bg-success/5'
            : dragOver
            ? 'border-brand-500 bg-brand-500/10 cursor-copy'
            : 'border-dashed border-white/[0.12] bg-surface-850 hover:border-white/20 hover:bg-surface-800 cursor-pointer',
        )}
      >
        {value && preview ? (
          /* Preview mode */
          <div className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-700">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-success flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Uploaded
              </p>
              <p className="text-2xs text-slate-500 truncate mt-0.5">{value.name}</p>
              <p className="text-2xs text-slate-600">{(value.size / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.open(preview!, '_blank'); }}
                className="p-1.5 rounded-lg bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={clear}
                className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Upload prompt */
          <div className="flex flex-col items-center justify-center py-5 px-4 text-center">
            <div className="w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center mb-2">
              <Upload className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400">
              <span className="text-brand-400 font-medium">Click to upload</span> or drag & drop
            </p>
            {hint && <p className="text-2xs text-slate-600 mt-1">{hint}</p>}
            <p className="text-2xs text-slate-600 mt-1">JPG, PNG, WEBP up to 5MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
