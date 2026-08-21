# Me2Listen — ứng dụng luyện nghe chép chính tả

Một ứng dụng React + TypeScript: nghe từng câu (audio MP3 hoặc video YouTube), gõ lại, nhận phản hồi theo từng từ, xem transcript toàn bài và đọc bản dịch. Backend chạy trên Cloudflare Worker, dữ liệu lưu ở Neon (Postgres).

## Tính năng

- Thư viện bài học theo category/section, trình độ CEFR và tìm kiếm tức thì.
- Trang đầu chọn ngôn ngữ học: English (thư viện đầy đủ tại `/en`), 中文 và 日本語 hiện ở trạng thái "sắp ra mắt" (`/zh`, `/ja`).
- Giao diện i18n độc lập với ngôn ngữ học: Tiếng Việt, English, 中文 và 日本語.
- Hai loại bài học: **audio MP3** (lưu trên R2) và **video YouTube** (nhúng qua IFrame API, có sticky player, tự tắt phụ đề mặc định).
- Player từng câu với lặp lại, thay đổi tốc độ; riêng bài YouTube có thêm "Phát toàn bộ" (Play all) chạy liên tục qua các câu.
- Chấm đáp án không phân biệt hoa thường/dấu câu, phản hồi theo từng từ.
- Chế độ Full transcript: cuộn tự động theo câu đang phát (không cuộn cả trang), chọn ngôn ngữ để hiện bản dịch ngay dưới từng câu (nhiều ngôn ngữ, không chỉ tiếng Việt).
- Bình luận theo từng câu (sentence comments), có trang kiểm duyệt cho admin.
- Responsive cho desktop, tablet và mobile; dialog cài đặt được tối ưu riêng cho màn hình nhỏ.
- Unit test cho bộ chuẩn hóa/chấm điểm và các module i18n.
- Google OAuth 2.0 Authorization Code + PKCE; session bảo mật bằng cookie `__Host-` `HttpOnly`.
- Hồ sơ người dùng, đổi tên hiển thị và đồng bộ tiến độ giữa các thiết bị qua **Neon Postgres** (không dùng Cloudflare D1).
- Bảng xếp hạng ngày/tuần/tháng/năm với điểm do server xác minh, có trang cài đặt riêng cho admin.
- Trang quản trị: nhập bài học (MP3+SRT, ZIP, YouTube, không-AI), quản lý bài học, duyệt bản dịch cộng đồng, kiểm duyệt bình luận.

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

## Google OAuth và Neon (database)

Backend là Cloudflare Worker trong `worker/index.ts`; frontend và API chạy cùng origin. Session không được lưu trong `localStorage`: trình duyệt chỉ nhận cookie `__Host-` có `HttpOnly`, `Secure` và `SameSite=Lax`. Dữ liệu (user, lesson, tiến độ, bình luận, bản dịch, leaderboard) lưu trên **Neon Postgres**, truy cập qua `@neondatabase/serverless` — xem chi tiết cấu hình kết nối ở [DATABASE_SETUP.md](./DATABASE_SETUP.md).

1. Trong Google Cloud Console, tạo OAuth Client loại **Web application**.
2. Thêm redirect URI chính xác: `https://your-domain.example/api/auth/google/callback`. Local dùng `http://localhost:8787/api/auth/google/callback`.
3. Tạo một Neon project, lấy connection string, rồi làm theo [DATABASE_SETUP.md](./DATABASE_SETUP.md) để đặt `DATABASE_URL` và chạy migration:

   ```bash
   corepack pnpm db:migrate
   ```

