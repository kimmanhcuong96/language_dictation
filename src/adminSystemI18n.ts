import type { UiLocale } from "./types";

const en = {
  eyebrow: "SYSTEM ADMINISTRATION",
  dashboardTitle: "System administration",
  dashboardIntro: "Choose the area you want to manage.",
  importTitle: "Lesson import",
  importDescription: "Import one lesson with AI or import prepared MP3/SRT lessons in batches.",
  lessonsTitle: "Lesson management",
  lessonsDescription: "Review, edit, publish, or remove lessons and their sentence timing.",
  manage: "Manage",
  adminHome: "Admin dashboard",
  siteHome: "Main site",
  logout: "Log out",
  lightTheme: "Use light theme",
  darkTheme: "Use dark theme",
  account: "Signed-in account",
  loading: "Loading…",
  adminRequired: "Administrator access is required.",
} as const;

export type AdminSystemKey = keyof typeof en;
type Messages = Record<AdminSystemKey, string>;

const vi: Messages = {
  eyebrow: "QUẢN TRỊ HỆ THỐNG", dashboardTitle: "Quản trị hệ thống", dashboardIntro: "Chọn khu vực bạn muốn quản lý.", importTitle: "Nhập bài học", importDescription: "Nhập một bài bằng AI hoặc nhập hàng loạt bài MP3/SRT đã chuẩn bị.", lessonsTitle: "Quản lý bài học", lessonsDescription: "Kiểm tra, chỉnh sửa, xuất bản hoặc xóa bài học và timestamp từng câu.", manage: "Quản lý", adminHome: "Trang quản trị", siteHome: "Về trang chính", logout: "Đăng xuất", lightTheme: "Dùng giao diện sáng", darkTheme: "Dùng giao diện tối", account: "Tài khoản đang đăng nhập", loading: "Đang tải…", adminRequired: "Bạn cần quyền quản trị viên.",
};

const zh: Messages = {
  eyebrow: "系统管理", dashboardTitle: "系统管理", dashboardIntro: "请选择要管理的区域。", importTitle: "导入课程", importDescription: "使用 AI 导入单个课程，或批量导入准备好的 MP3/SRT 课程。", lessonsTitle: "课程管理", lessonsDescription: "检查、编辑、发布或删除课程及句子时间戳。", manage: "管理", adminHome: "管理首页", siteHome: "返回主站", logout: "退出登录", lightTheme: "使用浅色主题", darkTheme: "使用深色主题", account: "当前登录账户", loading: "加载中…", adminRequired: "需要管理员权限。",
};

const ja: Messages = {
  eyebrow: "システム管理", dashboardTitle: "システム管理", dashboardIntro: "管理する項目を選択してください。", importTitle: "レッスンのインポート", importDescription: "AIで1件を取り込むか、準備済みのMP3/SRTを一括インポートします。", lessonsTitle: "レッスン管理", lessonsDescription: "レッスンと文ごとのタイムスタンプを確認、編集、公開、削除します。", manage: "管理", adminHome: "管理ダッシュボード", siteHome: "メインサイトへ", logout: "ログアウト", lightTheme: "ライトテーマを使用", darkTheme: "ダークテーマを使用", account: "ログイン中のアカウント", loading: "読み込み中…", adminRequired: "管理者権限が必要です。",
};

export const adminSystemMessages: Record<UiLocale, Messages> = { vi, en, zh, ja };
export const adminSystemT = (locale: UiLocale, key: AdminSystemKey) => adminSystemMessages[locale][key];
