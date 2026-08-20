import type { UiLocale } from "./types";
import { getTranslationImportLanguage } from "./lib/translationImport";
import { translationImportT } from "./translationImportI18n";

const en = {
  pageTitle: "Lesson Import",
  home: "Home",
  loading: "Loading…",
  adminRequired: "Administrator access is required.",
  manageLessons: "Manage existing lessons",


  targetSection: "Target section",
  createSection: "Create section",
  newSection: "New section",
  category: "Category",
  sectionTitle: "Section name",
  sectionDescription: "Description (optional)",
  creatingSection: "Creating…",
  cancelCreateSection: "Cancel",
  sectionCreated: "Section created and selected.",
  createSectionFailed: "Unable to create the section.",
  level: "Level (optional)",




  processing: "Processing…",




  inputMethod: "Input method",
  directFiles: "MP3 + SRT files",
  zipArchive: "ZIP archive",
  lessonResources: "Lesson resources",
  directFilesHint: "Use matching NN_<lesson-name>.mp3 and NN_<lesson-name>.srt files (01–99), with optional NN_<lesson-name>.<language>.txt translations.",
  zipHint: "Every lesson in the ZIP must use the NN_ prefix. Invalid lessons do not block valid lessons.",
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
  translationsLabel: "Translations",
  loadSectionsFailed: "Unable to load sections.",


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
  pageTitle: "Nhập bài học", home: "Trang chủ", loading: "Đang tải…", adminRequired: "Bạn cần quyền quản trị viên.", manageLessons: "Quản lý bài học hiện có", targetSection: "Section đích", createSection: "Tạo Section", newSection: "Section mới", category: "Category", sectionTitle: "Tên Section", sectionDescription: "Mô tả (không bắt buộc)", creatingSection: "Đang tạo…", cancelCreateSection: "Hủy", sectionCreated: "Đã tạo và chọn Section mới.", createSectionFailed: "Không thể tạo Section.", level: "Cấp độ (không bắt buộc)", processing: "Đang xử lý…", inputMethod: "Phương thức nhập", directFiles: "File MP3 + SRT", zipArchive: "File ZIP", lessonResources: "Tài nguyên bài học", directFilesHint: "Dùng các cặp NN_<tên-bài>.mp3 và NN_<tên-bài>.srt (01–99), có thể kèm NN_<tên-bài>.<ngôn-ngữ>.txt.", zipHint: "Mọi bài trong ZIP phải có tiền tố NN_; bài lỗi không chặn các bài hợp lệ.", validatePreview: "Kiểm tra và xem trước", validating: "Đang kiểm tra…", batchValidation: "Kết quả kiểm tra batch", newBatch: "Batch mới", total: "Tổng", valid: "Hợp lệ", invalid: "Không hợp lệ", completed: "Hoàn tất", failed: "Thất bại", remaining: "Còn lại", queued: "Chờ xử lý", processingStatus: "Đang xử lý", confirmImport: "Xác nhận nhập {count} bài hợp lệ", importing: "Đang nhập…", resumeImport: "Tiếp tục nhập", retryFailed: "Thử lại bài lỗi", missingMp3: "Thiếu MP3", missingSrt: "Thiếu SRT", slug: "Slug", duration: "Thời lượng", segments: "Số đoạn", translationsLabel: "Bản dịch", loadSectionsFailed: "Không thể tải danh sách section.", batchValidationFailed: "Kiểm tra batch thất bại.", itemFailed: "Một bài học nhập thất bại.", batchProcessingFailed: "Xử lý batch thất bại.", requestFailed: "Yêu cầu thất bại.", unsupportedFileType: "Loại file không được hỗ trợ.", invalidFilename: "Tên file không thể dùng làm tên bài học.", audioEmpty: "File MP3 rỗng.", srtEmpty: "File SRT rỗng hoặc không có cue.", duplicateAudio: "Có nhiều MP3 trùng basename.", duplicateSrt: "Có nhiều SRT trùng basename.", audioTooLarge: "File MP3 vượt quá giới hạn dung lượng.", srtTooLarge: "File SRT vượt quá giới hạn dung lượng.", duplicateSlugBatch: "Một bài khác trong batch có cùng slug.", duplicateSlugSection: "Section này đã có bài học cùng slug.", invalidDuration: "Thời lượng audio không hợp lệ hoặc không đọc được.", invalidSrt: "File SRT sai định dạng hoặc có timestamp không hợp lệ.", invalidSrtSequence: "Số thứ tự cue SRT phải liên tục từ 1.", invalidSrtTiming: "Timestamp SRT phải đúng thứ tự, không chồng lấn và nằm trong thời lượng audio.", missingSrtText: "Mỗi cue SRT phải có nội dung.", unsafeZipPath: "File ZIP chứa đường dẫn không an toàn.", zipRequired: "Hãy chọn file ZIP.", zipTooLarge: "File ZIP vượt quá giới hạn dung lượng.", zipExtractedTooLarge: "Dung lượng sau giải nén vượt quá giới hạn.", tooManyResources: "Input chứa quá nhiều file.", resourceStagingFailed: "Không thể lưu tạm tài nguyên đã upload.", stagedResourceMissing: "Tài nguyên tạm của batch không còn tồn tại. Hãy tạo batch mới.", itemNotProcessable: "Bài học không thể xử lý ở trạng thái hiện tại.", unexpectedError: "{fallback} Chi tiết kỹ thuật: {detail}",
};

