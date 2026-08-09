# EchoType — ứng dụng luyện nghe chép chính tả

Một ứng dụng React + TypeScript lấy cảm hứng từ luồng học của Daily Dictation: nghe từng câu, gõ lại, nhận phản hồi theo từng từ, đọc bản dịch và xem transcript toàn bài. Giao diện và toàn bộ nội dung mẫu trong repo được thiết kế/biên soạn mới.

## Tính năng

- Thư viện bài học theo section, trình độ CEFR và tìm kiếm tức thì.
- Trang đầu chọn ngôn ngữ học: English, 中文 hoặc 日本語; mỗi ngôn ngữ có URL và thư viện riêng.
- Giao diện i18n độc lập với ngôn ngữ học: Tiếng Việt, English, 中文 và 日本語.
- Player từng câu với lặp lại, thay đổi tốc độ và giọng US/UK.
- Chấm đáp án không phân biệt hoa thường/dấu câu, phản hồi theo từng từ.
- Transcript toàn bài, bản dịch tiếng Việt và điều hướng nhanh giữa các câu.
- Lưu tiến độ, số lần thử và độ chính xác trong `localStorage`.
- Responsive cho desktop, tablet và mobile; hỗ trợ reduced motion.
- Audio local có fallback sang Web Speech API khi file không tồn tại.
- Unit test cho bộ chuẩn hóa/chấm điểm.
- Google OAuth 2.0 Authorization Code + PKCE; session bảo mật bằng cookie `HttpOnly`.
- Hồ sơ người dùng, đổi tên hiển thị và đồng bộ tiến độ giữa các thiết bị qua D1.
- Bảng xếp hạng ngày/tuần/tháng/năm với điểm do server xác minh.

## Chạy local

```bash
corepack pnpm install
corepack pnpm dev
```

Build và test:

```bash
corepack pnpm test
corepack pnpm build
```

## Google OAuth và D1

Backend là Cloudflare Worker trong `worker/index.ts`; frontend và API chạy cùng origin. Session không được lưu trong `localStorage`: trình duyệt chỉ nhận cookie `__Host-` có `HttpOnly`, `Secure` và `SameSite=Lax`.

1. Trong Google Cloud Console, tạo OAuth Client loại **Web application**.
2. Thêm redirect URI chính xác: `https://your-domain.example/api/auth/google/callback`. Local dùng `http://localhost:8787/api/auth/google/callback`.
3. Tạo database và thay `database_id` trong `wrangler.jsonc` bằng ID được trả về:

   ```bash
   npx wrangler d1 create echotype-db
   ```

4. Đặt `GOOGLE_CLIENT_ID` và `APP_ORIGIN` trong `wrangler.jsonc`. Không commit client secret; lưu bằng secret:

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

5. Chạy migration và deploy:

   ```bash
   npx wrangler d1 migrations apply echotype-db --remote
   corepack pnpm build
   npx wrangler deploy
   ```

Local development: sao chép `.dev.vars.example` thành `.dev.vars`, điền Google client secret, đặt client ID/origin local trong `wrangler.jsonc`, rồi chạy `corepack pnpm cf:dev`.

### Quy tắc tiến độ và xếp hạng

- Client gửi câu trả lời, nhưng Worker tự tính lại điểm dựa trên nội dung bài học.
- Chỉ đáp án đạt từ 80% mới được tính hoàn thành.
- Mỗi user/câu/ngày chỉ được tính một lần vào xếp hạng.
- Thời lượng mỗi câu bị giới hạn; điểm ưu tiên số câu hoàn thành và thời gian học hợp lệ.
- Tiến độ local cũ được import vào tài khoản nhưng không tạo điểm xếp hạng.
- Email không bao giờ xuất hiện trong API bảng xếp hạng.
- Hồ sơ mới mặc định không công khai; user phải chủ động bật “Hiện trên bảng xếp hạng”.

## Lưu audio miễn phí với Cloudflare R2

R2 phù hợp với audio public vì có free tier và không tính phí egress trực tiếp. Ứng dụng không gọi API R2 và không chứa secret ở frontend; nó chỉ đọc URL public từ CDN.

1. Tạo bucket Standard, ví dụ `echotype-audio`.
2. Trong lúc phát triển có thể bật URL `r2.dev`; khi production nên nối custom domain như `audio.example.com` để dùng cache.
3. Giữ cấu trúc object giống trường `audio` trong `src/data/lessons.ts`, ví dụ `morning-market/1.wav`.
4. Sửa origin production trong `infra/r2-cors.json`, sau đó áp CORS:

   ```bash
   npx wrangler r2 bucket cors set echotype-audio --file infra/r2-cors.json
   ```

5. Upload một clip:

   ```bash
   npx wrangler r2 object put echotype-audio/morning-market/1.wav --file public/audio/morning-market/1.wav --content-type audio/wav
   ```

6. Tạo `.env` từ `.env.example` và đặt:

   ```dotenv
   VITE_AUDIO_BASE_URL=https://audio.example.com
   ```

Để tiết kiệm dung lượng/băng thông, audio production nên dùng MP3 mono 64–96 kbps hoặc Opus. Đặt `Cache-Control: public, max-age=31536000, immutable` cho object có tên/version bất biến. Tuyệt đối không đưa R2 access key vào biến `VITE_*` vì các biến này xuất hiện trong bundle trình duyệt.

## Audio demo

Bản demo dùng giọng TTS sẵn có trong trình duyệt khi URL audio chưa tồn tại, nên mọi bài vẫn luyện được ngay mà không cần tải file từ nguồn khác. Khi có giọng đọc thật, chỉ cần upload đúng object key lên R2; ứng dụng sẽ ưu tiên file đó và chỉ dùng TTS làm fallback.

## Cấu trúc

```text
src/data/lessons.ts   Nội dung và metadata bài học
src/i18n.ts           Từ điển giao diện cho bốn locale
src/lib/audio.ts      Resolver CDN + Web Speech fallback
src/lib/text.ts       Chuẩn hóa và chấm đáp án
src/lib/storage.ts    Lưu tiến độ local-first
infra/r2-cors.json    CORS tối thiểu cho audio public
```

Để mở rộng thành sản phẩm có tài khoản, có thể thay `localStorage` bằng một API đồng bộ tiến độ. Player, nội dung và thuật toán chấm không phụ thuộc backend nên không cần viết lại UI.

## Routing đa ngôn ngữ

- `#/` — chọn ngôn ngữ muốn học.
- `#/learn/en`, `#/learn/zh`, `#/learn/ja` — thư viện tương ứng.
- `#/learn/:language/lesson/:lessonId` — trang luyện nghe.

Ngôn ngữ giao diện được lưu riêng trong `localStorage`; đổi giao diện không làm thay đổi khóa học hoặc tiến độ.
