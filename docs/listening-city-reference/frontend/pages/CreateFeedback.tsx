import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import {
  createFeedbackSchema,
  type CreateFeedbackInput,
} from "../schemas/feedback.schema";
import { CategoryTemplateSelector } from "../components/CategoryTemplateSelector";
import { ImageUploader } from "../components/ImageUploader";
import { LocationPicker } from "../components/LocationPicker";

interface Props {
  /** Inject upload fn — vd POST tới backend / direct S3 */
  uploadImage: (file: File) => Promise<string>;
  /** Inject submit fn — POST /api/feedbacks */
  submitFeedback: (input: CreateFeedbackInput) => Promise<{ id: string }>;
  onSuccess?: (id: string) => void;
}

export default function CreateFeedback({
  uploadImage, submitFeedback, onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors },
  } = useForm<CreateFeedbackInput>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: {
      title: "", description: "", category: "OTHER", images: [],
    },
  });

  const descriptionDraft = watch("description");
  const category = watch("category");
  const images = watch("images");
  const lat = watch("lat");
  const lng = watch("lng");
  const addressText = watch("addressText");

  const onSubmit = async (data: CreateFeedbackInput) => {
    setSubmitting(true);
    try {
      const { id } = await submitFeedback(data);
      toast.success("Đã gửi phản ánh — AI đang phân tích...");
      onSuccess?.(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Gửi phản ánh tới chính quyền</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <CategoryTemplateSelector
                  value={field.value}
                  onChange={field.onChange}
                  onTemplateApply={(tpl) => {
                    if (!watch("description")) setValue("description", tpl);
                  }}
                  descriptionDraft={descriptionDraft}
                />
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input id="title" placeholder="Tóm tắt ngắn gọn..." {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả chi tiết</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Mô tả sự việc, thời gian, mức độ..."
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploader
                  value={field.value ?? []}
                  onChange={field.onChange}
                  uploadFn={uploadImage}
                />
              )}
            />

            <LocationPicker
              lat={lat} lng={lng} addressText={addressText}
              onChange={(loc) => {
                setValue("lat", loc.lat);
                setValue("lng", loc.lng);
                setValue("addressText", loc.addressText);
              }}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Gửi phản ánh
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Phản ánh của bạn sẽ được AI phân tích và chuyển tới điều phối viên IOC.
              IOC sẽ duyệt và gán cho cơ quan xử lý phù hợp.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
