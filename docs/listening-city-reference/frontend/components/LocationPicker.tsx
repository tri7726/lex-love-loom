import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

interface Props {
  lat?: number;
  lng?: number;
  addressText?: string;
  onChange: (loc: { lat?: number; lng?: number; addressText?: string }) => void;
}

export function LocationPicker({ lat, lng, addressText, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          addressText,
        });
        setBusy(false);
      },
      (err) => {
        alert("Không lấy được vị trí: " + err.message);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <Label>Địa điểm</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Nhập địa chỉ cụ thể..."
          value={addressText ?? ""}
          onChange={(e) => onChange({ lat, lng, addressText: e.target.value })}
        />
        <Button type="button" variant="outline" onClick={useMyLocation} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          📍 {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
