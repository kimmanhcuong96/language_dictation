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
CLOUDFLARE_AI_MODEL=@cf/openai/whisper
```

Token cần quyền Workers AI Read/Write theo Cloudflare. Không đưa token vào frontend, `wrangler.jsonc` hoặc Git. Workers AI chỉ dùng để gợi ý timestamp; transcript người quản lý nhập luôn là nội dung chuẩn.

`CLOUDFLARE_AI_MODEL` là bắt buộc; hệ thống không tự chọn model mặc định. Giá trị phải là model Workers AI dạng `@cf/{vendor}/{model}` và model cần trả về VTT để căn timestamp.

Ba biến `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN` và `CLOUDFLARE_AI_MODEL` không được khai báo trong `wrangler.jsonc`. Project đã bật `keep_vars: true`, vì vậy các giá trị bạn đặt trên Cloudflare Dashboard sẽ được giữ nguyên khi deploy code mới.

Chạy migration trong database mục tiêu:

```powershell
pnpm db:migrate
```

Đặt `ADMIN_EMAILS` trong biến môi trường/secret của Worker. Nhiều email phân tách bằng dấu phẩy:

```text
ADMIN_EMAILS=manager@example.com,editor@example.com
```

Email đăng nhập Google phải khớp danh sách này. Không commit `DATABASE_URL`, OAuth secret hoặc token vào Git.

Project đã bật `keep_vars: true` và không khai báo `ADMIN_EMAILS` trong `wrangler.jsonc`, nên giá trị `ADMIN_EMAILS` trên Cloudflare Dashboard sẽ được giữ lại khi deploy. Nếu lần deploy trước đã ghi đè thành rỗng, hãy nhập lại giá trị một lần trong Dashboard trước khi deploy phiên bản mới.

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
2. Mở menu tài khoản → **Quản lý nội dung** để vào dashboard `#/admin`.
3. Chọn thẻ **Nhập bài học**. Có thể mở trực tiếp `#/admin/listening` nếu cần.
4. Chọn **Nhập bằng AI** hoặc **Nhập không dùng AI**. Nhãn có thể hiển thị bằng `vi`, `en`, `zh` hoặc `ja` theo ngôn ngữ giao diện đang chọn.

### 4.1. Nhập bằng AI

1. Chọn đúng section đích. Level là tùy chọn và có thể để trống.
2. Nhập Title, chọn Audio và dán Transcript theo quy tắc mỗi dòng một câu.
3. Bấm **Xử lý bằng AI**.
4. Hệ thống tự tạo slug từ Title, ví dụ `First Snowfall` thành `first-snowfall`.

AI chỉ map timestamp cho đúng các dòng transcript đã gửi lên. Phần giọng nói có trong audio nhưng không có trong transcript sẽ bị bỏ qua; kết quả nhận dạng không được dùng để viết lại transcript. Chỉ sau khi alignment thành công, hệ thống mới upload audio và tạo draft. Nếu request thất bại, các record và object R2 liên quan của request đó được rollback để có thể import lại cùng slug.

### 4.2. Nhập không dùng AI bằng MP3 + SRT

1. Chuẩn bị từng cặp file cùng basename, ví dụ `first-snowfall.mp3` và `first-snowfall.srt`.
2. Chọn section đích một lần cho cả batch. Level là tùy chọn và có thể để trống.
3. Chọn nhiều file MP3/SRT trực tiếp, hoặc chọn một ZIP chứa các cặp file.
4. Bấm **Kiểm tra và xem trước**; kiểm tra tên bài, slug, duration, số đoạn và lỗi từng item.
5. Bấm **Xác nhận nhập** để xử lý các item hợp lệ. Một cặp cũng dùng đúng pipeline batch này.

Item không hợp lệ hoặc thất bại không chặn item khác. Dùng **Tiếp tục nhập** sau khi luồng bị gián đoạn và **Thử lại bài lỗi** cho item thất bại; item đã hoàn tất không được tạo lại. SRT là nguồn transcript/timestamp chuẩn và chế độ này không gọi AI. Xem giới hạn file tại [NON_AI_IMPORT.md](./NON_AI_IMPORT.md).

Migration `db/migrations/0008_batch_lesson_import.sql` phải được áp dụng trước khi dùng chế độ batch.

## 5. Review và publish

Luồng này áp dụng cho **Nhập bằng AI**. Với từng câu sau khi xử lý:

1. Bấm **Nghe đoạn** để nghe đúng khoảng thời gian tương ứng.
2. Sửa text nếu cần; nội dung vẫn phải theo transcript chuẩn đã nhập.
3. Sửa `start_ms` và `end_ms` nếu điểm cắt chưa đúng.
4. Đảm bảo `start_ms >= 0`, `end_ms > start_ms`, không vượt thời lượng audio, đúng thứ tự và không chồng lấn.
5. Bấm **Xuất bản**.

Lesson Non-AI hợp lệ được publish trong quá trình xử lý batch sau bước xác nhận, vì timestamp và transcript đã được xác định trong SRT.

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
## 9. Cài đặt riêng cho bài luyện nghe

Trong một bài nghe, chọn **Tùy chọn phát** để mở hộp thoại cài đặt. Bạn có thể đổi phím nghe lại, phím phát/tạm dừng, bật tự động nghe lại, chọn thời gian chờ giữa các lần nghe, bật gợi ý từ trên điện thoại và bật/tắt mẹo phím tắt. Chọn **Lưu thay đổi** để áp dụng.

Phím nghe lại mặc định là **Ctrl**. Các lựa chọn gồm Ctrl, Shift, Alt, Command, Ctrl + Shift, Ctrl + Alt, Ctrl + Space và Ctrl + b.

Phím phát/tạm dừng luôn là backtick `` ` ``.

Nếu đã đăng nhập, cài đặt được lưu riêng trên tài khoản và dùng lại trên các thiết bị khác. Nếu chưa đăng nhập, cài đặt chỉ được lưu cho profile khách trên trình duyệt hiện tại.
