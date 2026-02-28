import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileSpreadsheet, FileJson, Download, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VocabWord } from '@/hooks/useFlashcardFolders';
import * as XLSX from 'xlsx';

export interface ImportVocabularyDialogProps {
  showImportDialog: boolean;
  setShowImportDialog: (show: boolean) => void;
  onImport: (words: VocabWord[]) => void;
}

export const ImportVocabularyDialog: React.FC<ImportVocabularyDialogProps> = ({
  showImportDialog,
  setShowImportDialog,
  onImport,
}) => {
  const [importTab, setImportTab] = useState<'excel' | 'json'>('excel');
  const [jsonInput, setJsonInput] = useState('');
  const [importPreview, setImportPreview] = useState<VocabWord[] | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseJsonImport = (text: string): VocabWord[] | null => {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) { setImportError('JSON phải là một mảng (array)'); return null; }
      const words: VocabWord[] = arr.map((item: Record<string, string>, idx: number) => {
        if (!item.word || !item.meaning) throw new Error(`Dòng ${idx + 1}: thiếu "word" hoặc "meaning"`);
        return {
          id: `imp-${Date.now()}-${idx}`,
          word: String(item.word).trim(),
          reading: item.reading ? String(item.reading).trim() : null,
          hanviet: item.hanviet ? String(item.hanviet).trim() : null,
          meaning: String(item.meaning).trim(),
          mastery_level: null,
        };
      });
      setImportError('');
      return words;
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'JSON không hợp lệ');
      return null;
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const words: VocabWord[] = [];
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        if (!row.word && !row.meaning) return;
        if (!row.word) errors.push(`Dòng ${idx + 2}: thiếu "word"`);
        if (!row.meaning) errors.push(`Dòng ${idx + 2}: thiếu "meaning"`);
        if (row.word && row.meaning) {
          words.push({
            id: `imp-${Date.now()}-${idx}`,
            word: String(row.word).trim(),
            reading: row.reading ? String(row.reading).trim() : null,
            hanviet: row.hanviet ? String(row.hanviet).trim() : null,
            meaning: String(row.meaning).trim(),
            mastery_level: null,
          });
        }
      });
      if (errors.length) setImportError(errors.join('\n'));
      else setImportError('');
      setImportPreview(words);
    } catch {
      setImportError('Không đọc được file Excel');
    }
  };

  const downloadTemplate = async () => {
    const data = [
      { word: '学校', reading: 'がっこう', hanviet: 'Học Hiệu', meaning: 'Trường học' },
      { word: '先生', reading: 'せんせい', hanviet: 'Tiên Sinh', meaning: 'Giáo viên' },
      { word: '日本語', reading: 'にほんご', hanviet: 'Nhật Bản Ngữ', meaning: 'Tiếng Nhật' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');
    XLSX.writeFile(wb, 'vocabulary_template.xlsx');
  };

  const confirmImport = () => {
    if (!importPreview?.length) return;
    onImport(importPreview);
    setImportPreview(null);
    setJsonInput('');
    setImportError('');
    setShowImportDialog(false);
  };

  return (
    <AnimatePresence>
      {showImportDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowImportDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-5 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Upload className="h-5 w-5 text-rose-400" />
                Import từ vựng
              </h3>
              <button onClick={() => setShowImportDialog(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                className={cn('px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all', importTab === 'excel' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300' : 'bg-muted hover:bg-rose-50')}
                onClick={() => { setImportTab('excel'); setImportPreview(null); setImportError(''); }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button
                className={cn('px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all', importTab === 'json' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300' : 'bg-muted hover:bg-rose-50')}
                onClick={() => { setImportTab('json'); setImportPreview(null); setImportError(''); }}
              >
                <FileJson className="h-4 w-4" /> JSON
              </button>
            </div>

            {/* Format Guide */}
            <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100">
              <p className="text-sm font-bold text-rose-700 mb-2">📋 Hướng dẫn format ({importTab === 'excel' ? 'Excel' : 'JSON'})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-rose-100/50">
                      <th className="px-3 py-2 text-left font-bold text-rose-700">{importTab === 'excel' ? 'Cột' : 'Key'}</th>
                      <th className="px-3 py-2 text-left text-rose-700">Mô tả</th>
                      <th className="px-3 py-2 text-left text-rose-700">Ví dụ</th>
                      <th className="px-3 py-2 text-center text-rose-700">Bắt buộc</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">word</td><td className="px-3 py-1.5">Từ tiếng Nhật</td><td className="px-3 py-1.5 font-jp">学校</td><td className="px-3 py-1.5 text-center text-green-600">✅</td></tr>
                    <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">reading</td><td className="px-3 py-1.5">Cách đọc</td><td className="px-3 py-1.5 font-jp">がっこう</td><td className="px-3 py-1.5 text-center text-muted-foreground">—</td></tr>
                    <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">hanviet</td><td className="px-3 py-1.5">Hán Việt</td><td className="px-3 py-1.5">Học Hiệu</td><td className="px-3 py-1.5 text-center text-muted-foreground">—</td></tr>
                    <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">meaning</td><td className="px-3 py-1.5">Nghĩa tiếng Việt</td><td className="px-3 py-1.5">Trường học</td><td className="px-3 py-1.5 text-center text-green-600">✅</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Excel tab */}
            {importTab === 'excel' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2 border-rose-200 text-rose-600" onClick={downloadTemplate}>
                    <Download className="h-4 w-4" /> Tải file mẫu (.xlsx)
                  </Button>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Chọn file Excel
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                </div>
              </div>
            )}

            {/* JSON tab */}
            {importTab === 'json' && (
              <div className="space-y-3">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={'[\n  { "word": "学校", "reading": "がっこう", "hanviet": "Học Hiệu", "meaning": "Trường học" }\n]'}
                  className="w-full h-40 px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-mono bg-background resize-none"
                />
                <Button size="sm" className="gap-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white" onClick={() => { const w = parseJsonImport(jsonInput); if (w) setImportPreview(w); }}>
                  <Eye className="h-4 w-4" /> Preview
                </Button>
              </div>
            )}

            {/* Error */}
            {importError && (
              <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm whitespace-pre-wrap border border-red-200">{importError}</div>
            )}

            {/* Preview */}
            {importPreview && importPreview.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-green-600">✅ {importPreview.length} từ sẵn sàng import</p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-100">
                  <table className="w-full text-sm">
                    <thead className="bg-rose-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">word</th>
                        <th className="px-3 py-2 text-left">reading</th>
                        <th className="px-3 py-2 text-left">hanviet</th>
                        <th className="px-3 py-2 text-left">meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((w, i) => (
                        <tr key={i} className="border-t border-rose-50">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-jp">{w.word}</td>
                          <td className="px-3 py-1.5 font-jp">{w.reading}</td>
                          <td className="px-3 py-1.5">{w.hanviet}</td>
                          <td className="px-3 py-1.5">{w.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => { setImportPreview(null); setJsonInput(''); }}>Hủy</Button>
                  <Button className="bg-gradient-to-r from-rose-400 to-pink-400 text-white gap-2" onClick={confirmImport}>
                    <CheckCircle2 className="h-4 w-4" /> Import {importPreview.length} từ
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
