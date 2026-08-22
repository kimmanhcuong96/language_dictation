import type { UiLocale } from "./types";

export type StaticIconKey = "headphones" | "gauge" | "mic" | "languages" | "trophy" | "bookopen" | "bug" | "sparkles" | "shield" | "users" | "heart" | "mail";

export interface StaticPageItem { icon?: StaticIconKey; heading: string; text: string; }
export interface StaticPageSection { eyebrow?: string; heading: string; kind: "prose" | "cards" | "highlight"; items: StaticPageItem[]; }
export interface StaticPageCta { heading: string; text: string; label: string; href: string; }
export interface StaticPageCopy { eyebrow: string; title: string; navLabel: string; lead: string; sections: StaticPageSection[]; cta: StaticPageCta; }

const about: Record<UiLocale, StaticPageCopy> = {
  vi: {
    eyebrow: "VỀ CHÚNG TÔI",
    title: "Giới thiệu về Me2listen",
    navLabel: "Giới thiệu",
    lead: "Me2listen là nền tảng luyện nghe và chép chính tả (dictation) dành cho người học ngoại ngữ. Chúng tôi tin rằng nghe hiểu là kỹ năng nền tảng nhưng thường bị bỏ quên nhất khi tự học — vì vậy Me2listen được sinh ra để bạn luyện nghe từng câu, gõ lại chính xác, và biến việc luyện tập mỗi ngày thành một thói quen dễ duy trì.",
    sections: [
      { heading: "Vì sao dictation lại hiệu quả", kind: "prose", items: [
        { heading: "", text: "Chép chính tả buộc bạn phải nghe thật kỹ — không chỉ để nắm ý chính mà để bắt được từng từ, từng cách nối âm, từng trọng âm câu. Đây là phương pháp được nhiều người học ngoại ngữ tin dùng từ lâu, vì nó biến việc nghe thụ động thành một bài luyện tập chủ động, có phản hồi tức thì." },
        { heading: "", text: "Mỗi câu bạn gõ sai sẽ được đối chiếu ngay với bản gốc, giúp bạn nhận ra chính xác phần nào mình nghe nhầm — thay vì chỉ ngờ ngợ rằng mình đã hiểu đúng hay chưa." },
      ] },
      { eyebrow: "TÍNH NĂNG", heading: "Những gì bạn có trên Me2listen", kind: "cards", items: [
        { icon: "headphones", heading: "Luyện nghe từng câu", text: "Nội dung được chia nhỏ theo câu, lấy từ audio mp3 và video YouTube thực tế, giúp bạn tập trung vào từng đơn vị nghe thay vì choáng ngợp trước cả đoạn dài." },
        { icon: "gauge", heading: "Tuỳ chỉnh tốc độ và số lần nghe lại", text: "Điều chỉnh tốc độ phát, bật tự động nghe lại, đặt phím tắt riêng — bạn kiểm soát nhịp độ luyện tập theo đúng trình độ của mình." },
        { icon: "mic", heading: "Luyện phát âm sau khi chép", text: "Sau khi hoàn thành câu, bạn có thể đọc to lại và dùng tính năng nhận diện giọng nói để tự kiểm tra phát âm của mình." },
        { icon: "languages", heading: "Xem bản dịch khi cần", text: "Không chắc nghĩa của câu? Bật bản dịch ngay trong lúc luyện, sang nhiều ngôn ngữ khác nhau, mà không phải rời khỏi bài học." },
        { icon: "trophy", heading: "Theo dõi tiến độ và thi đua", text: "Mỗi bài học lưu tiến độ riêng, có thể đánh dấu yêu thích, và so sánh kết quả với cộng đồng qua bảng xếp hạng." },
        { icon: "bookopen", heading: "Đa dạng chủ đề, nhiều trình độ", text: "Từ truyện ngắn, hội thoại hằng ngày đến các đoạn nghe dài hơn, trải dài từ trình độ A1 đến B2." },
      ] },
      { heading: "Triết lý của chúng tôi", kind: "prose", items: [
        { heading: "", text: "Me2listen không cố gắng dạy bạn mọi thứ cùng lúc. Chúng tôi tin vào việc luyện tập đều đặn, từng câu một, thay vì học dồn dập rồi bỏ cuộc giữa chừng. Ứng dụng miễn phí để bắt đầu, vì chúng tôi muốn một khả năng nghe tốt hơn có thể đến với bất kỳ ai, không phụ thuộc vào khả năng chi trả." },
        { heading: "", text: "Me2listen vẫn đang phát triển từng ngày, với sự đóng góp từ chính cộng đồng học viên và những nhà sáng tạo nội dung mà chúng tôi luôn trân trọng." },
      ] },
    ],
    cta: { heading: "Sẵn sàng luyện nghe chưa?", text: "Chọn một chủ đề và bắt đầu buổi luyện nghe đầu tiên của bạn ngay hôm nay.", label: "Bắt đầu học", href: "/en" },
  },
  en: {
    eyebrow: "ABOUT US",
    title: "About Me2listen",
    navLabel: "About",
    lead: "Me2listen is a listening and dictation practice platform built for language learners. We believe listening comprehension is a foundational skill that's too often neglected in self-study — so Me2listen was built to let you listen sentence by sentence, type back exactly what you hear, and turn daily practice into a habit that actually sticks.",
    sections: [
      { heading: "Why dictation works", kind: "prose", items: [
        { heading: "", text: "Dictation forces you to listen closely — not just for the gist, but for every word, every linking sound, every stress pattern. It's a method language learners have relied on for a long time, because it turns passive listening into an active exercise with instant feedback." },
        { heading: "", text: "Every sentence you get wrong is checked against the original right away, so you know exactly which part you misheard — instead of just guessing whether you understood correctly." },
      ] },
      { eyebrow: "FEATURES", heading: "What you get with Me2listen", kind: "cards", items: [
        { icon: "headphones", heading: "Sentence-by-sentence listening", text: "Content is broken down into individual sentences, sourced from real mp3 audio and YouTube videos, so you can focus on one unit of listening at a time instead of an overwhelming block of audio." },
        { icon: "gauge", heading: "Adjustable speed and replays", text: "Change the playback speed, turn on auto-replay, set your own shortcut keys — you control the pace of practice to match your level." },
        { icon: "mic", heading: "Pronunciation practice after each sentence", text: "Once you've completed a sentence, read it aloud and use speech recognition to check your own pronunciation." },
        { icon: "languages", heading: "Translation whenever you need it", text: "Not sure what a sentence means? Turn on translation right inside the lesson, in multiple languages, without ever leaving the exercise." },
        { icon: "trophy", heading: "Progress tracking and friendly competition", text: "Every lesson keeps its own progress, can be starred as a favorite, and your results can be compared with the community on the leaderboard." },
        { icon: "bookopen", heading: "A wide range of topics and levels", text: "From short stories and daily conversations to longer listening passages, spanning levels A1 through B2." },
      ] },
      { heading: "Our philosophy", kind: "prose", items: [
        { heading: "", text: "Me2listen isn't trying to teach you everything at once. We believe in steady, sentence-by-sentence practice over cramming and burning out. It's free to get started, because we want better listening skills to be available to anyone, regardless of what they can afford." },
        { heading: "", text: "Me2listen keeps growing every day, thanks to contributions from our learning community and the content creators we deeply value." },
      ] },
    ],
    cta: { heading: "Ready to start listening?", text: "Pick a topic and begin your first listening session today.", label: "Start learning", href: "/en" },
  },
  zh: {
    eyebrow: "关于我们",
    title: "关于 Me2listen",
    navLabel: "关于我们",
    lead: "Me2listen 是一个专为语言学习者打造的听力与听写练习平台。我们相信，听力理解是自学过程中最容易被忽视、却又最基础的技能——因此 Me2listen 让你逐句聆听、准确输入所听到的内容，并把每天的练习变成一种容易坚持的习惯。",
    sections: [
      { heading: "为什么听写练习有效", kind: "prose", items: [
        { heading: "", text: "听写要求你非常专注地聆听——不只是理解大意，而是要捕捉每一个单词、每一处连读、每一个句子重音。这是许多语言学习者长期信赖的方法，因为它把被动的听变成了有即时反馈的主动练习。" },
        { heading: "", text: "每当你输入错误，系统都会立刻与原文对照，让你准确知道自己到底听错了哪一部分，而不是仅仅猜测自己是否理解对了。" },
      ] },
      { eyebrow: "功能特色", heading: "Me2listen 能为你做什么", kind: "cards", items: [
        { icon: "headphones", heading: "逐句精听", text: "课程内容按句子拆分，取材于真实的 mp3 音频和 YouTube 视频，让你专注于每一个听力单元，而不是被一整段长音频压垮。" },
        { icon: "gauge", heading: "自由调整速度与重播", text: "调整播放速度、开启自动重播、设置专属快捷键——练习的节奏完全由你掌控。" },
        { icon: "mic", heading: "听写后练习发音", text: "完成一句听写后，你可以大声朗读，并借助语音识别功能检查自己的发音。" },
        { icon: "languages", heading: "随时查看翻译", text: "不确定句子的意思？可以直接在课程中开启多语言翻译，无需离开练习界面。" },
        { icon: "trophy", heading: "记录进度，友好竞技", text: "每节课都会单独保存进度，可以标记为收藏，还能在排行榜上与其他学习者比较成绩。" },
        { icon: "bookopen", heading: "丰富主题与多种级别", text: "从短篇故事、日常对话，到篇幅更长的听力材料，涵盖 A1 到 B2 各个级别。" },
      ] },
      { heading: "我们的理念", kind: "prose", items: [
        { heading: "", text: "Me2listen 不追求让你一次学完所有内容。我们相信持续、逐句的练习，而不是临时抱佛脚后半途而废。产品免费即可开始使用，因为我们希望更好的听力能力不该被经济能力所限制。" },
        { heading: "", text: "Me2listen 仍在每天不断成长，这离不开学习社区成员以及我们始终珍视的内容创作者们的贡献。" },
      ] },
    ],
    cta: { heading: "准备好开始练习了吗？", text: "选择一个主题，今天就开始你的第一次听力练习吧。", label: "开始学习", href: "/en" },
  },
  ja: {
    eyebrow: "私たちについて",
    title: "Me2listenについて",
    navLabel: "概要",
    lead: "Me2listenは、語学学習者のためのリスニング＆ディクテーション練習プラットフォームです。リスニング力は独学において見落とされがちですが、実はもっとも基礎となるスキルだと私たちは考えています。だからこそMe2listenは、一文ずつ聞き取り、聞こえた内容を正確に入力し、毎日の練習を無理なく続けられる習慣に変えることを目指して作られました。",
    sections: [
      { heading: "ディクテーションが効果的な理由", kind: "prose", items: [
        { heading: "", text: "ディクテーションでは、大意をつかむだけでなく、一つひとつの単語、音のつながり、文の強勢まで注意深く聞き取る必要があります。これは多くの語学学習者に長く支持されてきた方法です。受動的なリスニングを、即座にフィードバックが得られる能動的な練習に変えてくれるからです。" },
        { heading: "", text: "入力を間違えた文はすぐに原文と照らし合わされるので、「理解できたかどうか」を漠然と感じるのではなく、「どこを聞き間違えたのか」を正確に知ることができます。" },
      ] },
      { eyebrow: "機能", heading: "Me2listenでできること", kind: "cards", items: [
        { icon: "headphones", heading: "一文ずつのリスニング", text: "コンテンツは文単位に分割され、実際のmp3音声やYouTube動画から作られているので、長い音声に圧倒されることなく、一つのリスニング単位に集中できます。" },
        { icon: "gauge", heading: "速度と再生回数を自由に調整", text: "再生速度の変更、自動リプレイ、独自のショートカットキー設定など、自分のレベルに合わせて練習のペースをコントロールできます。" },
        { icon: "mic", heading: "ディクテーション後の発音練習", text: "文を完成させたあとは声に出して読み、音声認識機能を使って自分の発音を確認できます。" },
        { icon: "languages", heading: "必要なときに翻訳を確認", text: "文の意味がわからないときは、レッスンを離れることなく、その場で複数言語の翻訳を表示できます。" },
        { icon: "trophy", heading: "進捗管理と楽しい競い合い", text: "各レッスンの進捗は個別に保存され、お気に入り登録もでき、ランキングでコミュニティと成果を比較できます。" },
        { icon: "bookopen", heading: "豊富なトピックとレベル", text: "短編ストーリーや日常会話から、より長いリスニング素材まで、A1からB2までのレベルをカバーしています。" },
      ] },
      { heading: "私たちの考え方", kind: "prose", items: [
        { heading: "", text: "Me2listenは、すべてを一度に教え込もうとはしません。詰め込んで燃え尽きるのではなく、一文ずつ着実に練習を続けることを大切にしています。無料で始められるのは、支払い能力に関係なく、誰もがより良いリスニング力を身につけられるようにしたいと考えているからです。" },
        { heading: "", text: "Me2listenは、学習コミュニティの皆さまや、私たちが常に大切にしているコンテンツクリエイターの方々のご協力のもと、今日も成長を続けています。" },
      ] },
    ],
    cta: { heading: "リスニングを始める準備はできましたか？", text: "トピックを選んで、今日最初のリスニング練習を始めましょう。", label: "学習を始める", href: "/en" },
  },
};

