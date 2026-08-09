import type { Lesson, TargetLanguage } from "../types";

const story = (
  id: string,
  number: number,
  title: string,
  summary: string,
  level: Lesson["level"],
  section: number,
  emoji: string,
  lines: Array<[string, string]>,
  accent: Lesson["accent"] = "US",
  language: TargetLanguage = "en",
): Lesson => ({
  id,
  number,
  title,
  summary,
  level,
  section,
  emoji,
  accent,
  language,
  topic: "Short stories",
  duration: Math.max(2, Math.round(lines.length * 0.38)),
  sentences: lines.map(([text, translation], index) => ({
    id: `${id}-${index + 1}`,
    text,
    translation,
    audio: `${id}/${index + 1}.wav`,
  })),
});

const englishLessons: Lesson[] = [
  story("morning-market", 1, "A morning at the market", "A quiet Saturday turns into a colorful little adventure.", "A1", 1, "🥕", [
    ["Maya wakes up early on Saturday.", "Maya thức dậy sớm vào thứ Bảy."],
    ["She walks to the market with her father.", "Cô bé đi bộ đến chợ cùng bố."],
    ["The fruit stalls are bright and colorful.", "Những sạp trái cây rực rỡ và nhiều màu sắc."],
    ["They buy apples, bread, and fresh flowers.", "Họ mua táo, bánh mì và hoa tươi."],
    ["A friendly baker gives Maya a warm roll.", "Một người thợ làm bánh thân thiện tặng Maya một chiếc bánh mì nóng."],
    ["They carry everything home in two bags.", "Họ mang mọi thứ về nhà trong hai chiếc túi."],
  ]),
  story("lost-scarf", 2, "The lost red scarf", "Leo follows a trail through the park to find its owner.", "A1", 1, "🧣", [
    ["Leo finds a red scarf on a park bench.", "Leo tìm thấy một chiếc khăn đỏ trên ghế công viên."],
    ["The scarf is soft and very clean.", "Chiếc khăn mềm và rất sạch."],
    ["He asks everyone near the playground.", "Cậu hỏi mọi người gần sân chơi."],
    ["An old woman waves from across the path.", "Một bà cụ vẫy tay từ bên kia lối đi."],
    ["She smiles when Leo returns her scarf.", "Bà mỉm cười khi Leo trả lại chiếc khăn."],
  ]),
  story("rainy-bus", 3, "The rainy bus ride", "A rainy commute brings two strangers together.", "A2", 1, "🚌", [
    ["Rain taps softly against the bus windows.", "Mưa gõ nhẹ lên cửa kính xe buýt."],
    ["Noah gives his seat to a tired traveler.", "Noah nhường ghế cho một hành khách mệt mỏi."],
    ["They talk about books during the long ride.", "Họ nói về sách trong suốt chuyến đi dài."],
    ["The clouds disappear before the final stop.", "Mây tan trước trạm cuối cùng."],
    ["Both of them leave the bus with a smile.", "Cả hai rời xe buýt với một nụ cười."],
  ], "UK"),
  story("tiny-library", 4, "The tiny street library", "A wooden box of books changes a neighborhood.", "A2", 2, "📚", [
    ["Emma builds a tiny library beside her gate.", "Emma dựng một thư viện nhỏ bên cạnh cổng nhà."],
    ["She fills it with stories she has already read.", "Cô lấp đầy nó bằng những câu chuyện đã đọc."],
    ["Neighbors begin to leave their own books there.", "Hàng xóm bắt đầu để sách của họ ở đó."],
    ["Soon, children visit the box every afternoon.", "Chẳng bao lâu, trẻ em ghé chiếc hộp mỗi chiều."],
    ["One simple idea brings the whole street together.", "Một ý tưởng đơn giản gắn kết cả con phố."],
  ]),
  story("midnight-baker", 5, "The midnight baker", "Why does the bakery light turn on before sunrise?", "B1", 2, "🥐", [
    ["While the town sleeps, Daniel begins his work.", "Trong khi thị trấn ngủ, Daniel bắt đầu công việc."],
    ["He carefully measures flour, water, and yeast.", "Anh cẩn thận đong bột, nước và men."],
    ["The quiet kitchen slowly grows warm and fragrant.", "Căn bếp yên tĩnh dần trở nên ấm áp và thơm lừng."],
    ["By sunrise, rows of golden bread fill the shelves.", "Khi mặt trời mọc, những hàng bánh vàng óng phủ đầy kệ."],
    ["His first customers arrive as the church bell rings.", "Những vị khách đầu tiên đến khi chuông nhà thờ vang lên."],
    ["Daniel greets each of them by name.", "Daniel chào từng người bằng tên."],
  ]),
  story("borrowed-camera", 6, "The borrowed camera", "A school project reveals beauty in ordinary places.", "B1", 2, "📷", [
    ["Lina borrows an old camera from her uncle.", "Lina mượn một chiếc máy ảnh cũ từ chú mình."],
    ["At first, she only photographs famous buildings.", "Ban đầu, cô chỉ chụp những tòa nhà nổi tiếng."],
    ["Then she notices reflections in puddles and windows.", "Sau đó cô chú ý đến hình phản chiếu trong vũng nước và cửa sổ."],
    ["Her favorite picture shows sunlight on an empty chair.", "Bức ảnh yêu thích của cô cho thấy nắng trên một chiếc ghế trống."],
    ["The project teaches her to look more carefully.", "Dự án dạy cô quan sát cẩn thận hơn."],
  ]),
  story("island-letter", 7, "A letter from the island", "A mysterious letter crosses the ocean.", "B2", 3, "✉️", [
    ["The envelope had traveled farther than its faded stamps suggested.", "Chiếc phong bì đã đi xa hơn những con tem bạc màu cho thấy."],
    ["Inside, a stranger described a lighthouse on a distant island.", "Bên trong, một người lạ mô tả ngọn hải đăng trên hòn đảo xa."],
    ["He claimed that Anna's grandfather had once worked there.", "Ông nói rằng ông của Anna từng làm việc ở đó."],
    ["Curiosity persuaded her to search through the family attic.", "Sự tò mò khiến cô tìm kiếm trên gác mái gia đình."],
    ["Beneath an old map, she discovered the lighthouse keeper's journal.", "Bên dưới tấm bản đồ cũ, cô phát hiện nhật ký của người gác hải đăng."],
    ["The final page contained an invitation to return.", "Trang cuối chứa một lời mời quay trở lại."],
  ], "UK"),
  story("last-train", 8, "The last train home", "One small decision changes a late journey.", "B2", 3, "🚆", [
    ["The station was nearly empty when the announcement echoed overhead.", "Nhà ga gần như trống vắng khi thông báo vang lên."],
    ["A mechanical problem had delayed the last train indefinitely.", "Một sự cố kỹ thuật đã trì hoãn chuyến tàu cuối vô thời hạn."],
    ["Instead of complaining, several passengers began sharing a taxi.", "Thay vì phàn nàn, vài hành khách bắt đầu đi chung taxi."],
    ["Their unexpected conversation made the long journey feel brief.", "Cuộc trò chuyện bất ngờ khiến hành trình dài trở nên ngắn ngủi."],
    ["Months later, they still met for dinner at the same station cafe.", "Nhiều tháng sau, họ vẫn gặp nhau ăn tối tại quán cà phê ở nhà ga ấy."],
  ]),
  story("garden-rooftop", 9, "The rooftop garden", "An apartment community grows more than vegetables.", "A2", 3, "🌱", [
    ["The apartment roof was once gray and empty.", "Mái chung cư từng xám xịt và trống trải."],
    ["Residents carried up soil in small buckets.", "Cư dân mang đất lên trong những chiếc xô nhỏ."],
    ["They planted tomatoes, herbs, and yellow sunflowers.", "Họ trồng cà chua, rau thơm và hoa hướng dương vàng."],
    ["Everyone took turns watering the young plants.", "Mọi người thay phiên tưới cây non."],
    ["That summer, the roof became their favorite meeting place.", "Mùa hè ấy, mái nhà trở thành nơi gặp gỡ yêu thích của họ."],
  ]),
];

