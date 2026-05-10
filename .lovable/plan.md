## Mục tiêu
Chặn truy cập `/mock-tests`, `/mock-tests/:examId` và `/reading` khi chưa đăng nhập, tự động chuyển sang `/auth` và quay lại đúng trang sau khi đăng nhập thành công.

## Hiện trạng
- `src/App.tsx` khai báo 3 route trên không có lớp bảo vệ.
- Dự án chưa có component `ProtectedRoute` chung; các trang cần auth tự kiểm `user` trong `useEffect` (không nhất quán, người chưa login vẫn thấy UI nháy).
- `useAuth` đã expose `{ user, loading }` → đủ điều kiện viết wrapper sạch.
- Trang `/auth` (`src/pages/(core)/Auth.tsx`) hiện cứng `navigate('/')` sau khi login, chưa đọc query `?redirect=`.

## Thay đổi đề xuất

### 1. Tạo `src/components/auth/ProtectedRoute.tsx`
- Dùng `useAuth()`:
  - Khi `loading` → render skeleton/spinner toàn trang (tránh nháy).
  - Khi `!user` → `<Navigate to={"/auth?redirect=" + encodeURIComponent(location.pathname + location.search)} replace />`.
  - Khi có `user` → render `children` (hoặc `<Outlet />`).
- Hỗ trợ optional prop `fallbackMessage` để hiển thị toast lý do (mặc định: "Vui lòng đăng nhập để tiếp tục").

### 2. Bọc 3 route trong `src/App.tsx`
```tsx
<Route path="/mock-tests" element={<ProtectedRoute><MockTestCenter /></ProtectedRoute>} />
<Route path="/mock-tests/:examId" element={<ProtectedRoute><JLPTMockExam /></ProtectedRoute>} />
<Route path="/reading" element={<ProtectedRoute><Reading /></ProtectedRoute>} />
```

### 3. Cập nhật `src/pages/(core)/Auth.tsx`
- Đọc `searchParams.get('redirect')` (sanitize: chỉ chấp nhận path bắt đầu bằng `/`, không phải `//`).
- Sau khi `signIn` / `signUp` thành công → `navigate(redirect ?? '/', { replace: true })`.
- Áp dụng cho cả 2 đoạn navigate (login và signup confirm).

## Phạm vi không động vào
- Không refactor các trang khác (teacher/squads…) đang tự kiểm `user`. Để lần sau gom chung nếu user yêu cầu.
- Không đổi UI trang Auth.
- Không thay đổi backend / RLS — đây chỉ là rào client-side UX; dữ liệu thật vẫn đã được RLS bảo vệ.

## Kiểm thử
1. Logout → vào `/mock-tests` → chuyển `/auth?redirect=%2Fmock-tests` → login → quay lại `/mock-tests`.
2. Logout → vào `/reading?level=N3` → redirect giữ nguyên query.
3. Đang login → mọi route hoạt động như cũ, không nháy.
4. Reload `/mock-tests` khi đang login → không bị đá ra (nhờ chờ `loading=false`).
