import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload } from "lucide-react";
import imageCompression from "browser-image-compression";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Hàm upload tự inject — vd upload lên S3 / Cloudinary / backend */
  uploadFn: (file: File) => Promise<string>;
  max?: number;
}

export function ImageUploader({ value, onChange, uploadFn, max = 5 }: Props) {
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files) return;
    if (value.length + files.length > max) {
      alert(`Tối đa ${max} ảnh`);
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        // Nén client-side trước khi upload — giảm 70-90% size
        const compressed = await imageCompression(f, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        uploaded.push(await uploadFn(compressed));
      }
      onChange([...value, ...uploaded]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Hình ảnh ({value.length}/{max})</Label>
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-md overflow-hidden border">
            <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
              aria-label="Xóa ảnh"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-1">
              {busy ? "Đang tải..." : "Thêm ảnh"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => handle(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
