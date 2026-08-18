import type { UiLocale } from "./types";

const en = {
  pageTitle: "Lesson Import",
  home: "Home",
  loading: "Loading…",
  adminRequired: "Administrator access is required.",
  manageLessons: "Manage existing lessons",
  aiImport: "AI Import",
  nonAiImport: "Non-AI Import",
  targetSection: "Target section",
  level: "Level",
  title: "Title",
  audio: "Audio",
  transcript: "Transcript, one sentence per line",
  processWithAi: "Process with AI",
  processing: "Processing…",
  sentence: "Sentence",
  playSegment: "Play segment",
  publish: "Publish",
  publishing: "Publishing…",
  inputMethod: "Input method",
  directFiles: "MP3 + SRT files",
  zipArchive: "ZIP archive",
  lessonResources: "Lesson resources",
  directFilesHint: "Select one or more matching <lesson-name>.mp3 and <lesson-name>.srt pairs.",
  zipHint: "The archive may contain one or many MP3/SRT pairs.",
  validatePreview: "Validate and preview",
  validating: "Validating…",
  batchValidation: "Batch import validation",
  newBatch: "New batch",
  total: "Total",
  valid: "Valid",
  invalid: "Invalid",
  completed: "Completed",
  failed: "Failed",
  remaining: "Remaining",
  queued: "Queued",
  processingStatus: "Processing",
  confirmImport: "Confirm import {count} valid lesson(s)",
  importing: "Importing…",
  resumeImport: "Resume import",
  retryFailed: "Retry failed",
  missingMp3: "Missing MP3",
  missingSrt: "Missing SRT",
  slug: "Slug",
  duration: "Duration",
  segments: "Segments",
  loadSectionsFailed: "Unable to load sections.",
  aiImportFailed: "AI import failed.",
  publishFailed: "Publish failed.",
  batchValidationFailed: "Batch validation failed.",
  itemFailed: "A lesson failed to import.",
  batchProcessingFailed: "Batch processing failed.",
  requestFailed: "Request failed.",
  unsupportedFileType: "Unsupported file type.",
  invalidFilename: "The filename cannot be used as a lesson name.",
  audioEmpty: "The MP3 file is empty.",
  srtEmpty: "The SRT file is empty or has no cues.",
  duplicateAudio: "More than one MP3 has the same basename.",
  duplicateSrt: "More than one SRT has the same basename.",
  audioTooLarge: "The MP3 file exceeds the size limit.",
  srtTooLarge: "The SRT file exceeds the size limit.",
  duplicateSlugBatch: "Another lesson in this batch has the same slug.",
  duplicateSlugSection: "This section already contains a lesson with the same slug.",
  invalidDuration: "The audio duration is invalid or could not be read.",
  invalidSrt: "The SRT file is malformed or contains invalid timestamps.",
  invalidSrtSequence: "SRT cue numbers must be continuous from 1.",
  invalidSrtTiming: "SRT timestamps must be ordered, non-overlapping, and within the audio duration.",
  missingSrtText: "Every SRT cue must contain text.",
  unsafeZipPath: "The ZIP contains an unsafe path.",
  zipRequired: "Select a ZIP file.",
  zipTooLarge: "The ZIP file exceeds the size limit.",
  zipExtractedTooLarge: "The extracted ZIP exceeds the size limit.",
  tooManyResources: "The input contains too many files.",
  resourceStagingFailed: "The uploaded resources could not be staged.",
  stagedResourceMissing: "The staged import resources are missing. Start a new batch.",
  itemNotProcessable: "This lesson cannot be processed in its current state.",
  unexpectedError: "{fallback} Technical detail: {detail}",
} as const;

export type AdminImportMessageKey = keyof typeof en;
type Messages = Record<AdminImportMessageKey, string>;

