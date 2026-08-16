# Hướng dẫn quản lý nội dung Me2Listen

Tài liệu này dành cho người quản lý nội dung. Phiên bản hiện tại hỗ trợ tạo bài nghe English từ một file audio gốc và transcript, tự căn timestamp bằng Workers AI, review rồi publish.

## 1. Thành phần và nơi lưu

| Thành phần | Nơi lưu | Cách cập nhật |
|---|---|---|
| Category, Section | Neon/Postgres | Seed hoặc database |
| Lesson, sentence, timestamp, transcript | Neon/Postgres | Màn hình quản trị |
| Audio gốc | R2 `me2listen-audio` | Tự động upload khi Process |
| Thumbnail/PDF/resource khác | Chưa có UI/API quản lý | Chưa hỗ trợ chính thức |

Không chỉ upload audio trực tiếp trong R2 Dashboard. Để lesson hoạt động, hệ thống còn cần lesson, sentence, transcript và timestamp trong database.

## 2. Cấu hình một lần

### R2

Trong Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**:

- Tên: `me2listen-audio`
- Location: `Automatic`
- Location hint: để trống
- Jurisdiction: không chọn
- Default Storage Class: `Standard`

Project đã nối bucket trong `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "LISTENING_AUDIO",
    "bucket_name": "me2listen-audio"
  }
]
```

`bucket_name` là tên thật trên Cloudflare; `LISTENING_AUDIO` là tên biến Worker dùng trong code. Không cần tạo public URL hoặc đưa R2 access key vào frontend.

### Workers AI và database

Ứng dụng gọi Workers AI qua Cloudflare REST API, không dùng binding `AI` trong Worker đang deploy. Khai báo hai biến sau trong secret/environment của Worker:

```text
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_AI_TOKEN=your-workers-ai-api-token
```

Token cần quyền Workers AI Read/Write theo Cloudflare. Không đưa token vào frontend, `wrangler.jsonc` hoặc Git. Workers AI chỉ dùng để gợi ý timestamp; transcript người quản lý nhập luôn là nội dung chuẩn.

Chạy migration trong database mục tiêu:

```powershell
pnpm db:migrate
```

Đặt `ADMIN_EMAILS` trong biến môi trường/secret của Worker. Nhiều email phân tách bằng dấu phẩy:

```text
ADMIN_EMAILS=manager@example.com,editor@example.com
```

Email đăng nhập Google phải khớp danh sách này. Không commit `DATABASE_URL`, OAuth secret hoặc token vào Git.

Sau khi đổi binding/config:

```powershell
pnpm exec wrangler types
pnpm build
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler deploy
```

## 3. Chuẩn bị audio và transcript

Audio hỗ trợ MP3, WAV, M4A/MP4, OGG hoặc WebM; tối đa 20 MB và 60 phút. Nên dùng MP3 mono 64–96 kbps, giọng rõ, ít nhạc nền.

Không cần đổi tên file theo object key. Hệ thống tự lưu theo mẫu:

```text
listening/en/lessons/{lessonId}/audio.{extension}
```

Transcript phải là tiếng Anh, mỗi câu một dòng và đúng thứ tự audio:

```text
Today is a beautiful day.
I am going to the market.
Would you like to come with me?
```

Không thêm số thứ tự đầu dòng. Transcript tối đa 50.000 ký tự và 1.000 câu.

## 4. Import lesson

1. Đăng nhập bằng tài khoản nằm trong `ADMIN_EMAILS`.
2. Mở menu tài khoản → **Content management**, hoặc mở `#/admin/listening`.
3. Chọn đúng **Section** English.
4. Nhập Title, Slug, Level; chọn Audio; dán Transcript.
5. Slug chỉ dùng chữ thường, số và dấu gạch ngang, ví dụ `morning-market`.
6. Bấm **Process**.

Hệ thống sẽ upload audio vào R2, gọi Workers AI lấy cue/VTT, căn cue với transcript, rồi tạo lesson draft chưa public. Nếu thất bại, bài chưa được publish; hãy kiểm tra lại audio/transcript và import mới.

## 5. Review và publish

Với từng câu sau khi Process:

1. Bấm phát để nghe đoạn tương ứng.
2. Sửa text nếu cần.
3. Sửa `start_ms` và `end_ms` nếu điểm cắt chưa đúng.
4. Đảm bảo `start_ms >= 0`, `end_ms > start_ms`, không vượt thời lượng audio, đúng thứ tự và không chồng lấn.
5. Bấm **Publish**.

Chỉ lesson đã publish mới xuất hiện trong:

```text
Homepage → English → Short Stories → Section 1 → Lesson → Dictation
```

## 6. Kiểm tra sau publish

Kiểm tra lesson hiển thị đúng section, số câu và thời lượng; audio toàn bài phát được; audio từng câu không lấn sang câu kế; transcript khớp audio; nhập đáp án, Enter, repeat và chuyển câu hoạt động.

Nếu lesson không hiển thị, kiểm tra: đã Publish chưa, category/section có published không, binding có đúng bucket không, Worker đã deploy chưa và audio object có tồn tại trong R2 không.

## 7. Cập nhật audio và resource khác

Phiên bản hiện tại chưa có chức năng thay audio trực tiếp cho lesson đã publish. Không tự ghi đè object R2 vì timestamp cũ có thể không còn khớp. Quy trình an toàn là import lesson mới với slug mới, review, publish, rồi ẩn lesson cũ nếu cần.

Thumbnail, PDF, ảnh minh họa và resource khác hiện chưa có UI/API quản lý hoặc hiển thị đầy đủ. Không tự upload vào R2 rồi điền `thumbnail_key`; cần bổ sung API upload/serve, validation, metadata và UI trước khi sử dụng.

## 8. Quy tắc vận hành

- Không publish nếu chưa nghe thử từng đoạn.
- Không đổi tên bucket nếu chưa sửa `wrangler.jsonc` và deploy lại.
- Không xóa audio object đang được lesson sử dụng.
- Không đưa secret vào frontend hoặc commit `.dev.vars`, `.env`.
- Sau thay đổi cấu hình, chạy `pnpm build` và `pnpm exec wrangler deploy --dry-run` trước deploy thật.