const contact: Record<UiLocale, StaticPageCopy> = {
  vi: {
    eyebrow: "LIÊN HỆ",
    title: "Liên hệ với Me2listen",
    navLabel: "Liên hệ",
    lead: "Mọi phản hồi từ bạn đều giúp Me2listen tốt hơn mỗi ngày. Dù là một lỗi nhỏ, một ý tưởng cho bài học mới, hay đơn giản là một lời chào — chúng tôi luôn sẵn sàng lắng nghe.",
    sections: [
      { heading: "Email hỗ trợ", kind: "highlight", items: [
        { icon: "mail", heading: "me2talk.support@gmail.com", text: "Đây là kênh liên hệ chính thức duy nhất của Me2listen. Chúng tôi đọc từng email và cố gắng phản hồi trong thời gian sớm nhất có thể." },
      ] },
      { eyebrow: "CHÚNG TÔI CÓ THỂ GIÚP GÌ", heading: "Bạn có thể liên hệ với chúng tôi về", kind: "cards", items: [
        { icon: "bug", heading: "Báo lỗi kỹ thuật", text: "Bạn gặp lỗi khi phát âm thanh, video, hoặc nội dung bài học hiển thị sai? Hãy mô tả cụ thể trang nào, bài nào, thiết bị hoặc trình duyệt bạn dùng để chúng tôi xử lý nhanh hơn." },
        { icon: "sparkles", heading: "Đề xuất bài học mới", text: "Có chủ đề bạn muốn luyện nghe mà chưa thấy trên Me2listen? Hãy gửi gợi ý cho chúng tôi — nhiều bài học hiện tại đến từ chính đề xuất của người học." },
        { icon: "shield", heading: "Câu hỏi về bản quyền nội dung", text: "Nếu bạn là tác giả hoặc đại diện của nội dung đang được sử dụng trên Me2listen và có thắc mắc, vui lòng liên hệ để chúng tôi cùng trao đổi." },
        { icon: "users", heading: "Hợp tác và đồng hành", text: "Muốn hợp tác phát triển nội dung, giới thiệu Me2listen tới cộng đồng học ngôn ngữ, hay đơn giản là đóng góp ý tưởng — chúng tôi luôn sẵn lòng đón nhận." },
      ] },
    ],
    cta: { heading: "Sẵn sàng nhắn cho chúng tôi?", text: "Chúng tôi thường phản hồi trong vòng vài ngày làm việc.", label: "Gửi email cho chúng tôi", href: "mailto:me2talk.support@gmail.com" },
  },
  en: {
    eyebrow: "CONTACT",
    title: "Contact us",
    navLabel: "Contact",
    lead: "Every piece of feedback helps Me2listen get a little better. Whether it's a small bug, an idea for a new lesson, or just a hello — we'd genuinely love to hear from you.",
    sections: [
      { heading: "Support email", kind: "highlight", items: [
        { icon: "mail", heading: "me2talk.support@gmail.com", text: "This is Me2listen's one and only official contact channel. We read every email and do our best to reply as soon as we can." },
      ] },
      { eyebrow: "HOW WE CAN HELP", heading: "What you can reach us about", kind: "cards", items: [
        { icon: "bug", heading: "Reporting a technical issue", text: "Found a problem with audio, video, or a lesson that isn't displaying correctly? Let us know which page, which lesson, and which device or browser you're using so we can fix it faster." },
        { icon: "sparkles", heading: "Suggesting a new lesson", text: "Is there a topic you'd like to practice that isn't on Me2listen yet? Send us the idea — many of our current lessons started as a learner's suggestion." },
        { icon: "shield", heading: "Content usage questions", text: "If you're the creator or rights holder of content used on Me2listen and have a question, please reach out so we can talk it through together." },
        { icon: "users", heading: "Collaboration and partnerships", text: "Want to help build content, introduce Me2listen to your learning community, or simply share an idea — we're always glad to hear from you." },
      ] },
    ],
    cta: { heading: "Ready to reach out?", text: "We typically reply within a few business days.", label: "Email us", href: "mailto:me2talk.support@gmail.com" },
  },
  zh: {
    eyebrow: "联系我们",
    title: "联系我们",
    navLabel: "联系我们",
    lead: "你的每一条反馈都能让 Me2listen 变得更好一点。无论是一个小小的错误、一个新课程的想法，还是只是想打个招呼——我们都非常乐意听到你的声音。",
    sections: [
      { heading: "支持邮箱", kind: "highlight", items: [
        { icon: "mail", heading: "me2talk.support@gmail.com", text: "这是 Me2listen 唯一的官方联系渠道。我们会认真阅读每一封邮件，并尽快回复。" },
      ] },
      { eyebrow: "我们能帮你什么", heading: "你可以联系我们的事项", kind: "cards", items: [
        { icon: "bug", heading: "报告技术问题", text: "发现音频、视频播放异常，或课程内容显示有误？请告诉我们具体是哪个页面、哪节课程，以及你使用的设备或浏览器，以便我们更快处理。" },
        { icon: "sparkles", heading: "建议新课程", text: "有想练习但 Me2listen 上还没有的主题吗？欢迎告诉我们——目前不少课程正是来自学习者的建议。" },
        { icon: "shield", heading: "内容使用相关问题", text: "如果你是 Me2listen 上所使用内容的创作者或权利人，并对此有任何疑问，欢迎与我们联系沟通。" },
        { icon: "users", heading: "合作与共建", text: "无论是想参与内容共建、把 Me2listen 推荐给你的学习社区，还是单纯想分享一个想法——我们都非常欢迎。" },
      ] },
    ],
    cta: { heading: "准备好联系我们了吗？", text: "我们通常会在几个工作日内回复。", label: "给我们发邮件", href: "mailto:me2talk.support@gmail.com" },
  },
  ja: {
    eyebrow: "お問い合わせ",
    title: "お問い合わせ",
    navLabel: "お問い合わせ",
    lead: "皆さまからのご意見が、Me2listenを少しずつ良くしていきます。小さな不具合の報告でも、新しいレッスンのアイデアでも、ちょっとした挨拶でも構いません。ぜひお聞かせください。",
    sections: [
      { heading: "サポートメール", kind: "highlight", items: [
        { icon: "mail", heading: "me2talk.support@gmail.com", text: "こちらがMe2listen唯一の公式連絡先です。いただいたメールはすべて目を通し、できる限り早くご返信するよう努めています。" },
      ] },
      { eyebrow: "お手伝いできること", heading: "お問い合わせいただける内容", kind: "cards", items: [
        { icon: "bug", heading: "技術的な問題の報告", text: "音声・動画の再生に問題がある、レッスン内容が正しく表示されない場合は、該当のページ、レッスン、ご利用の端末やブラウザを教えてください。より早く対応できます。" },
        { icon: "sparkles", heading: "新しいレッスンの提案", text: "練習したいのにMe2listenにまだないトピックはありますか？ぜひアイデアをお寄せください。現在のレッスンの多くは、学習者の方からの提案がきっかけになっています。" },
        { icon: "shield", heading: "コンテンツ利用に関するご質問", text: "Me2listen上で使用されているコンテンツの制作者・権利者の方でご質問がある場合は、お気軽にご連絡ください。" },
        { icon: "users", heading: "コラボレーションのご相談", text: "コンテンツ制作への協力、学習コミュニティへのMe2listenのご紹介、ちょっとしたアイデアの共有など、どんな形でも歓迎します。" },
      ] },
    ],
    cta: { heading: "ご連絡の準備はよろしいですか？", text: "通常、数営業日以内にご返信しています。", label: "メールを送る", href: "mailto:me2talk.support@gmail.com" },
  },
};