const vi: Messages = {
  pageTitle: "Nhập bài học", home: "Trang chủ", loading: "Đang tải…", adminRequired: "Bạn cần quyền quản trị viên.", manageLessons: "Quản lý bài học hiện có", aiImport: "Nhập bằng AI", nonAiImport: "Nhập không dùng AI", targetSection: "Section đích", level: "Cấp độ", title: "Tiêu đề", audio: "Audio", transcript: "Transcript, mỗi dòng một câu", processWithAi: "Xử lý bằng AI", processing: "Đang xử lý…", sentence: "Câu", playSegment: "Nghe đoạn", publish: "Xuất bản", publishing: "Đang xuất bản…", inputMethod: "Phương thức nhập", directFiles: "File MP3 + SRT", zipArchive: "File ZIP", lessonResources: "Tài nguyên bài học", directFilesHint: "Chọn một hoặc nhiều cặp <tên-bài>.mp3 và <tên-bài>.srt trùng basename.", zipHint: "File ZIP có thể chứa một hoặc nhiều cặp MP3/SRT.", validatePreview: "Kiểm tra và xem trước", validating: "Đang kiểm tra…", batchValidation: "Kết quả kiểm tra batch", newBatch: "Batch mới", total: "Tổng", valid: "Hợp lệ", invalid: "Không hợp lệ", completed: "Hoàn tất", failed: "Thất bại", remaining: "Còn lại", queued: "Chờ xử lý", processingStatus: "Đang xử lý", confirmImport: "Xác nhận nhập {count} bài hợp lệ", importing: "Đang nhập…", resumeImport: "Tiếp tục nhập", retryFailed: "Thử lại bài lỗi", missingMp3: "Thiếu MP3", missingSrt: "Thiếu SRT", slug: "Slug", duration: "Thời lượng", segments: "Số đoạn", loadSectionsFailed: "Không thể tải danh sách section.", aiImportFailed: "Nhập bài bằng AI thất bại.", publishFailed: "Xuất bản thất bại.", batchValidationFailed: "Kiểm tra batch thất bại.", itemFailed: "Một bài học nhập thất bại.", batchProcessingFailed: "Xử lý batch thất bại.", requestFailed: "Yêu cầu thất bại.", unsupportedFileType: "Loại file không được hỗ trợ.", invalidFilename: "Tên file không thể dùng làm tên bài học.", audioEmpty: "File MP3 rỗng.", srtEmpty: "File SRT rỗng hoặc không có cue.", duplicateAudio: "Có nhiều MP3 trùng basename.", duplicateSrt: "Có nhiều SRT trùng basename.", audioTooLarge: "File MP3 vượt quá giới hạn dung lượng.", srtTooLarge: "File SRT vượt quá giới hạn dung lượng.", duplicateSlugBatch: "Một bài khác trong batch có cùng slug.", duplicateSlugSection: "Section này đã có bài học cùng slug.", invalidDuration: "Thời lượng audio không hợp lệ hoặc không đọc được.", invalidSrt: "File SRT sai định dạng hoặc có timestamp không hợp lệ.", invalidSrtSequence: "Số thứ tự cue SRT phải liên tục từ 1.", invalidSrtTiming: "Timestamp SRT phải đúng thứ tự, không chồng lấn và nằm trong thời lượng audio.", missingSrtText: "Mỗi cue SRT phải có nội dung.", unsafeZipPath: "File ZIP chứa đường dẫn không an toàn.", zipRequired: "Hãy chọn file ZIP.", zipTooLarge: "File ZIP vượt quá giới hạn dung lượng.", zipExtractedTooLarge: "Dung lượng sau giải nén vượt quá giới hạn.", tooManyResources: "Input chứa quá nhiều file.", resourceStagingFailed: "Không thể lưu tạm tài nguyên đã upload.", stagedResourceMissing: "Tài nguyên tạm của batch không còn tồn tại. Hãy tạo batch mới.", itemNotProcessable: "Bài học không thể xử lý ở trạng thái hiện tại.", unexpectedError: "{fallback} Chi tiết kỹ thuật: {detail}",
};

