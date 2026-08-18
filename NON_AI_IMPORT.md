# Import lesson không dùng AI

Màn hình `#/admin/listening` có hai chế độ độc lập: **Nhập bằng AI** và **Nhập không dùng AI**. Tên nút tự đổi theo ngôn ngữ giao diện (`vi`, `en`, `zh`, `ja`); tên lesson, section và transcript không bị dịch.

## Chuẩn bị dữ liệu

Mỗi lesson gồm đúng một cặp file có cùng basename:

```text
001-greetings.mp3
001-greetings.srt
```

Tên lesson được lấy từ basename (`001-greetings`); slug được hệ thống tự tạo theo quy tắc hiện có. SRT phải là SRT chuẩn, không thêm title hoặc metadata riêng của Me2Listen.

## Import trực tiếp

1. Chọn **Nhập không dùng AI**.
2. Chọn target section và level.
3. Chọn **MP3 + SRT files**.
4. Chọn một hoặc nhiều cặp MP3/SRT cùng lúc.
5. Bấm **Kiểm tra và xem trước**.
6. Kiểm tra section, tên, slug, duration, số segment và lỗi của từng lesson.
7. Bấm **Xác nhận nhập** để chỉ import các lesson hợp lệ.

Một cặp file vẫn đi qua đúng batch pipeline như nhiều cặp file.

## Import ZIP

Chọn **ZIP archive** và upload một ZIP chứa một hoặc nhiều cặp MP3/SRT. Có thể đặt file trong thư mục con; hệ thống vẫn pair theo basename. ZIP có path không an toàn, vượt giới hạn hoặc chứa file không được hỗ trợ sẽ được báo lỗi trước khi confirm.

## Partial success và retry

Mỗi lesson có trạng thái `queued`, `processing`, `completed`, `failed` hoặc `invalid`; UI sẽ dịch trạng thái này. Lesson lỗi không chặn các lesson hợp lệ khác. Bấm **Thử lại bài lỗi** để chạy lại các item thất bại; item đã `completed` không được xử lý lại.

Batch gần nhất được lưu trên trình duyệt và tự mở lại khi Admin quay lại màn hình import. Bấm **Tiếp tục nhập** để tiếp tục các item chưa hoàn tất.

## Giới hạn

- Tối đa 100 lesson trong một batch.
- Tối đa 20 MB cho mỗi MP3.
- Tối đa 1 MB cho mỗi SRT.
- Tối đa 40 MB cho ZIP và 64 MB sau giải nén.
- Tối đa 250 resource trong input.

Các giới hạn bảo vệ bộ nhớ Cloudflare Worker khi parse multipart và giải nén ZIP.

## Trước khi deploy

Migration `db/migrations/0008_batch_lesson_import.sql` phải được áp dụng trước khi deploy code:

```powershell
corepack pnpm db:migrate
corepack pnpm build
corepack pnpm exec wrangler deploy --dry-run
```
