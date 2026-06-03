import { z } from "zod";

export const FeedbackCategoryEnum = z.enum([
  "WASTE",
  "TREE",
  "FLOOD",
  "PARKING",
  "SECURITY",
  "OTHER",
]);
export type FeedbackCategory = z.infer<typeof FeedbackCategoryEnum>;

export const createFeedbackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Tiêu đề tối thiểu 5 ký tự")
    .max(255, "Tiêu đề tối đa 255 ký tự"),
  description: z
    .string()
    .trim()
    .min(10, "Mô tả tối thiểu 10 ký tự")
    .max(5000, "Mô tả tối đa 5000 ký tự"),
  category: FeedbackCategoryEnum,
  images: z.array(z.string().url()).max(10, "Tối đa 10 ảnh").default([]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  addressText: z.string().max(500).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

/** Templates dùng cho mỗi category — pre-fill description giúp dân nhập nhanh. */
export const CATEGORY_TEMPLATES: Record<FeedbackCategory, string> = {
  WASTE:
    "Phát hiện đống rác tại [địa điểm cụ thể]. Đã tồn tại khoảng [thời gian]. Loại rác: [sinh hoạt/xây dựng/y tế].",
  TREE:
    "Cây [loại cây] tại [địa điểm] có dấu hiệu [gãy đổ/sâu bệnh/nghiêng nguy hiểm]. Mức độ nguy hiểm: [thấp/cao].",
  FLOOD:
    "Khu vực [địa điểm] bị ngập [độ sâu] sau mưa. Thời gian ngập kéo dài khoảng [thời gian]. Cống thoát: [bình thường/tắc].",
  PARKING:
    "Tại [địa điểm] có hiện tượng [đậu xe sai quy định/lấn chiếm vỉa hè]. Phương tiện: [loại]. Thời gian: [thường xuyên/đột xuất].",
  SECURITY:
    "Phản ánh nghiêm trọng tại [địa điểm]. Sự việc: [mô tả]. ⚠️ Sẽ được chuyển trực tiếp tới điều phối viên IOC.",
  OTHER: "",
};

/** Keyword → category mapping cho client-side auto-suggest. */
export const KEYWORD_MAP: Record<string, FeedbackCategory> = {
  rác: "WASTE", "đổ rác": "WASTE", vứt: "WASTE", "vệ sinh": "WASTE",
  cây: "TREE", "gãy đổ": "TREE", "sâu bệnh": "TREE",
  ngập: "FLOOD", "thoát nước": "FLOOD", cống: "FLOOD",
  "đậu xe": "PARKING", "lấn chiếm": "PARKING", "vỉa hè": "PARKING",
  "cướp": "SECURITY", "trộm": "SECURITY", "đánh nhau": "SECURITY",
};