const zh: Messages = {
  pageTitle: "导入课程", home: "首页", loading: "加载中…", adminRequired: "需要管理员权限。", manageLessons: "管理现有课程", aiImport: "AI 导入", nonAiImport: "非 AI 导入", targetSection: "目标章节", level: "级别", title: "标题", audio: "音频", transcript: "逐行输入句子的文本", processWithAi: "使用 AI 处理", processing: "处理中…", sentence: "句子", playSegment: "播放片段", publish: "发布", publishing: "发布中…", inputMethod: "导入方式", directFiles: "MP3 + SRT 文件", zipArchive: "ZIP 压缩包", lessonResources: "课程资源", directFilesHint: "选择一组或多组同名的 <课程名>.mp3 与 <课程名>.srt。", zipHint: "压缩包可包含一组或多组 MP3/SRT 文件。", validatePreview: "验证并预览", validating: "验证中…", batchValidation: "批量导入验证", newBatch: "新批次", total: "总数", valid: "有效", invalid: "无效", completed: "已完成", failed: "失败", remaining: "剩余", queued: "排队中", processingStatus: "处理中", confirmImport: "确认导入 {count} 个有效课程", importing: "导入中…", resumeImport: "继续导入", retryFailed: "重试失败项", missingMp3: "缺少 MP3", missingSrt: "缺少 SRT", slug: "Slug", duration: "时长", segments: "片段数", loadSectionsFailed: "无法加载章节。", aiImportFailed: "AI 导入失败。", publishFailed: "发布失败。", batchValidationFailed: "批次验证失败。", itemFailed: "一个课程导入失败。", batchProcessingFailed: "批次处理失败。", requestFailed: "请求失败。", unsupportedFileType: "不支持的文件类型。", invalidFilename: "文件名不能作为课程名称。", audioEmpty: "MP3 文件为空。", srtEmpty: "SRT 文件为空或没有字幕条目。", duplicateAudio: "存在多个同名 MP3。", duplicateSrt: "存在多个同名 SRT。", audioTooLarge: "MP3 文件超过大小限制。", srtTooLarge: "SRT 文件超过大小限制。", duplicateSlugBatch: "此批次中存在相同 slug 的课程。", duplicateSlugSection: "目标章节中已存在相同 slug 的课程。", invalidDuration: "音频时长无效或无法读取。", invalidSrt: "SRT 格式或时间戳无效。", invalidSrtSequence: "SRT 序号必须从 1 开始连续排列。", invalidSrtTiming: "SRT 时间戳必须有序、不重叠且在音频时长内。", missingSrtText: "每个 SRT 条目都必须包含文本。", unsafeZipPath: "ZIP 包含不安全路径。", zipRequired: "请选择 ZIP 文件。", zipTooLarge: "ZIP 文件超过大小限制。", zipExtractedTooLarge: "ZIP 解压后的大小超过限制。", tooManyResources: "输入文件数量过多。", resourceStagingFailed: "无法暂存上传资源。", stagedResourceMissing: "暂存资源已丢失，请新建批次。", itemNotProcessable: "该课程当前状态无法处理。", unexpectedError: "{fallback} 技术详情：{detail}",
};

const ja: Messages = {
  pageTitle: "レッスンのインポート", home: "ホーム", loading: "読み込み中…", adminRequired: "管理者権限が必要です。", manageLessons: "既存レッスンを管理", aiImport: "AI インポート", nonAiImport: "非 AI インポート", targetSection: "対象セクション", level: "レベル", title: "タイトル", audio: "音声", transcript: "1行に1文のトランスクリプト", processWithAi: "AI で処理", processing: "処理中…", sentence: "文", playSegment: "区間を再生", publish: "公開", publishing: "公開中…", inputMethod: "入力方法", directFiles: "MP3 + SRT ファイル", zipArchive: "ZIP アーカイブ", lessonResources: "レッスン素材", directFilesHint: "同じベース名の <レッスン名>.mp3 と <レッスン名>.srt を1組以上選択してください。", zipHint: "ZIPには1組以上のMP3/SRTペアを含められます。", validatePreview: "検証してプレビュー", validating: "検証中…", batchValidation: "一括インポート検証", newBatch: "新しいバッチ", total: "合計", valid: "有効", invalid: "無効", completed: "完了", failed: "失敗", remaining: "残り", queued: "待機中", processingStatus: "処理中", confirmImport: "有効な{count}件をインポート", importing: "インポート中…", resumeImport: "インポートを再開", retryFailed: "失敗項目を再試行", missingMp3: "MP3がありません", missingSrt: "SRTがありません", slug: "Slug", duration: "再生時間", segments: "区間数", loadSectionsFailed: "セクションを読み込めません。", aiImportFailed: "AIインポートに失敗しました。", publishFailed: "公開に失敗しました。", batchValidationFailed: "バッチ検証に失敗しました。", itemFailed: "レッスンのインポートに失敗しました。", batchProcessingFailed: "バッチ処理に失敗しました。", requestFailed: "リクエストに失敗しました。", unsupportedFileType: "未対応のファイル形式です。", invalidFilename: "ファイル名をレッスン名として使用できません。", audioEmpty: "MP3ファイルが空です。", srtEmpty: "SRTが空か、字幕がありません。", duplicateAudio: "同じベース名のMP3が複数あります。", duplicateSrt: "同じベース名のSRTが複数あります。", audioTooLarge: "MP3がサイズ上限を超えています。", srtTooLarge: "SRTがサイズ上限を超えています。", duplicateSlugBatch: "バッチ内に同じslugのレッスンがあります。", duplicateSlugSection: "対象セクションに同じslugのレッスンがあります。", invalidDuration: "音声時間が無効か読み取れません。", invalidSrt: "SRT形式またはタイムスタンプが不正です。", invalidSrtSequence: "SRT番号は1から連続している必要があります。", invalidSrtTiming: "SRTの時刻は順序どおりで重複せず、音声時間内である必要があります。", missingSrtText: "すべてのSRTキューにテキストが必要です。", unsafeZipPath: "ZIPに安全でないパスが含まれています。", zipRequired: "ZIPファイルを選択してください。", zipTooLarge: "ZIPがサイズ上限を超えています。", zipExtractedTooLarge: "展開後のZIPがサイズ上限を超えています。", tooManyResources: "入力ファイルが多すぎます。", resourceStagingFailed: "アップロード素材を一時保存できません。", stagedResourceMissing: "一時保存した素材がありません。新しいバッチを作成してください。", itemNotProcessable: "この状態のレッスンは処理できません。", unexpectedError: "{fallback} 技術詳細：{detail}",
};

