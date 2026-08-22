import type { UiLocale } from "./types";

const en = {
  title: "Sentence comments",
  sentence: "Sentence {number}",
  placeholder: "Share a short comment about this sentence…",
  post: "Post comment",
  posting: "Posting…",
  signInPrompt: "Sign in to leave a comment. Comments are public.",
  signIn: "Sign in",
  blocked: "Your account is blocked from posting comments. You can still read existing discussions.",
  empty: "No comments for this sentence yet.",
  loadError: "Comments could not be loaded.",
  retry: "Retry",
  loadMore: "Load more comments",
  loadingMore: "Loading…",
  delete: "Delete comment",
  deleteConfirm: "Delete this comment permanently?",
  deleteError: "The comment could not be deleted.",
  postError: "The comment could not be posted.",
  rateLimited: "You are commenting too quickly. Please wait and try again.",
  report: "Report comment",
  reportReason: "Why are you reporting this comment? (optional)",
  reportSuccess: "Thank you. The comment was reported.",
  reportError: "The comment could not be reported.",
  characterCount: "{count}/{max} characters",
} as const;

export type SentenceCommentsMessageKey = keyof typeof en;
type Messages = Record<SentenceCommentsMessageKey, string>;

const vi: Messages = {
  report: "Báo cáo bình luận",
  reportReason: "Vì sao bạn báo cáo bình luận này? (không bắt buộc)",
  reportSuccess: "Cảm ơn bạn. Bình luận đã được báo cáo.",
  reportError: "Không thể báo cáo bình luận.",
  title: "Bình luận về câu",
  sentence: "Câu {number}",
  placeholder: "Chia sẻ bình luận ngắn về câu này…",
  post: "Đăng bình luận",
  posting: "Đang đăng…",
  signInPrompt: "Đăng nhập để bình luận. Bình luận sẽ hiển thị công khai.",
  signIn: "Đăng nhập",
  blocked: "Tài khoản của bạn đã bị chặn đăng bình luận. Bạn vẫn có thể đọc các thảo luận hiện có.",
  empty: "Chưa có bình luận cho câu này.",
  loadError: "Không thể tải bình luận.",
  retry: "Thử lại",
  loadMore: "Xem thêm bình luận",
  loadingMore: "Đang tải…",
  delete: "Xóa bình luận",
  deleteConfirm: "Xóa vĩnh viễn bình luận này?",
  deleteError: "Không thể xóa bình luận.",
  postError: "Không thể đăng bình luận.",
  rateLimited: "Bạn đang bình luận quá nhanh. Vui lòng chờ rồi thử lại.",
  characterCount: "{count}/{max} ký tự",
};

const zh: Messages = {
  report: "举报评论",
  reportReason: "为什么举报此评论？（可选）",
  reportSuccess: "谢谢。评论已举报。",
  reportError: "无法举报评论。",
  title: "句子评论",
  sentence: "第 {number} 句",
  placeholder: "分享一条关于此句的简短评论…",
  post: "发表评论",
  posting: "正在发表…",
  signInPrompt: "登录后即可评论。评论将公开显示。",
  signIn: "登录",
  blocked: "你的账户已被禁止发表评论，但仍可阅读现有讨论。",
  empty: "此句暂无评论。",
  loadError: "无法加载评论。",
  retry: "重试",
  loadMore: "加载更多评论",
  loadingMore: "加载中…",
  delete: "删除评论",
  deleteConfirm: "永久删除此评论？",
  deleteError: "无法删除评论。",
  postError: "无法发表评论。",
  rateLimited: "评论过于频繁，请稍后再试。",
  characterCount: "{count}/{max} 个字符",
};

const ja: Messages = {
  report: "コメントを報告",
  reportReason: "このコメントを報告する理由は何ですか？（任意）",
  reportSuccess: "ありがとうございます。報告が送信されました。",
  reportError: "コメントを報告できませんでした。",
  title: "文へのコメント",
  sentence: "文 {number}",
  placeholder: "この文について短いコメントを共有…",
  post: "コメントを投稿",
  posting: "投稿中…",
  signInPrompt: "コメントするにはログインしてください。コメントは公開されます。",
  signIn: "ログイン",
  blocked: "このアカウントはコメント投稿を制限されています。既存のコメントは引き続き閲覧できます。",
  empty: "この文にはまだコメントがありません。",
  loadError: "コメントを読み込めませんでした。",
  retry: "再試行",
  loadMore: "コメントをさらに表示",
  loadingMore: "読み込み中…",
  delete: "コメントを削除",
  deleteConfirm: "このコメントを完全に削除しますか？",
  deleteError: "コメントを削除できませんでした。",
  postError: "コメントを投稿できませんでした。",
  rateLimited: "コメントの投稿が速すぎます。しばらく待ってから再試行してください。",
  characterCount: "{count}/{max}文字",
};

const messages: Record<UiLocale, Messages> = { en, vi, zh, ja };

export function sentenceCommentsT(locale: UiLocale, key: SentenceCommentsMessageKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), messages[locale][key]);
}

export const sentenceCommentsMessages = messages;