const zh: Messages = {
  pageTitle: "导入课程", home: "首页", loading: "加载中…", adminRequired: "需要管理员权限。", manageLessons: "管理现有课程", targetSection: "目标章节", createSection: "创建章节", newSection: "新章节", category: "分类", sectionTitle: "章节名称", sectionDescription: "描述（可选）", creatingSection: "创建中…", cancelCreateSection: "取消", sectionCreated: "新章节已创建并选中。", createSectionFailed: "无法创建章节。", level: "级别（可选）", processing: "处理中…", inputMethod: "导入方式", directFiles: "MP3 + SRT 文件", zipArchive: "ZIP 压缩包", lessonResources: "课程资源", directFilesHint: "使用匹配的 NN_<课程名>.mp3 和 NN_<课程名>.srt（01–99），可选添加 NN_<课程名>.<语言>.txt。", zipHint: "ZIP 中每个课程都必须使用 NN_ 前缀；无效课程不会阻止有效课程。", validatePreview: "验证并预览", validating: "验证中…", batchValidation: "批量导入验证", newBatch: "新批次", total: "总数", valid: "有效", invalid: "无效", completed: "已完成", failed: "失败", remaining: "剩余", queued: "排队中", processingStatus: "处理中", confirmImport: "确认导入 {count} 个有效课程", importing: "导入中…", resumeImport: "继续导入", retryFailed: "重试失败项", missingMp3: "缺少 MP3", missingSrt: "缺少 SRT", slug: "Slug", duration: "时长", segments: "片段数", translationsLabel: "翻译", loadSectionsFailed: "无法加载章节。", batchValidationFailed: "批次验证失败。", itemFailed: "一个课程导入失败。", batchProcessingFailed: "批次处理失败。", requestFailed: "请求失败。", unsupportedFileType: "不支持的文件类型。", invalidFilename: "文件名不能作为课程名称。", audioEmpty: "MP3 文件为空。", srtEmpty: "SRT 文件为空或没有字幕条目。", duplicateAudio: "存在多个同名 MP3。", duplicateSrt: "存在多个同名 SRT。", audioTooLarge: "MP3 文件超过大小限制。", srtTooLarge: "SRT 文件超过大小限制。", duplicateSlugBatch: "此批次中存在相同 slug 的课程。", duplicateSlugSection: "目标章节中已存在相同 slug 的课程。", invalidDuration: "音频时长无效或无法读取。", invalidSrt: "SRT 格式或时间戳无效。", invalidSrtSequence: "SRT 序号必须从 1 开始连续排列。", invalidSrtTiming: "SRT 时间戳必须有序、不重叠且在音频时长内。", missingSrtText: "每个 SRT 条目都必须包含文本。", unsafeZipPath: "ZIP 包含不安全路径。", zipRequired: "请选择 ZIP 文件。", zipTooLarge: "ZIP 文件超过大小限制。", zipExtractedTooLarge: "ZIP 解压后的大小超过限制。", tooManyResources: "输入文件数量过多。", resourceStagingFailed: "无法暂存上传资源。", stagedResourceMissing: "暂存资源已丢失，请新建批次。", itemNotProcessable: "该课程当前状态无法处理。", unexpectedError: "{fallback} 技术详情：{detail}",
};