export const adminImportMessages: Record<UiLocale, Messages> = { vi, en, zh, ja };

export function adminImportT(locale: UiLocale, key: AdminImportMessageKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, String(value)), adminImportMessages[locale][key]);
}

const errorKeys: Record<string, AdminImportMessageKey> = {
  request_failed: "requestFailed", content_length_required: "requestFailed", invalid_multipart_form: "requestFailed", invalid_batch_metadata: "requestFailed", invalid_import_resources: "requestFailed", invalid_section: "loadSectionsFailed", invalid_batch: "requestFailed", batch_not_confirmable: "batchProcessingFailed", invalid_batch_item: "itemFailed", batch_item_failed: "itemFailed", batch_validation_failed: "batchValidationFailed", batch_resources_missing: "requestFailed", unsupported_file_type: "unsupportedFileType", invalid_filename: "invalidFilename", lesson_name_too_long: "invalidFilename", audio_empty: "audioEmpty", srt_empty: "srtEmpty", duplicate_audio_file: "duplicateAudio", duplicate_srt_file: "duplicateSrt", audio_too_large: "audioTooLarge", upload_too_large: "audioTooLarge", batch_upload_too_large: "zipTooLarge", srt_too_large: "srtTooLarge", missing_mp3: "missingMp3", missing_srt: "missingSrt", duplicate_slug_in_batch: "duplicateSlugBatch", duplicate_lesson_slug: "duplicateSlugSection", duplicate_canonical_path: "duplicateSlugSection", lesson_canonical_path_exists: "duplicateSlugSection", invalid_audio_duration: "invalidDuration", audio_duration_invalid: "invalidDuration", invalid_audio: "invalidDuration", zip_file_required: "zipRequired", invalid_zip_file: "zipRequired", zip_too_large: "zipTooLarge", zip_extracted_size_exceeded: "zipExtractedTooLarge", too_many_resources: "tooManyResources", too_many_lessons: "tooManyResources", unsafe_zip_path: "unsafeZipPath", resource_staging_failed: "resourceStagingFailed", resource_read_failed: "resourceStagingFailed", staged_resource_missing: "stagedResourceMissing", batch_item_not_processable: "itemNotProcessable", workers_ai_not_configured: "aiImportFailed", workers_ai_model_invalid: "aiImportFailed", workers_ai_failed: "aiImportFailed", alignment_failed: "aiImportFailed", import_failed: "aiImportFailed", import_cleanup_failed: "requestFailed", invalid_import_metadata: "aiImportFailed", title_cannot_create_slug: "invalidFilename", invalid_review: "publishFailed", validation_failed: "publishFailed", audio_missing: "publishFailed", pre_timed_srt_empty: "srtEmpty", pre_timed_srt_sequence_invalid: "invalidSrtSequence", pre_timed_srt_timing_invalid: "invalidSrtTiming", pre_timed_srt_text_missing: "missingSrtText",
};

export function translateAdminImportError(locale: UiLocale, value: string, fallback: AdminImportMessageKey) {
  const codes = value.split(":").map(part => part.trim());
  const code = codes[0];
  const exact = codes.map(part => errorKeys[part]).find(Boolean);
  if (exact) return adminImportT(locale, exact);
  if (code.startsWith("pre_timed_srt_sequence_invalid")) return adminImportT(locale, "invalidSrtSequence");
  if (code.startsWith("pre_timed_srt_timing_invalid") || code.includes("timestamps_")) return adminImportT(locale, "invalidSrtTiming");
  if (code.startsWith("pre_timed_srt_text_missing")) return adminImportT(locale, "missingSrtText");
  if (code.startsWith("pre_timed_srt_") || code === "invalid_srt") return adminImportT(locale, "invalidSrt");
  return adminImportT(locale, "unexpectedError", { fallback: adminImportT(locale, fallback), detail: value });
}

export function adminImportStatus(locale: UiLocale, status: string) {
  const keys: Record<string, AdminImportMessageKey> = { INVALID: "invalid", QUEUED: "queued", PROCESSING: "processingStatus", COMPLETED: "completed", FAILED: "failed" };
  return adminImportT(locale, keys[status] ?? "requestFailed");
}
