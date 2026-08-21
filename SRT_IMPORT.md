# Import bằng SRT chuẩn

SRT hiện được dùng trong chế độ **Nhập không dùng AI** tại `/admin/listening`. Luồng dán SRT hoặc nhập riêng từng lesson đã được thay bằng một batch pipeline duy nhất.

Mỗi lesson cần đúng một cặp cùng basename:

```text
first-snowfall.mp3
first-snowfall.srt
```

Có thể chọn trực tiếp một hoặc nhiều cặp MP3/SRT, hoặc upload một ZIP chứa các cặp đó. Một cặp vẫn được xử lý như batch có một item. Tên lesson lấy từ basename và slug được tạo tự động; không nhập title, slug hoặc metadata riêng trong SRT.

SRT phải có cue đánh số liên tục từ `1`, timecode chuẩn `HH:MM:SS,mmm`, nội dung không rỗng, thời gian tăng dần, không chồng lấn và không vượt thời lượng audio. Hệ thống kiểm tra toàn bộ batch và hiển thị preview trước khi Admin xác nhận.

Chi tiết kỹ thuật và giới hạn nằm trong [LESSON_IMPORT_SPEC.md](./LESSON_IMPORT_SPEC.md); hướng dẫn vận hành nằm trong [NON_AI_IMPORT.md](./NON_AI_IMPORT.md).