4. Đặt `GOOGLE_CLIENT_ID` và `APP_ORIGIN` trong **Variables and Secrets** của môi trường deployment trên Cloudflare Dashboard. Không khai báo hai biến này trong `wrangler.jsonc`. Đặt client secret và database connection string dưới dạng secret:

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put DATABASE_URL
   ```

   Dự án không tích hợp Google Translate API hoặc dịch máy. Bản dịch được nhập từ file hoặc đóng góp thủ công và chỉ hiển thị công khai sau khi admin duyệt.

5. Chạy migration và deploy (script `cf:deploy` đã tự chạy `db:migrate` trước khi build/deploy):

   ```bash
   corepack pnpm cf:deploy
   ```

Local development: sao chép `.dev.vars.example` thành `.dev.vars`, điền `DATABASE_URL` (Neon), Google client ID, client secret và origin local trong file đó, rồi chạy `corepack pnpm cf:dev` (chạy Worker + assets qua `wrangler dev`, cần thiết vì frontend gọi `/api/*` cùng origin — `corepack pnpm dev` chỉ chạy Vite thuần, không có API).

### Quy tắc tiến độ và xếp hạng

- Client gửi câu trả lời, nhưng Worker tự tính lại điểm dựa trên nội dung bài học.
- Chỉ đáp án đạt từ 80% mới được tính hoàn thành.
- Mỗi user/câu/ngày chỉ được tính một lần vào xếp hạng.
- Thời lượng mỗi câu bị giới hạn; điểm ưu tiên số câu hoàn thành và thời gian học hợp lệ.
- Tiến độ local cũ được import vào tài khoản nhưng không tạo điểm xếp hạng.
- Email không bao giờ xuất hiện trong API bảng xếp hạng.
- Hồ sơ mới mặc định không công khai; user phải chủ động bật “Hiện trên bảng xếp hạng”.

## R2 legacy cho dữ liệu demo cũ

Phần này chỉ áp dụng cho audio demo legacy trong `src/data/lessons.ts`, không áp dụng cho listening content mới. Với lesson English mới, phải dùng bucket `me2listen-audio` và màn hình quản trị theo [USER_GUIDE.md](./USER_GUIDE.md). Không upload trực tiếp vào bucket legacy rồi kỳ vọng lesson mới xuất hiện.

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

## Listening content

Mỗi bài học English đọc từ Neon, có 2 dạng: `templateType: "audio"` (file MP3 gốc trên R2) hoặc `templateType: "media"` (video YouTube nhúng qua ID), cùng các mốc thời gian câu (`start_ms`/`end_ms`) lưu trong database. Xem [LISTENING_CONTENT.md](./LISTENING_CONTENT.md) để cấu hình bucket, migration, quyền admin và publish; hợp đồng các chế độ import (MP3+SRT, ZIP, YouTube, không-AI) nằm trong [LESSON_IMPORT_SPEC.md](./LESSON_IMPORT_SPEC.md), [YOUTUBE_IMPORT.md](./YOUTUBE_IMPORT.md) và [NON_AI_IMPORT.md](./NON_AI_IMPORT.md).

Hướng dẫn thao tác dành cho người quản lý nội dung: [USER_GUIDE.md](./USER_GUIDE.md).

## Nội dung demo cũ (`src/data/lessons.ts`)

Bộ nội dung mẫu ban đầu của repo (trước khi có Neon) dùng giọng TTS sẵn có trong trình duyệt khi URL audio chưa tồn tại. Bộ này không còn là đường đi chính của sản phẩm — lesson thật được quản lý qua trang admin và lưu ở Neon/R2 như mô tả ở trên; xem chi tiết ở mục "R2 legacy" bên dưới nếu vẫn cần dùng nó.

## Cấu trúc

```text
worker/index.ts              Cloudflare Worker: auth, API, routing chính
worker/listening.ts          API nghe/chép, SEO transcript, hàng đợi import
worker/leaderboard.ts        Tính điểm và API bảng xếp hạng
src/listening.tsx            UI luyện nghe/chép (dictation + full transcript)
src/App.tsx                  Shell ứng dụng, header, routing cấp cao
src/auth.tsx                 Auth context và các lệnh gọi API phía client
src/components/              Player YouTube/MP3, dialog cài đặt, bình luận, admin...
src/lib/                     Chấm điểm, chuẩn hóa text, dịch, import SRT/YouTube...
src/*I18n.ts                 Từ điển giao diện theo từng khu vực tính năng (4 locale)
src/data/lessons.ts          Nội dung demo cũ (chỉ dùng khi chưa có Neon)
infra/r2-cors.json           CORS tối thiểu cho audio public trên R2
```

Ứng dụng đã là sản phẩm có tài khoản đầy đủ (Google OAuth + Neon Postgres); `localStorage` chỉ còn dùng cho tiến độ khách (guest) trước khi đăng nhập, sau đó được đồng bộ lên server.

## Routing

- `/` — chọn ngôn ngữ muốn học.
- `/en` — thư viện English; `/zh`, `/ja` — trang "sắp ra mắt".
- `/lessons/:level/:category/:slug` — đường dẫn chính thức (canonical) của một bài học, ví dụ `/lessons/a2/long-listening/weekend-plans`. Đường dẫn cũ `/learn/en/lesson/:id` và `/lesson/:id` vẫn được redirect sang dạng này.
- `/admin`, `/admin/listening`, `/admin/listening/manage`, `/admin/listening/translations`, `/admin/listening/comments`, `/admin/leaderboard` — các trang quản trị (xem `src/router.ts`).

Ngôn ngữ giao diện được lưu riêng trong `localStorage`; đổi giao diện không làm thay đổi khóa học hoặc tiến độ.