const chineseLessons: Lesson[] = [
  story("zh-morning-routine", 1, "我的早晨", "Một buổi sáng đơn giản với những hoạt động quen thuộc.", "A1", 1, "🌅", [
    ["我每天早上七点起床。", "Tôi thức dậy lúc bảy giờ mỗi sáng."],
    ["我先喝一杯温水。", "Trước tiên tôi uống một cốc nước ấm."],
    ["然后我在厨房做早饭。", "Sau đó tôi làm bữa sáng trong bếp."],
    ["八点钟，我坐地铁去上班。", "Lúc tám giờ, tôi đi tàu điện ngầm đến chỗ làm."],
    ["新的一天就这样开始了。", "Một ngày mới bắt đầu như thế."],
  ], "Mandarin", "zh"),
  story("zh-tea-shop", 2, "街角的茶店", "Một cuộc gặp gỡ ấm áp tại quán trà trong khu phố.", "A2", 1, "🍵", [
    ["街角有一家很小的茶店。", "Có một quán trà rất nhỏ ở góc phố."],
    ["老板总是热情地欢迎客人。", "Ông chủ luôn nhiệt tình chào đón khách."],
    ["今天，我点了一杯茉莉花茶。", "Hôm nay, tôi gọi một tách trà hoa nhài."],
    ["窗外下着小雨，店里却很温暖。", "Bên ngoài mưa nhẹ nhưng trong quán rất ấm áp."],
    ["我决定在这里多坐一会儿。", "Tôi quyết định ngồi đây thêm một lúc."],
  ], "Mandarin", "zh"),
  story("zh-old-bicycle", 3, "爷爷的旧自行车", "Chiếc xe đạp cũ lưu giữ nhiều kỷ niệm gia đình.", "B1", 2, "🚲", [
    ["爷爷的自行车已经用了三十多年。", "Chiếc xe đạp của ông đã được dùng hơn ba mươi năm."],
    ["车身虽然有点旧，但是骑起来很舒服。", "Tuy thân xe hơi cũ nhưng đi vẫn rất thoải mái."],
    ["小时候，他常常骑车带我去河边。", "Khi tôi còn nhỏ, ông thường chở tôi ra bờ sông."],
    ["现在我把它修好，放在自己的家里。", "Giờ tôi sửa lại và đặt nó trong nhà mình."],
    ["每次看到它，我都会想起那些快乐的下午。", "Mỗi lần nhìn thấy nó, tôi nhớ lại những buổi chiều vui vẻ ấy."],
  ], "Mandarin", "zh"),
];