const acknowledgements: Record<UiLocale, StaticPageCopy> = {
  vi: {
    eyebrow: "LỜI CẢM ƠN",
    title: "Lời cảm ơn",
    navLabel: "Lời cảm ơn",
    lead: "Me2listen không phải là sản phẩm của riêng ai. Đây là kết quả của rất nhiều bàn tay, nhiều tấm lòng đã tin tưởng, ủng hộ và đồng hành cùng chúng tôi trong suốt hành trình xây dựng một cộng đồng học ngôn ngữ tử tế và hữu ích. Trang này là nơi chúng tôi xin được nói lời cảm ơn, một cách chân thành nhất.",
    sections: [
      { heading: "Gửi tới những người bạn đồng hành đầu tiên", kind: "highlight", items: [
        { icon: "heart", heading: "Bạn Giang Trinh & bạn Cloudy Vu", text: "Ngay từ những ngày đầu tiên còn rất nhiều bỡ ngỡ, bạn Giang Trinh và bạn Cloudy Vu đã tin tưởng, ủng hộ và đồng hành cùng chúng tôi xây dựng nên những viên gạch đầu tiên của cộng đồng Me2listen. Sự hỗ trợ đó không chỉ giúp cộng đồng lớn lên, mà còn là nguồn động lực để đội ngũ Me2listen tiếp tục cố gắng mỗi ngày. Xin gửi lời cảm ơn sâu sắc nhất tới hai bạn." },
      ] },
      { heading: "Cảm ơn các nhà sáng tạo nội dung", kind: "prose", items: [
        { heading: "", text: "Phần lớn giá trị mà Me2listen mang lại đến từ những tài liệu nghe – nói do các nhà sáng tạo nội dung công khai dày công xây dựng. Họ dành thời gian, công sức và tâm huyết để tạo ra những câu chuyện, hội thoại, bài giảng chất lượng — và nhờ đó, người học ngôn ngữ trên khắp thế giới, trong đó có người dùng Me2listen, mới có cơ hội tiếp cận nguồn tài liệu phong phú đến vậy." },
        { heading: "", text: "Chúng tôi hiểu rằng, đứng sau mỗi đoạn audio hay video được sử dụng trong bài học là công sức thực sự của một cá nhân hoặc một tập thể. Chúng tôi trân trọng điều đó, và xin gửi lời cảm ơn chân thành tới tất cả những nhà sáng tạo nội dung — dù được nhắc tên trực tiếp hay không — vì những đóng góp thầm lặng nhưng vô cùng ý nghĩa cho cộng đồng học ngôn ngữ." },
      ] },
      { heading: "Về việc sử dụng nội dung", kind: "highlight", items: [
        { icon: "shield", heading: "Luôn sẵn sàng lắng nghe", text: "Me2listen luôn mong muốn việc sử dụng và biên tập lại nội dung phục vụ mục đích học tập được thực hiện một cách tôn trọng và đúng mực với công sức của nhà sáng tạo gốc. Nếu bạn là nhà sáng tạo nội dung và có bất kỳ thắc mắc nào — về việc nội dung của mình được tái sử dụng, biên tập, hoặc mong muốn được ghi nhận, gỡ bỏ hay điều chỉnh — vui lòng liên hệ với chúng tôi qua email me2talk.support@gmail.com. Chúng tôi luôn sẵn sàng trao đổi cởi mở để cùng nhau xây dựng một cộng đồng học ngôn ngữ tốt đẹp và bền vững hơn." },
      ] },
    ],
    cta: { heading: "Bạn cũng là một phần của Me2listen", text: "Cảm ơn bạn — người học đang đọc những dòng này — vì đã chọn đồng hành cùng chúng tôi mỗi ngày.", label: "Khám phá bài học", href: "/en" },
  },
  en: {
    eyebrow: "ACKNOWLEDGEMENTS",
    title: "Acknowledgements",
    navLabel: "Acknowledgements",
    lead: "Me2listen doesn't belong to any one person. It exists because of many hands and many people who believed in it, supported it, and stood by us throughout the journey of building a kind, useful language-learning community. This page is where we say thank you, as sincerely as we know how.",
    sections: [
      { heading: "To our earliest companions", kind: "highlight", items: [
        { icon: "heart", heading: "Ms. Giang Trinh & Ms. Cloudy Vu", text: "Back in the earliest, most uncertain days, Ms. Giang Trinh and Ms. Cloudy Vu believed in us, supported us, and helped lay the first bricks of the Me2listen community. That support didn't just help the community grow — it gave the Me2listen team the motivation to keep going, every single day. Our deepest thanks go to both of them." },
      ] },
      { heading: "Thank you to content creators", kind: "prose", items: [
        { heading: "", text: "Much of the value Me2listen offers comes from listening and speaking materials painstakingly built by public content creators. They put in the time, effort, and care to make quality stories, conversations, and lessons — and because of that, language learners around the world, including everyone using Me2listen, get to access such a rich body of material." },
        { heading: "", text: "We understand that behind every piece of audio or video used in a lesson is the real work of a person or a team. We deeply respect that, and we want to sincerely thank every content creator — whether named here directly or not — for contributions that are often quiet, but always meaningful to the language-learning community." },
      ] },
      { heading: "About content usage", kind: "highlight", items: [
        { icon: "shield", heading: "We're always glad to talk", text: "Me2listen wants every reuse and edit of content made for learning purposes to be handled with respect for the original creator's work. If you're a content creator with any question — about how your material has been reused or edited, or if you'd like credit, removal, or a change — please reach out to us at me2talk.support@gmail.com. We're always glad to have an open conversation and work together to build a better, more sustainable language-learning community." },
      ] },
    ],
    cta: { heading: "You're part of Me2listen too", text: "Thank you — the learner reading this right now — for choosing to practice with us every day.", label: "Explore lessons", href: "/en" },
  },
  zh: {
    eyebrow: "致谢",
    title: "致谢",
    navLabel: "致谢",
    lead: "Me2listen 不属于某一个人。它的存在，离不开许多人的支持与信任，离不开一路以来始终与我们同行、共同建设这个善意而实用的语言学习社区的每一位伙伴。这个页面，是我们想要最真诚地道一声感谢。",
    sections: [
      { heading: "致最早的同行者", kind: "highlight", items: [
        { icon: "heart", heading: "Giang Trinh 女士与 Cloudy Vu 女士", text: "在最初那段充满不确定的日子里，Giang Trinh 女士与 Cloudy Vu 女士给予了我们信任与支持，陪伴我们搭建起 Me2listen 社区最初的基石。这份支持不仅帮助社区不断成长，也成为 Me2listen 团队每天坚持下去的动力。在此，向两位致以最深的谢意。" },
      ] },
      { heading: "感谢内容创作者", kind: "prose", items: [
        { heading: "", text: "Me2listen 所提供的大部分价值，都来自公开内容创作者们精心制作的听说学习材料。他们投入时间、精力与心血，创作出高质量的故事、对话与课程内容，正因如此，包括 Me2listen 用户在内的全世界语言学习者，才能接触到如此丰富的学习资源。" },
        { heading: "", text: "我们深知，每一段被用于课程中的音频或视频背后，都凝聚着一个人或一个团队的真实努力。我们由衷珍视这份付出，并向所有内容创作者——无论是否在此被直接提及——致以诚挚的感谢，感谢他们为语言学习社区做出的、常常默默无闻却意义深远的贡献。" },
      ] },
      { heading: "关于内容使用", kind: "highlight", items: [
        { icon: "shield", heading: "我们随时乐意沟通", text: "Me2listen 始终希望，为学习目的而进行的内容再利用与编辑，都能以尊重原创作者心血的方式进行。如果你是内容创作者，并对内容的再利用、编辑方式有任何疑问，或希望获得署名、移除相关内容，欢迎通过 me2talk.support@gmail.com 与我们联系。我们始终乐意坦诚沟通，一起把语言学习社区建设得更好、更持久。" },
      ] },
    ],
    cta: { heading: "你也是 Me2listen 的一部分", text: "感谢正在阅读这段文字的你，选择每天与我们一同练习。", label: "浏览课程", href: "/en" },
  },
  ja: {
    eyebrow: "謝辞",
    title: "謝辞",
    navLabel: "謝辞",
    lead: "Me2listenは、誰か一人のものではありません。信頼し、支え、この温かく実用的な語学学習コミュニティを築く旅にずっと寄り添ってくださった、多くの方々の手によって存在しています。このページは、私たちが心を込めて「ありがとう」を伝える場所です。",
    sections: [
      { heading: "最初に寄り添ってくださった方々へ", kind: "highlight", items: [
        { icon: "heart", heading: "Giang Trinhさん & Cloudy Vuさん", text: "まだ何もかもが手探りだった最初の頃、Giang TrinhさんとCloudy Vuさんは私たちを信じ、支え、Me2listenコミュニティの最初の礎を築くのを助けてくださいました。そのご支援はコミュニティの成長を助けただけでなく、Me2listenチームが日々努力を続ける原動力にもなりました。お二人には、心より深く感謝申し上げます。" },
      ] },
      { heading: "コンテンツクリエイターの皆さまへ", kind: "prose", items: [
        { heading: "", text: "Me2listenが提供する価値の多くは、パブリックなコンテンツクリエイターの皆さまが丹精込めて作られたリスニング・スピーキング教材から生まれています。時間と労力、そして情熱を注いで作られた質の高いストーリーや会話、レッスンがあるからこそ、Me2listenの利用者を含む世界中の語学学習者が、これほど豊かな教材にアクセスできています。" },
        { heading: "", text: "レッスンで使用されている一つひとつの音声や動画の背後には、個人あるいはチームの本物の努力があることを、私たちは理解しています。その努力を深く尊重し、ここで直接お名前を挙げているかどうかにかかわらず、すべてのコンテンツクリエイターの皆さまに心から感謝申し上げます。その貢献はしばしば静かなものですが、語学学習コミュニティにとって、かけがえのない意味を持っています。" },
      ] },
      { heading: "コンテンツの利用について", kind: "highlight", items: [
        { icon: "shield", heading: "いつでも喜んでお話しします", text: "Me2listenは、学習目的でのコンテンツの再利用や編集が、オリジナルのクリエイターの努力に対する敬意をもって行われることを大切にしています。コンテンツクリエイターの方で、再利用・編集の方法についてご質問がある場合、あるいはクレジット表記・削除・修正をご希望の場合は、me2talk.support@gmail.com までご連絡ください。語学学習コミュニティをより良く、より持続可能なものにしていくために、いつでも率直に話し合わせていただきます。" },
      ] },
    ],
    cta: { heading: "あなたもMe2listenの一員です", text: "今この文章を読んでくださっている学習者の皆さまへ。毎日私たちと一緒に練習してくださり、ありがとうございます。", label: "レッスンを見る", href: "/en" },
  },
};

export const staticPages = { about, contact, acknowledgements };
export type StaticPageKey = keyof typeof staticPages;
export const staticPageT = (locale: UiLocale, page: StaticPageKey): StaticPageCopy => staticPages[page][locale];
