import type { UiLocale } from "./types";

const en = {
  title:"Leaderboard", subtitle:"Celebrating learning and community contributions", studyTime:"Study time", translations:"Approved translation contributions",
  last7Days:"Last 7 days", last30Days:"Last 30 days", noActivity:"No qualifying activity in this period yet.", yourPosition:"Your position",
  hoursMinutes:"{hours}h {minutes}m", minutes:"{minutes} min", seconds:"{seconds} sec", sentenceCount:"{count} sentences", loadError:"The leaderboard could not be loaded.", retry:"Retry",
} as const;
type Key = keyof typeof en;
type Messages = Record<Key,string>;
const vi:Messages = {title:"Bảng xếp hạng",subtitle:"Tôn vinh việc học và đóng góp cho cộng đồng",studyTime:"Thời gian học",translations:"Câu dịch đã được duyệt",last7Days:"7 ngày gần nhất",last30Days:"30 ngày gần nhất",noActivity:"Chưa có hoạt động hợp lệ trong khoảng thời gian này.",yourPosition:"Vị trí của bạn",hoursMinutes:"{hours} giờ {minutes} phút",minutes:"{minutes} phút",seconds:"{seconds} giây",sentenceCount:"{count} câu",loadError:"Không thể tải bảng xếp hạng.",retry:"Thử lại"};
const zh:Messages = {title:"排行榜",subtitle:"表彰学习与社区翻译贡献",studyTime:"学习时长",translations:"已审核翻译贡献",last7Days:"最近 7 天",last30Days:"最近 30 天",noActivity:"此时间段内暂无有效活动。",yourPosition:"你的排名",hoursMinutes:"{hours} 小时 {minutes} 分钟",minutes:"{minutes} 分钟",seconds:"{seconds} 秒",sentenceCount:"{count} 句",loadError:"无法加载排行榜。",retry:"重试"};
const ja:Messages = {title:"ランキング",subtitle:"学習とコミュニティ翻訳への貢献",studyTime:"学習時間",translations:"承認済み翻訳の貢献",last7Days:"過去7日間",last30Days:"過去30日間",noActivity:"この期間の対象アクティビティはまだありません。",yourPosition:"あなたの順位",hoursMinutes:"{hours}時間 {minutes}分",minutes:"{minutes}分",seconds:"{seconds}秒",sentenceCount:"{count}文",loadError:"ランキングを読み込めませんでした。",retry:"再試行"};
const messages:Record<UiLocale,Messages>={vi,en,zh,ja};
export function leaderboardT(locale:UiLocale,key:Key,values:Record<string,string|number>={}){return Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value)),messages[locale][key]);}