const ja: Messages = {
  pageTitle: "レッスンのインポート", home: "ホーム", loading: "読み込み中…", adminRequired: "管理者権限が必要です。", manageLessons: "既存レッスンを管理", targetSection: "対象セクション", createSection: "セクションを作成", newSection: "新しいセクション", category: "カテゴリー", sectionTitle: "セクション名", sectionDescription: "説明（任意）", creatingSection: "作成中…", cancelCreateSection: "キャンセル", sectionCreated: "新しいセクションを作成して選択しました。", createSectionFailed: "セクションを作成できませんでした。", level: "レベル（任意）", processing: "処理中…", inputMethod: "入力方法", directFiles: "MP3 + SRT ファイル", zipArchive: "ZIP アーカイブ", lessonResources: "レッスン素材", directFilesHint: "一致する NN_<レッスン名>.mp3 と NN_<レッスン名>.srt（01–99）、および任意の NN_<レッスン名>.<言語>.txt を使用します。", zipHint: "ZIP 内の全レッスンに NN_ 接頭辞が必要です。無効なレッスンは有効なレッスンを妨げません。", validatePreview: "検証してプレビュー", validating: "検証中…", batchValidation: "一括インポート検証", newBatch: "新しいバッチ", total: "合計", valid: "有効", invalid: "無効", completed: "完了", failed: "失敗", remaining: "残り", queued: "待機中", processingStatus: "処理中", confirmImport: "有効な{count}件をインポート", importing: "インポート中…", resumeImport: "インポートを再開", retryFailed: "失敗項目を再試行", missingMp3: "MP3がありません", missingSrt: "SRTがありません", slug: "Slug", duration: "再生時間", segments: "区間数", translationsLabel: "翻訳", loadSectionsFailed: "セクションを読み込めません。", batchValidationFailed: "バッチ検証に失敗しました。", itemFailed: "レッスンのインポートに失敗しました。", batchProcessingFailed: "バッチ処理に失敗しました。", requestFailed: "リクエストに失敗しました。", unsupportedFileType: "未対応のファイル形式です。", invalidFilename: "ファイル名をレッスン名として使用できません。", audioEmpty: "MP3ファイルが空です。", srtEmpty: "SRTが空か、字幕がありません。", duplicateAudio: "同じベース名のMP3が複数あります。", duplicateSrt: "同じベース名のSRTが複数あります。", audioTooLarge: "MP3がサイズ上限を超えています。", srtTooLarge: "SRTがサイズ上限を超えています。", duplicateSlugBatch: "バッチ内に同じslugのレッスンがあります。", duplicateSlugSection: "対象セクションに同じslugのレッスンがあります。", invalidDuration: "音声時間が無効か読み取れません。", invalidSrt: "SRT形式またはタイムスタンプが不正です。", invalidSrtSequence: "SRT番号は1から連続している必要があります。", invalidSrtTiming: "SRTの時刻は順序どおりで重複せず、音声時間内である必要があります。", missingSrtText: "すべてのSRTキューにテキストが必要です。", unsafeZipPath: "ZIPに安全でないパスが含まれています。", zipRequired: "ZIPファイルを選択してください。", zipTooLarge: "ZIPがサイズ上限を超えています。", zipExtractedTooLarge: "展開後のZIPがサイズ上限を超えています。", tooManyResources: "入力ファイルが多すぎます。", resourceStagingFailed: "アップロード素材を一時保存できません。", stagedResourceMissing: "一時保存した素材がありません。新しいバッチを作成してください。", itemNotProcessable: "この状態のレッスンは処理できません。", unexpectedError: "{fallback} 技術詳細：{detail}",
};

