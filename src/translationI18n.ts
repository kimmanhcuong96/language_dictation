import type { UiLocale } from "./types";

const en = {
  translation:"Translation", targetLanguage:"Translation language", approved:"Approved translation", pending:"Pending review",
  unavailable:"No approved translation is available yet.", contribute:"Contribute a translation", suggestEdit:"Suggest an improvement",
  translationText:"Your translation", submit:"Submit for review", submitting:"Submitting…", submitted:"Your translation is waiting for admin review.",
  addLanguage:"Add another language", selectLanguage:"Select a language", alreadyAdded:"Already added",
  createLanguage:"Add language", cancel:"Cancel", signIn:"Sign in to contribute a translation.", loadError:"Translations could not be loaded.", saveError:"Translation could not be submitted.",
} as const;
export type TranslationMessageKey=keyof typeof en;
type Messages=Record<TranslationMessageKey,string>;
const vi:Messages={translation:"Bản dịch",targetLanguage:"Ngôn ngữ dịch",approved:"Bản dịch đã duyệt",pending:"Đang chờ duyệt",unavailable:"Chưa có bản dịch được duyệt.",contribute:"Đóng góp bản dịch",suggestEdit:"Đề xuất chỉnh sửa",translationText:"Bản dịch của bạn",submit:"Gửi để duyệt",submitting:"Đang gửi…",submitted:"Bản dịch của bạn đang chờ admin duyệt.",addLanguage:"Thêm ngôn ngữ khác",selectLanguage:"Chọn ngôn ngữ",alreadyAdded:"Đã thêm",createLanguage:"Thêm ngôn ngữ",cancel:"Hủy",signIn:"Đăng nhập để đóng góp bản dịch.",loadError:"Không thể tải bản dịch.",saveError:"Không thể gửi bản dịch."};
const zh:Messages={translation:"翻译",targetLanguage:"目标语言",approved:"已批准的翻译",pending:"等待审核",unavailable:"暂无已批准的翻译。",contribute:"贡献翻译",suggestEdit:"建议改进",translationText:"你的翻译",submit:"提交审核",submitting:"提交中…",submitted:"你的翻译正在等待管理员审核。",addLanguage:"添加其他语言",selectLanguage:"选择语言",alreadyAdded:"已添加",createLanguage:"添加语言",cancel:"取消",signIn:"登录后即可贡献翻译。",loadError:"无法加载翻译。",saveError:"无法提交翻译。"};
const ja:Messages={translation:"翻訳",targetLanguage:"翻訳言語",approved:"承認済みの翻訳",pending:"審査待ち",unavailable:"承認済みの翻訳はまだありません。",contribute:"翻訳を投稿",suggestEdit:"改善を提案",translationText:"あなたの翻訳",submit:"審査に送信",submitting:"送信中…",submitted:"翻訳は管理者の審査待ちです。",addLanguage:"別の言語を追加",selectLanguage:"言語を選択",alreadyAdded:"追加済み",createLanguage:"言語を追加",cancel:"キャンセル",signIn:"翻訳を投稿するにはログインしてください。",loadError:"翻訳を読み込めませんでした。",saveError:"翻訳を送信できませんでした。"};
const messages:Record<UiLocale,Messages>={vi,en,zh,ja};
export const translationT=(locale:UiLocale,key:TranslationMessageKey)=>messages[locale][key];
