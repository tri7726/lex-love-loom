import { useEffect } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FeedbackCategory, CATEGORY_TEMPLATES, KEYWORD_MAP,
} from "../schemas/feedback.schema";

interface Props {
  value: FeedbackCategory;
  onChange: (cat: FeedbackCategory) => void;
  onTemplateApply: (template: string) => void;
  /** Đang gõ description để auto-suggest category */
  descriptionDraft?: string;
}

export function CategoryTemplateSelector({
  value, onChange, onTemplateApply, descriptionDraft,
}: Props) {
  // Client-side keyword matching → suggest category khi user gõ description
  useEffect(() => {
    if (!descriptionDraft || value !== "OTHER") return;
    const lower = descriptionDraft.toLowerCase();
    for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
      if (lower.includes(kw)) {
        onChange(cat);
        return;
      }
    }
  }, [descriptionDraft, value, onChange]);

  return (
    <div className="space-y-2">
      <Label>Loại phản ánh</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          const cat = v as FeedbackCategory;
          onChange(cat);
          onTemplateApply(CATEGORY_TEMPLATES[cat]);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Chọn loại phản ánh" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="WASTE">🗑️ Rác thải, vệ sinh</SelectItem>
          <SelectItem value="TREE">🌳 Cây xanh</SelectItem>
          <SelectItem value="FLOOD">💧 Ngập nước</SelectItem>
          <SelectItem value="PARKING">🚗 Lấn chiếm, đậu xe</SelectItem>
          <SelectItem value="SECURITY">🚨 An ninh nghiêm trọng</SelectItem>
          <SelectItem value="OTHER">📋 Khác</SelectItem>
        </SelectContent>
      </Select>
      {value === "SECURITY" && (
        <p className="text-xs text-amber-600">
          ⚠️ Phản ánh an ninh sẽ được chuyển trực tiếp tới IOC, không qua AI tự động.
        </p>
      )}
    </div>
  );
}
