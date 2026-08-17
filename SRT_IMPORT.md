# Pre-timed Import bằng SRT

Pre-timed Import sử dụng SRT làm định dạng timing chuẩn và không gọi AI.

Có thể nhập theo hai cách trong `#/admin/listening`:

- Dán nội dung SRT vào ô **Pre-timed SRT**.
- Chọn file `.srt`; nếu chọn file, nội dung file được ưu tiên hơn nội dung đã dán.

Ví dụ:

```srt
1
00:00:00,000 --> 00:00:01,200
First sentence.

2
00:00:01,200 --> 00:00:02,500
Second sentence.
```

Số thứ tự phải liên tục từ `1`, timecode dùng dạng `HH:MM:SS,mmm` hoặc dấu chấm thay cho dấu phẩy, và mỗi cue phải có text. Số cue phải đúng với số dòng transcript không rỗng; text trong SRT cũng phải khớp dòng transcript tương ứng. Hệ thống tiếp tục kiểm tra overlap, thứ tự timestamp và giới hạn theo thời lượng audio trước khi lưu lesson.