export const adminImportMessages: Record<UiLocale, Messages> = { vi, en, zh, ja };

export function adminImportT(locale: UiLocale, key: AdminImportMessageKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, String(value)), adminImportMessages[locale][key]);
}

const errorKeys: Record<string, AdminImportMessageKey> = {
  request_failed: "requestFailed", content_length_required: "requestFailed", invalid_multipart_form: "requestFailed", invalid_batch_metadata: "requestFailed", invalid_import_resources: "requestFailed", invalid_section: "loadSectionsFailed", invalid_section_metadata: "createSectionFailed", invalid_category: "createSectionFailed", section_create_failed: "createSectionFailed", invalid_batch: "requestFailed", batch_not_confirmable: "batchProcessingFailed", batch_import_failed: "batchProcessingFailed", invalid_batch_item: "itemFailed", batch_item_failed: "itemFailed", batch_validation_failed: "batchValidationFailed", batch_resources_missing: "requestFailed", unsupported_file_type: "unsupportedFileType", invalid_filename: "invalidFilename", invalid_lesson_filename: "invalidFilename", lesson_name_too_long: "invalidFilename", audio_empty: "audioEmpty", srt_empty: "srtEmpty", duplicate_audio_file: "duplicateAudio", duplicate_srt_file: "duplicateSrt", audio_too_large: "audioTooLarge", upload_too_large: "audioTooLarge", batch_upload_too_large: "zipTooLarge", srt_too_large: "srtTooLarge", missing_mp3: "missingMp3", missing_srt: "missingSrt", duplicate_slug_in_batch: "duplicateSlugBatch", duplicate_lesson_slug: "duplicateSlugSection", duplicate_canonical_path: "duplicateSlugSection", lesson_canonical_path_exists: "duplicateSlugSection", lesson_order_or_slug_conflict: "duplicateSlugSection", invalid_audio_duration: "invalidDuration", audio_duration_invalid: "invalidDuration", invalid_audio: "invalidDuration", zip_file_required: "zipRequired", invalid_zip_file: "zipRequired", zip_too_large: "zipTooLarge", zip_extracted_size_exceeded: "zipExtractedTooLarge", too_many_resources: "tooManyResources", too_many_lessons: "tooManyResources", unsafe_zip_path: "unsafeZipPath", resource_staging_failed: "resourceStagingFailed", resource_read_failed: "resourceStagingFailed", staged_resource_missing: "stagedResourceMissing", batch_item_not_processable: "itemNotProcessable", import_cleanup_failed: "requestFailed", title_cannot_create_slug: "invalidFilename", pre_timed_srt_empty: "srtEmpty", pre_timed_srt_sequence_invalid: "invalidSrtSequence", pre_timed_srt_timing_invalid: "invalidSrtTiming", pre_timed_srt_text_missing: "missingSrtText",
};