const japaneseLessons: Lesson[] = [
  story("ja-small-cat", 1, "小さな猫", "Một chú mèo nhỏ tìm thấy mái ấm mới.", "A1", 1, "🐈", [
    ["公園に小さな猫がいました。", "Có một chú mèo nhỏ trong công viên."],
    ["猫は白くて、目が青いです。", "Chú mèo màu trắng và có đôi mắt xanh."],
    ["私は毎日、猫に会いに行きました。", "Mỗi ngày tôi đều đến thăm chú mèo."],
    ["ある日、猫を家に連れて帰りました。", "Một ngày nọ, tôi đưa chú mèo về nhà."],
    ["今、猫は私の隣で寝ています。", "Bây giờ chú mèo đang ngủ bên cạnh tôi."],
  ], "Tokyo", "ja"),
  story("ja-lunch-box", 2, "母のお弁当", "Một hộp cơm nhỏ mang theo tình cảm gia đình.", "A2", 1, "🍱", [
    ["母は毎朝早く起きて、お弁当を作ります。", "Mẹ dậy sớm mỗi sáng để làm cơm hộp."],
    ["今日は卵焼きと野菜が入っています。", "Hôm nay trong hộp có trứng cuộn và rau."],
    ["昼休みに友達と一緒に食べました。", "Tôi ăn cùng bạn bè vào giờ nghỉ trưa."],
    ["母のお弁当はいつも色がきれいです。", "Cơm hộp của mẹ luôn có màu sắc rất đẹp."],
    ["空の箱を見て、母はうれしそうに笑いました。", "Nhìn chiếc hộp trống, mẹ mỉm cười vui vẻ."],
  ], "Tokyo", "ja"),
  story("ja-last-sakura", 3, "最後の桜", "Một cuộc dạo bộ cuối mùa hoa anh đào.", "B1", 2, "🌸", [
    ["春の終わりに、祖母と川沿いを歩きました。", "Cuối mùa xuân, tôi đi dọc bờ sông cùng bà."],
    ["風が吹くたびに、桜の花びらが空を舞いました。", "Mỗi khi gió thổi, cánh hoa anh đào bay trong không trung."],
    ["祖母は昔も同じ景色を見たと話しました。", "Bà kể rằng ngày xưa bà cũng từng thấy khung cảnh này."],
    ["私たちは古い木の下で写真を撮りました。", "Chúng tôi chụp ảnh dưới một cái cây cổ thụ."],
    ["その一枚は、今でも私の大切な宝物です。", "Bức ảnh ấy đến giờ vẫn là báu vật quý giá của tôi."],
  ], "Tokyo", "ja"),
];

export const lessons: Lesson[] = [...englishLessons, ...chineseLessons, ...japaneseLessons];

export const lessonsByLanguage: Record<TargetLanguage, Lesson[]> = {
  en: englishLessons,
  zh: chineseLessons,
  ja: japaneseLessons,
};

export const targetLanguages = [
  { id: "en" as const, name: "English", nativeName: "English", flag: "🇬🇧", color: "#df7059", description: "Stories and conversations in American and British English" },
  { id: "zh" as const, name: "Chinese", nativeName: "中文", flag: "🇨🇳", color: "#d3a349", description: "Standard Mandarin with practical everyday vocabulary" },
  { id: "ja" as const, name: "Japanese", nativeName: "日本語", flag: "🇯🇵", color: "#708f82", description: "Natural Tokyo Japanese through short, focused stories" },
];