export function translateAdminImportError(locale: UiLocale, value: string, fallback: AdminImportMessageKey) {
  const codes = value.split(":").map(part => part.trim());
  const code = codes[0];
  const language=getTranslationImportLanguage(codes[1]??"")?.name??codes[1]??"";
  if(code==="translation_blank_line")return `${language}: ${translationImportT(locale,"blankLine",{line:codes[2]??"?"})}`;
  if(code==="translation_line_count_mismatch")return `${language}: ${translationImportT(locale,"lineMismatch",{actual:codes[2]??"?",expected:codes[3]??"?"})}`;
  if(code==="translation_invalid_utf8")return `${language}: ${translationImportT(locale,"invalidUtf8")}`;
  if(code==="translation_empty")return `${language}: ${translationImportT(locale,"missingFile")}`;
  if(code==="translation_too_large")return ({vi:`${language}: File bản dịch vượt quá giới hạn 1 MB.`,en:`${language}: The translation file exceeds the 1 MB limit.`,zh:`${language}：翻译文件超过 1 MB 限制。`,ja:`${language}: 翻訳ファイルが 1 MB の上限を超えています。`})[locale];
  if(code==="invalid_translation_filename")return ({vi:"Tên file bản dịch trong package phải có dạng {tên-bài}.{mã-ngôn-ngữ}.txt.",en:"A package translation filename must use {lesson-name}.{language-code}.txt.",zh:"包内翻译文件名必须使用 {课程名}.{语言代码}.txt。",ja:"パッケージ内の翻訳ファイル名は {レッスン名}.{言語コード}.txt の形式にしてください。"})[locale];
  if(code==="invalid_translation_file")return ({vi:"Hãy chọn một file bản dịch TXT UTF-8 có thể đọc được.",en:"Choose a readable UTF-8 translation TXT file.",zh:"请选择可读取的 UTF-8 翻译 TXT 文件。",ja:"読み取り可能な UTF-8 の翻訳 TXT ファイルを選択してください。"})[locale];
  if(code==="invalid_translation_import")return ({vi:"Mỗi mục bản dịch phải có đúng một ngôn ngữ đích và một file TXT.",en:"Each translation entry must have exactly one target language and one TXT file.",zh:"每个翻译条目必须恰好包含一种目标语言和一个 TXT 文件。",ja:"各翻訳項目には対象言語と TXT ファイルを1つずつ指定してください。"})[locale];
  if(code==="translation_import_too_large")return ({vi:"Tổng dung lượng yêu cầu nhập bản dịch vượt quá giới hạn 5 MB.",en:"The translation import request exceeds the 5 MB limit.",zh:"翻译导入请求超过 5 MB 限制。",ja:"翻訳インポート要求が 5 MB の上限を超えています。"})[locale];
  if(code==="translation_import_conflict")return ({vi:"Bản dịch đã thay đổi trong lúc nhập; hãy tải lại và thử lại.",en:"The translations changed during import; reload and try again.",zh:"导入期间翻译已更改；请刷新后重试。",ja:"インポート中に翻訳が変更されました。再読み込みしてもう一度お試しください。"})[locale];
  if(code==="duplicate_translation_language")return translationImportT(locale,"duplicateLanguage");
  if(code==="unsupported_translation_language")return `${translationImportT(locale,"targetLanguage")}: ${codes[1]??"?"}`;
  if(code==="selected_lesson_not_found")return ({vi:"Bài học đã chọn không tồn tại.",en:"The selected lesson does not exist.",zh:"所选课程不存在。",ja:"選択したレッスンが存在しません。"})[locale];
  if(code==="lesson_sentence_count_invalid")return ({vi:"Số câu của bài học không nhất quán; hãy kiểm tra dữ liệu bài học trước khi nhập.",en:"The lesson sentence count is inconsistent; check the lesson data before importing.",zh:"课程句子数量不一致；请先检查课程数据。",ja:"レッスンの文数が一致しません。先にレッスンデータを確認してください。"})[locale];
  if(code==="translation_language_not_active")return ({vi:"Ngôn ngữ bản dịch hiện không được bật.",en:"The translation language is not currently enabled.",zh:"该翻译语言当前未启用。",ja:"その翻訳言語は現在有効ではありません。"})[locale];
  if(code==="invalid_youtube_url")return ({vi:"File .link.txt phải chứa đúng một URL YouTube HTTPS được hỗ trợ.",en:"The .link.txt file must contain exactly one supported HTTPS YouTube URL.",zh:".link.txt 文件必须仅包含一个受支持的 HTTPS YouTube URL。",ja:".link.txt には対応する HTTPS YouTube URL を1つだけ記載してください。"})[locale];
  if(code==="youtube_link_invalid_utf8")return ({vi:"File .link.txt không phải UTF-8 hợp lệ.",en:"The .link.txt file is not valid UTF-8.",zh:".link.txt 文件不是有效的 UTF-8。",ja:".link.txt ファイルが有効な UTF-8 ではありません。"})[locale];
  if(code==="youtube_link_empty"||code==="missing_youtube_link")return ({vi:"Thiếu file <tên>.link.txt chứa URL YouTube.",en:"The <name>.link.txt YouTube source file is missing or empty.",zh:"缺少或为空的 <名称>.link.txt YouTube 来源文件。",ja:"YouTube ソースの <名前>.link.txt がないか空です。"})[locale];
  if(code==="youtube_link_too_large")return ({vi:"File .link.txt vượt quá giới hạn 1 MB.",en:"The .link.txt file exceeds the 1 MB limit.",zh:".link.txt 文件超过 1 MB 限制。",ja:".link.txt ファイルが 1 MB の上限を超えています。"})[locale];
  if(code==="duplicate_youtube_link_file")return ({vi:"Có nhiều file .link.txt cho cùng một bài học.",en:"More than one .link.txt file targets the same lesson.",zh:"同一课程存在多个 .link.txt 文件。",ja:"同じレッスンに複数の .link.txt ファイルがあります。"})[locale];
  if(code==="names_file_empty"||code==="names_file_missing")return ({vi:"File <lesson>.name.json bị thiếu hoặc rỗng.",en:"The <lesson>.name.json file is missing or empty.",zh:"<lesson>.name.json 文件缺失或为空。",ja:"<lesson>.name.json ファイルがないか空です。"})[locale];
  if(code==="names_file_too_large")return ({vi:"File .name.json vượt quá giới hạn 256 KB.",en:"The .name.json file exceeds the 256 KB limit.",zh:".name.json 文件超过 256 KB 限制。",ja:".name.json ファイルが 256 KB の上限を超えています。"})[locale];
  if(code==="duplicate_names_file")return ({vi:"Có nhiều file .name.json cho cùng một bài học.",en:"More than one .name.json file targets the same lesson.",zh:"同一课程存在多个 .name.json 文件。",ja:"同じレッスンに複数の .name.json ファイルがあります。"})[locale];
  if(code.startsWith("names_"))return ({vi:"File .name.json không hợp lệ hoặc không khớp với các câu trong SRT.",en:"The .name.json file is invalid or does not match the parsed SRT sentences.",zh:".name.json 文件无效或与解析后的 SRT 句子不匹配。",ja:".name.json ファイルが無効か、解析済み SRT の文と一致しません。"})[locale];
  if(code==="conflicting_media_sources")return ({vi:"Một bài học không thể đồng thời có MP3 và .link.txt.",en:"A lesson cannot contain both an MP3 and a .link.txt source.",zh:"一个课程不能同时包含 MP3 和 .link.txt 来源。",ja:"1つのレッスンに MP3 と .link.txt の両方は指定できません。"})[locale];
  if(code==="no_available_lesson_order")return ({vi:"Section không còn thứ tự trống trong khoảng 01–99.",en:"The section has no available lesson order from 01–99.",zh:"该章节在 01–99 范围内没有可用的课程顺序。",ja:"セクションの 01～99 に空き順序がありません。"})[locale];
  if(code==="duplicate_lesson_order")return ({vi:`Trùng thứ tự ${codes[1]} trong batch.`,en:`Order ${codes[1]} is duplicated in this batch.`,zh:`批次中的顺序 ${codes[1]} 重复。`,ja:`バッチ内で順序 ${codes[1]} が重複しています。`})[locale];
  if(code==="lesson_order_conflict")return ({vi:`Section “${codes[2]}”: thứ tự ${codes[1]} đã được dùng bởi bài “${codes[4]??codes[3]}”; file mới: ${codes[5]??"?"}.`,en:`Section “${codes[2]}”: order ${codes[1]} is used by “${codes[4]??codes[3]}”; new file: ${codes[5]??"?"}.`,zh:`章节“${codes[2]}”：顺序 ${codes[1]} 已被“${codes[4]??codes[3]}”使用；新文件：${codes[5]??"?"}。`,ja:`セクション「${codes[2]}」：順序 ${codes[1]} は「${codes[4]??codes[3]}」で使用済みです。新規ファイル：${codes[5]??"?"}。`})[locale];
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
