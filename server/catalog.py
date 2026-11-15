"""Built-in destination & place directory.

This is the local "maps provider" used when no Google Maps key is configured.
Coordinates are approximate reference points for well-known public landmarks;
prices are illustrative estimates (VND / person) and must be replaced with real
data before launch (see PRD 4.3 note).

Place tuple:
  (id, name_vi, name_en, lat, lng, address, tags, slot, duration_min, cost_vnd,
   intensity 1-3, desc_vi, desc_en, flags)

tags  : food, cafe, nature, culture, shopping, photo, adventure, nightlife, relax
slot  : morning | afternoon | evening | day | any | lunch | dinner | meal
flags : crowd, seafood, water, late
"""

INTERESTS = ["food", "cafe", "nature", "culture", "shopping", "photo", "adventure", "nightlife", "relax"]
STYLES = ["relax", "explore", "experience", "saving", "mixed"]
PACES = ["slow", "balanced", "fast"]
TRANSPORTS = ["walk", "public", "car", "motorbike", "mixed"]
AVOIDS = ["hiking", "crowd", "seafood", "water", "late", "long_transfer"]

DESTINATIONS = {
    "hanoi": dict(vi="Hà Nội", en="Hanoi", region_vi="Miền Bắc", region_en="Northern Vietnam",
                  lat=21.0285, lng=105.8542, featured=True, aliases=["ha noi", "hanoi", "hn", "thu do"],
                  tag_vi="Ngàn năm văn hiến, phố cổ và cà phê trứng",
                  tag_en="A thousand years of culture, old streets and egg coffee",
                  stay=(320000, 650000, 1400000), meal=70000),
    "halong": dict(vi="Hạ Long", en="Ha Long Bay", region_vi="Quảng Ninh", region_en="Quang Ninh",
                   lat=20.9510, lng=107.0730, featured=True, aliases=["ha long", "halong", "vinh ha long", "quang ninh"],
                   tag_vi="Kỳ quan vịnh đá vôi và đêm trên du thuyền",
                   tag_en="Limestone bay wonder and nights on a cruise",
                   stay=(380000, 800000, 1800000), meal=120000),
    "danang": dict(vi="Đà Nẵng", en="Da Nang", region_vi="Miền Trung", region_en="Central Vietnam",
                   lat=16.0544, lng=108.2022, featured=True, aliases=["da nang", "danang", "dn"],
                   tag_vi="Biển xanh, cầu Rồng và bán đảo Sơn Trà",
                   tag_en="Blue beaches, Dragon Bridge and Son Tra peninsula",
                   stay=(350000, 700000, 1600000), meal=80000),
    "hoian": dict(vi="Hội An", en="Hoi An", region_vi="Quảng Nam", region_en="Quang Nam",
                  lat=15.8801, lng=108.3380, featured=True, aliases=["hoi an", "hoian", "pho co hoi an"],
                  tag_vi="Phố cổ đèn lồng bên dòng sông Hoài",
                  tag_en="Lantern-lit old town on the Hoai River",
                  stay=(330000, 680000, 1500000), meal=75000),
    "hue": dict(vi="Huế", en="Hue", region_vi="Thừa Thiên Huế", region_en="Thua Thien Hue",
                lat=16.4637, lng=107.5909, featured=False, aliases=["hue", "co do hue"],
                tag_vi="Cố đô trầm mặc, lăng tẩm và ca Huế trên sông Hương",
                tag_en="Imperial city, royal tombs and Perfume River songs",
                stay=(300000, 600000, 1300000), meal=65000),
    "dalat": dict(vi="Đà Lạt", en="Da Lat", region_vi="Lâm Đồng", region_en="Lam Dong",
                  lat=11.9404, lng=108.4583, featured=False, aliases=["da lat", "dalat", "lam dong"],
                  tag_vi="Thành phố sương mù, đồi thông và hoa",
                  tag_en="City of mist, pine hills and flowers",
                  stay=(300000, 620000, 1400000), meal=70000),
    "hcm": dict(vi="TP. Hồ Chí Minh", en="Ho Chi Minh City", region_vi="Miền Nam", region_en="Southern Vietnam",
                lat=10.7769, lng=106.7009, featured=False,
                aliases=["ho chi minh", "hcm", "sai gon", "saigon", "tp hcm", "tphcm"],
                tag_vi="Đô thị năng động, ẩm thực đường phố không ngủ",
                tag_en="A dynamic city with street food that never sleeps",
                stay=(350000, 750000, 1700000), meal=75000),
    "sapa": dict(vi="Sa Pa", en="Sa Pa", region_vi="Lào Cai", region_en="Lao Cai",
                 lat=22.3364, lng=103.8438, featured=False, aliases=["sa pa", "sapa", "lao cai", "fansipan"],
                 tag_vi="Ruộng bậc thang, bản làng và nóc nhà Đông Dương",
                 tag_en="Rice terraces, hill villages and the roof of Indochina",
                 stay=(300000, 650000, 1500000), meal=90000),
}

_RAW = {
    "hanoi": [
        ("hn-hoan-kiem", "Hồ Hoàn Kiếm & Đền Ngọc Sơn", "Hoan Kiem Lake & Ngoc Son Temple", 21.0288, 105.8525, "Đinh Tiên Hoàng, Hoàn Kiếm", "culture photo relax", "morning", 75, 50000, 1, "Dạo quanh hồ, qua cầu Thê Húc vào đền.", "Stroll the lake and cross the red Huc Bridge.", "crowd"),
        ("hn-van-mieu", "Văn Miếu – Quốc Tử Giám", "Temple of Literature", 21.0294, 105.8355, "58 Quốc Tử Giám, Đống Đa", "culture photo", "morning", 90, 70000, 1, "Trường đại học đầu tiên của Việt Nam.", "Vietnam's first national university.", ""),
        ("hn-lang-bac", "Lăng Chủ tịch Hồ Chí Minh & Chùa Một Cột", "Ho Chi Minh Mausoleum & One Pillar Pagoda", 21.0368, 105.8347, "2 Hùng Vương, Ba Đình", "culture", "morning", 90, 0, 1, "Quảng trường Ba Đình và ngôi chùa độc đáo.", "Ba Dinh Square and the iconic pagoda.", "crowd"),
        ("hn-hoang-thanh", "Hoàng thành Thăng Long", "Thang Long Imperial Citadel", 21.0353, 105.8403, "19C Hoàng Diệu, Ba Đình", "culture photo", "day", 90, 70000, 1, "Di sản thế giới với tầng lớp lịch sử nghìn năm.", "World Heritage site layered with a millennium of history.", ""),
        ("hn-pho-co", "Dạo phố cổ 36 phố phường", "Old Quarter walk", 21.0341, 105.8500, "Hàng Đào – Hàng Ngang, Hoàn Kiếm", "culture shopping photo", "afternoon", 90, 0, 1, "Những con phố nghề và nhà ống cổ.", "Guild streets and narrow tube houses.", "crowd"),
        ("hn-hoa-lo", "Di tích Nhà tù Hỏa Lò", "Hoa Lo Prison Relic", 21.0254, 105.8465, "1 Hỏa Lò, Hoàn Kiếm", "culture", "day", 75, 50000, 1, "Bảo tàng lịch sử giữa lòng phố.", "A powerful history museum downtown.", ""),
        ("hn-tran-quoc", "Chùa Trấn Quốc & Hồ Tây", "Tran Quoc Pagoda & West Lake", 21.0480, 105.8368, "Thanh Niên, Tây Hồ", "culture nature photo relax", "afternoon", 80, 0, 1, "Ngôi chùa cổ nhất Hà Nội bên hồ Tây lộng gió.", "Hanoi's oldest pagoda on breezy West Lake.", ""),
        ("hn-dan-toc-hoc", "Bảo tàng Dân tộc học Việt Nam", "Vietnam Museum of Ethnology", 21.0404, 105.7986, "Nguyễn Văn Huyên, Cầu Giấy", "culture", "day", 120, 40000, 1, "54 dân tộc qua hiện vật và nhà truyền thống.", "54 ethnic groups through artefacts and houses.", ""),
        ("hn-long-bien", "Cầu Long Biên lúc hoàng hôn", "Long Bien Bridge at sunset", 21.0430, 105.8600, "Long Biên, Hoàn Kiếm", "photo adventure", "afternoon", 60, 0, 2, "Đi bộ trên cây cầu thép trăm tuổi.", "Walk the century-old steel bridge.", ""),
        ("hn-dong-xuan", "Chợ Đồng Xuân", "Dong Xuan Market", 21.0383, 105.8495, "Đồng Xuân, Hoàn Kiếm", "shopping food", "day", 60, 0, 1, "Khu chợ lớn nhất phố cổ.", "The Old Quarter's biggest market.", "crowd"),
        ("hn-nha-hat", "Nhà hát Lớn Hà Nội", "Hanoi Opera House", 21.0243, 105.8575, "1 Tràng Tiền, Hoàn Kiếm", "culture photo", "any", 45, 0, 1, "Kiến trúc Pháp tráng lệ.", "Grand French-era architecture.", ""),
        ("hn-bat-trang", "Làng gốm Bát Tràng", "Bat Trang Pottery Village", 20.9756, 105.9119, "Bát Tràng, Gia Lâm", "culture shopping adventure", "day", 180, 100000, 2, "Tự tay nặn gốm ở làng nghề 700 năm.", "Throw your own pot in a 700-year-old village.", ""),
        ("hn-roi-nuoc", "Múa rối nước Thăng Long", "Thang Long Water Puppets", 21.0318, 105.8532, "57B Đinh Tiên Hoàng, Hoàn Kiếm", "culture nightlife", "evening", 60, 150000, 1, "Nghệ thuật dân gian độc đáo trên mặt nước.", "Unique folk art performed on water.", ""),
        ("hn-ta-hien", "Phố bia Tạ Hiện", "Ta Hien beer street", 21.0354, 105.8518, "Tạ Hiện, Hoàn Kiếm", "nightlife food", "evening", 90, 150000, 1, "Bia hơi vỉa hè và nhịp sống về đêm.", "Street-side draught beer and night buzz.", "crowd late"),
        ("hn-ca-phe-giang", "Cà phê trứng Giảng", "Giang Egg Coffee", 21.0340, 105.8540, "39 Nguyễn Hữu Huân, Hoàn Kiếm", "cafe food", "any", 40, 40000, 1, "Nơi khai sinh cà phê trứng.", "Birthplace of egg coffee.", ""),
        ("hn-pho-bat-dan", "Phở gia truyền Bát Đàn", "Bat Dan heritage pho", 21.0336, 105.8466, "49 Bát Đàn, Hoàn Kiếm", "food", "lunch", 45, 65000, 1, "Bát phở bò đậm vị Hà Nội.", "A classic Hanoi beef pho.", "crowd"),
        ("hn-bun-cha", "Bún chả Hàng Mành", "Hang Manh bun cha", 21.0318, 105.8486, "1 Hàng Mành, Hoàn Kiếm", "food", "lunch", 50, 70000, 1, "Chả nướng than hoa, nước chấm chua ngọt.", "Charcoal-grilled pork with sweet-sour dip.", ""),
        ("hn-cha-ca", "Chả cá Lã Vọng", "La Vong turmeric fish", 21.0352, 105.8481, "14 Chả Cá, Hoàn Kiếm", "food", "dinner", 70, 180000, 1, "Món chả cá thì là trứ danh.", "The famous turmeric-dill fish.", ""),
        ("hn-am-thuc-dem", "Ẩm thực đêm Tống Duy Tân", "Tong Duy Tan night eats", 21.0300, 105.8442, "Tống Duy Tân, Hoàn Kiếm", "food nightlife", "dinner", 70, 120000, 1, "Phố ẩm thực sáng đèn tới khuya.", "A food street lit until late.", "late"),
    ],
    "halong": [
        ("hl-du-thuyen", "Du thuyền ngày trên vịnh Hạ Long", "Ha Long Bay day cruise", 20.9306, 106.9893, "Cảng tàu khách quốc tế Tuần Châu", "nature photo relax", "day", 300, 850000, 1, "Lướt giữa hàng nghìn đảo đá vôi.", "Glide between thousands of limestone isles.", "water"),
        ("hl-sung-sot", "Hang Sửng Sốt", "Sung Sot Cave", 20.8442, 107.0910, "Đảo Bồ Hòn, vịnh Hạ Long", "nature adventure photo", "day", 90, 0, 2, "Hang động rộng và đẹp bậc nhất vịnh.", "One of the bay's largest, grandest caves.", "crowd"),
        ("hl-ti-top", "Đảo Ti Tốp", "Ti Top Island", 20.8574, 107.0817, "Vịnh Hạ Long", "adventure photo relax", "day", 90, 50000, 2, "Leo 400 bậc ngắm toàn cảnh vịnh.", "Climb 400 steps for a bay panorama.", "water"),
        ("hl-kayak", "Chèo kayak Hang Luồn", "Kayaking at Luon Cave", 20.8737, 107.0830, "Vịnh Hạ Long", "adventure nature", "day", 60, 120000, 3, "Chèo qua vòm đá vào hồ kín.", "Paddle through a rock arch into a hidden lagoon.", "water"),
        ("hl-cua-van", "Làng chài Cửa Vạn", "Cua Van fishing village", 20.8553, 107.1228, "Vịnh Hạ Long", "culture photo", "day", 90, 100000, 1, "Nhịp sống làng chài nổi trên vịnh.", "Life in a floating fishing village.", "water"),
        ("hl-bao-tang", "Bảo tàng Quảng Ninh", "Quang Ninh Museum", 20.9523, 107.0970, "Trần Quốc Nghiễn, Hồng Gai", "culture photo", "day", 90, 40000, 1, "Kiến trúc gương đen độc đáo bên vịnh.", "Striking black-glass museum by the bay.", ""),
        ("hl-sun-world", "Sun World Hạ Long & cáp treo Nữ Hoàng", "Sun World Ha Long & Queen cable car", 20.9530, 107.0447, "Bãi Cháy, Hạ Long", "adventure photo", "afternoon", 180, 350000, 2, "Cáp treo vượt vịnh và vòng quay Mặt Trời.", "Cable car over the bay and the Sun Wheel.", "crowd"),
        ("hl-bai-tho", "Núi Bài Thơ", "Bai Tho Mountain", 20.9514, 107.0822, "Hồng Gai, Hạ Long", "adventure photo nature", "morning", 90, 0, 3, "Leo núi ngắm thành phố và vịnh.", "Hike for views over city and bay.", ""),
        ("hl-bai-chay", "Bãi tắm Bãi Cháy", "Bai Chay Beach", 20.9545, 107.0480, "Hạ Long, Bãi Cháy", "relax nature", "afternoon", 90, 0, 1, "Bãi cát dài, hoàng hôn dịu.", "Long sandy beach with gentle sunsets.", "water"),
        ("hl-cau-bai-chay", "Cầu Bãi Cháy", "Bai Chay Bridge", 20.9562, 107.0646, "Hạ Long", "photo", "evening", 30, 0, 1, "Cây cầu dây văng lên đèn rực rỡ.", "The cable bridge lights up at night.", ""),
        ("hl-cho-dem", "Chợ đêm Hạ Long", "Ha Long night market", 20.9548, 107.0503, "Bãi Cháy, Hạ Long", "nightlife shopping food", "evening", 75, 100000, 1, "Đồ lưu niệm, ngọc trai và ăn vặt.", "Souvenirs, pearls and snacks.", "crowd late"),
        ("hl-cho-ha-long", "Chợ Hạ Long 1 (hải sản)", "Ha Long Market 1 (seafood)", 20.9505, 107.0851, "Hồng Gai, Hạ Long", "food shopping", "lunch", 60, 250000, 1, "Hải sản tươi ngay tại chợ.", "Fresh seafood straight from the market.", "seafood crowd"),
        ("hl-hai-san", "Phố hải sản Bãi Cháy", "Bai Chay seafood street", 20.9550, 107.0520, "Bãi Cháy, Hạ Long", "food", "dinner", 80, 350000, 1, "Chả mực, sá sùng, ngán Hạ Long.", "Squid cakes and Ha Long specialities.", "seafood"),
        ("hl-bun-be", "Bún bề bề & bánh cuốn chả mực", "Mantis-shrimp noodles & squid-cake rolls", 20.9530, 107.0790, "Hồng Gai, Hạ Long", "food", "lunch", 45, 70000, 1, "Món sáng đặc sản Quảng Ninh.", "Quang Ninh breakfast classics.", "seafood"),
        ("hl-ca-phe", "Cà phê ngắm vịnh Hòn Gai", "Hon Gai bay-view cafe", 20.9500, 107.0830, "Hồng Gai, Hạ Long", "cafe relax photo", "any", 50, 50000, 1, "Ngồi chậm ngắm thuyền ra vào.", "Slow down and watch the boats.", ""),
        ("hl-com-ga", "Cơm gà & món Việt nhà làm", "Home-style Vietnamese rice", 20.9545, 107.0560, "Bãi Cháy, Hạ Long", "food", "meal", 50, 90000, 1, "Bữa ăn nhẹ nhàng, không hải sản.", "A light meal, seafood-free.", ""),
    ],
    "danang": [
        ("dn-cau-rong", "Cầu Rồng", "Dragon Bridge", 16.0612, 108.2272, "Nguyễn Văn Linh, Hải Châu", "photo nightlife", "evening", 45, 0, 1, "Rồng phun lửa, phun nước tối cuối tuần.", "Fire and water show on weekend nights.", "crowd"),
        ("dn-my-khe", "Biển Mỹ Khê", "My Khe Beach", 16.0600, 108.2470, "Võ Nguyên Giáp, Sơn Trà", "relax nature", "morning", 120, 0, 1, "Một trong những bãi biển đẹp nhất hành tinh.", "One of the planet's loveliest beaches.", "water"),
        ("dn-son-tra", "Bán đảo Sơn Trà & Chùa Linh Ứng", "Son Tra Peninsula & Linh Ung Pagoda", 16.1003, 108.2779, "Hoàng Sa, Sơn Trà", "culture nature photo", "morning", 150, 0, 2, "Tượng Quan Âm nhìn ra vịnh, rừng nguyên sinh.", "Lady Buddha over the bay and green forest.", ""),
        ("dn-ngu-hanh-son", "Danh thắng Ngũ Hành Sơn", "Marble Mountains", 16.0036, 108.2639, "Huyền Trân Công Chúa, Ngũ Hành Sơn", "culture adventure photo", "morning", 120, 40000, 2, "Hang động, chùa chiền trong núi đá.", "Caves and pagodas inside marble peaks.", ""),
        ("dn-ba-na", "Bà Nà Hills & Cầu Vàng", "Ba Na Hills & Golden Bridge", 15.9950, 107.9965, "Hòa Ninh, Hòa Vang", "adventure photo", "day", 360, 950000, 2, "Cáp treo kỷ lục và cây cầu bàn tay khổng lồ.", "Record cable car and the giant-hands bridge.", "crowd"),
        ("dn-cham", "Bảo tàng Điêu khắc Chăm", "Museum of Cham Sculpture", 16.0605, 108.2235, "2 tháng 9, Hải Châu", "culture", "day", 75, 60000, 1, "Bộ sưu tập nghệ thuật Chăm lớn nhất.", "The largest collection of Cham art.", ""),
        ("dn-cho-han", "Chợ Hàn", "Han Market", 16.0681, 108.2245, "119 Trần Phú, Hải Châu", "shopping food", "afternoon", 60, 0, 1, "Đặc sản khô, vải vóc và quà miền Trung.", "Dried specialities and fabric shopping.", "crowd"),
        ("dn-hai-van", "Đèo Hải Vân", "Hai Van Pass", 16.1931, 108.1311, "Liên Chiểu", "adventure photo nature", "day", 180, 150000, 2, "Thiên hạ đệ nhất hùng quan.", "The most majestic pass in the land.", ""),
        ("dn-tinh-yeu", "Cầu Tình Yêu & Cá chép hóa rồng", "Love Bridge & Carp-Dragon statue", 16.0626, 108.2295, "Trần Hưng Đạo, Sơn Trà", "photo nightlife relax", "evening", 40, 0, 1, "Bờ sông lung linh ánh đèn.", "A riverside lit with lights.", ""),
        ("dn-helio", "Chợ đêm Helio", "Helio night market", 16.0378, 108.2246, "2 tháng 9, Hải Châu", "nightlife food shopping", "evening", 90, 120000, 1, "Ẩm thực, nhạc sống và trò chơi.", "Street food, live music and games.", "crowd late"),
        ("dn-ca-phe-song-han", "Cà phê ven sông Hàn", "Han riverside cafe", 16.0700, 108.2240, "Bạch Đằng, Hải Châu", "cafe relax photo", "any", 50, 45000, 1, "Ngắm thuyền và cầu quay sông Hàn.", "Watch boats and the swing bridge.", ""),
        ("dn-mi-quang", "Mì Quảng Bà Mua", "Ba Mua Quang noodles", 16.0660, 108.2180, "19 Trần Bình Trọng, Hải Châu", "food", "lunch", 45, 50000, 1, "Sợi mì vàng, nước dùng sệt đậm đà.", "Turmeric noodles in a rich broth.", ""),
        ("dn-banh-trang", "Bánh tráng cuốn thịt heo Trần", "Tran pork rice-paper rolls", 16.0540, 108.2040, "4 Lê Duẩn, Hải Châu", "food", "meal", 60, 150000, 1, "Đặc sản cuốn rau rừng.", "Pork rolls with wild herbs.", ""),
        ("dn-hai-san", "Hải sản ven biển Mỹ Khê", "My Khe seafood", 16.0640, 108.2460, "Võ Nguyên Giáp, Sơn Trà", "food", "dinner", 90, 400000, 1, "Hải sản nướng sát mép sóng.", "Grilled seafood by the waves.", "seafood"),
        ("dn-cho-con", "Ăn vặt chợ Cồn", "Con Market snacks", 16.0681, 108.2142, "290 Hùng Vương, Hải Châu", "food shopping", "lunch", 60, 80000, 1, "Bánh bèo, ốc, chè đủ vị.", "Rice cakes, snails and sweet soups.", "crowd"),
    ],
    "hoian": [
        ("ha-chua-cau", "Chùa Cầu (Cầu Nhật Bản)", "Japanese Covered Bridge", 15.8771, 108.3262, "Nguyễn Thị Minh Khai, Minh An", "culture photo", "morning", 40, 0, 1, "Biểu tượng 400 năm của phố Hội.", "Hoi An's 400-year-old icon.", "crowd"),
        ("ha-pho-co", "Phố cổ Hội An (vé tham quan)", "Hoi An Ancient Town (ticket)", 15.8774, 108.3283, "Trần Phú – Nguyễn Thái Học", "culture photo shopping", "morning", 120, 120000, 1, "Nhà cổ, hội quán, tường vàng rêu phong.", "Merchant houses, assembly halls, mustard walls.", "crowd"),
        ("ha-tan-ky", "Nhà cổ Tấn Ký", "Tan Ky Old House", 15.8768, 108.3291, "101 Nguyễn Thái Học", "culture", "day", 40, 0, 1, "Nhà buôn hơn 200 năm tuổi.", "A 200-year-old merchant house.", ""),
        ("ha-phuc-kien", "Hội quán Phúc Kiến", "Phuc Kien Assembly Hall", 15.8780, 108.3302, "46 Trần Phú", "culture photo", "day", 40, 0, 1, "Kiến trúc Hoa rực rỡ.", "Ornate Chinese architecture.", ""),
        ("ha-hoa-dang", "Thả đèn hoa đăng sông Hoài", "Lantern release on the Hoai River", 15.8763, 108.3285, "Bạch Đằng, Minh An", "nightlife photo relax", "evening", 45, 50000, 1, "Thuyền nhỏ và đèn giấy trên sông.", "Small boats and paper lanterns on the river.", "water crowd"),
        ("ha-cho-dem", "Chợ đêm Nguyễn Hoàng", "Nguyen Hoang night market", 15.8758, 108.3255, "Nguyễn Hoàng, An Hội", "shopping nightlife food", "evening", 60, 80000, 1, "Đèn lồng, đồ thủ công, ăn vặt.", "Lanterns, crafts and snacks.", "crowd late"),
        ("ha-bay-mau", "Rừng dừa Bảy Mẫu (thúng chai)", "Bay Mau coconut forest (basket boats)", 15.8705, 108.3725, "Cẩm Thanh", "adventure nature photo", "morning", 90, 150000, 2, "Ngồi thúng chai giữa rừng dừa nước.", "Basket boat rides through water palms.", "water"),
        ("ha-tra-que", "Làng rau Trà Quế", "Tra Que vegetable village", 15.9005, 108.3375, "Cẩm Hà", "nature culture relax", "morning", 90, 50000, 1, "Làm nông một buổi, đạp xe qua ruộng.", "Farm for a morning, cycle through fields.", ""),
        ("ha-an-bang", "Biển An Bàng", "An Bang Beach", 15.9133, 108.3405, "Cẩm An", "relax nature", "afternoon", 120, 0, 1, "Bãi biển yên bình, quán ven cát.", "A peaceful beach with sandy cafes.", "water"),
        ("ha-thanh-ha", "Làng gốm Thanh Hà", "Thanh Ha Pottery Village", 15.8780, 108.3020, "Thanh Hà", "culture shopping", "afternoon", 75, 35000, 1, "Làng gốm ven sông Thu Bồn.", "Riverside pottery village.", ""),
        ("ha-my-son", "Thánh địa Mỹ Sơn", "My Son Sanctuary", 15.7640, 108.1240, "Duy Phú, Duy Xuyên", "culture adventure photo", "day", 240, 150000, 2, "Quần thể đền tháp Chăm giữa thung lũng.", "Cham temple towers in a jungle valley.", ""),
        ("ha-may-do", "May đo áo dài & chợ vải", "Tailor shops & cloth market", 15.8789, 108.3312, "Trần Phú, Minh An", "shopping", "afternoon", 60, 0, 1, "May áo dài lấy trong ngày.", "Same-day tailored ao dai.", ""),
        ("ha-ca-phe", "Cà phê trên gác phố cổ", "Old-town attic cafe", 15.8775, 108.3280, "Nguyễn Thái Học, Minh An", "cafe relax photo", "any", 50, 45000, 1, "Nhìn mái ngói rêu từ trên cao.", "Mossy rooftops from above.", ""),
        ("ha-banh-mi", "Bánh mì Phượng", "Banh Mi Phuong", 15.8792, 108.3315, "2B Phan Châu Trinh", "food", "lunch", 30, 35000, 1, "Ổ bánh mì nổi tiếng thế giới.", "A world-famous banh mi.", "crowd"),
        ("ha-com-ga", "Cơm gà Bà Buội", "Ba Buoi chicken rice", 15.8790, 108.3300, "22 Phan Châu Trinh", "food", "meal", 45, 60000, 1, "Cơm gà xé vàng ươm.", "Golden shredded chicken rice.", ""),
        ("ha-cao-lau", "Cao lầu & mì Quảng phố Hội", "Cao lau & Quang noodles", 15.8770, 108.3270, "Trần Phú, Minh An", "food", "dinner", 50, 60000, 1, "Sợi cao lầu dai, giòn tóp mỡ.", "Chewy cao lau with crispy crackling.", ""),
    ],
    "hue": [
        ("hu-dai-noi", "Đại Nội – Hoàng thành Huế", "Imperial City (Dai Noi)", 16.4698, 107.5790, "23 tháng 8, Phú Hậu", "culture photo", "morning", 180, 200000, 2, "Cung điện triều Nguyễn uy nghi.", "The Nguyen dynasty's grand palace.", ""),
        ("hu-thien-mu", "Chùa Thiên Mụ", "Thien Mu Pagoda", 16.4532, 107.5447, "Kim Long", "culture photo relax", "afternoon", 60, 0, 1, "Tháp Phước Duyên bên sông Hương.", "Phuoc Duyen tower above the river.", ""),
        ("hu-tu-duc", "Lăng Tự Đức", "Tu Duc Tomb", 16.4334, 107.5641, "Thủy Xuân", "culture nature photo", "day", 90, 150000, 1, "Lăng tẩm thơ mộng nhất Huế.", "Hue's most poetic royal tomb.", ""),
        ("hu-khai-dinh", "Lăng Khải Định", "Khai Dinh Tomb", 16.3990, 107.5904, "Thủy Bằng, Hương Thủy", "culture photo adventure", "day", 75, 150000, 2, "Khảm sành sứ cầu kỳ, 127 bậc thang.", "Intricate mosaics up 127 steps.", ""),
        ("hu-ca-hue", "Ca Huế trên sông Hương", "Hue songs on the Perfume River", 16.4673, 107.5915, "Bến Tòa Khâm, Lê Lợi", "culture nightlife relax", "evening", 75, 150000, 1, "Nhã nhạc trên thuyền rồng.", "Royal music aboard a dragon boat.", "water"),
        ("hu-dong-ba", "Chợ Đông Ba", "Dong Ba Market", 16.4729, 107.5880, "Trần Hưng Đạo", "shopping food", "afternoon", 60, 0, 1, "Nón lá, mè xửng, đặc sản cố đô.", "Conical hats and sesame candy.", "crowd"),
        ("hu-truong-tien", "Cầu Trường Tiền", "Truong Tien Bridge", 16.4685, 107.5906, "Lê Lợi", "photo", "evening", 30, 0, 1, "Cây cầu đổi màu soi bóng sông.", "A colour-shifting bridge on the river.", ""),
        ("hu-vong-canh", "Đồi Vọng Cảnh", "Vong Canh Hill", 16.4231, 107.5640, "Thủy Biều", "nature photo relax", "afternoon", 60, 0, 2, "Ngắm sông Hương uốn lượn lúc hoàng hôn.", "Sunset over the winding river.", ""),
        ("hu-dam-chuon", "Đầm Chuồn", "Chuon Lagoon", 16.5355, 107.6537, "Phú An, Phú Vang", "nature food photo", "day", 150, 150000, 1, "Hoàng hôn trên phá và hải sản tươi.", "Lagoon sunset and fresh seafood.", "water seafood"),
        ("hu-ca-phe-muoi", "Cà phê muối Huế", "Hue salt coffee", 16.4660, 107.5960, "Nguyễn Lương Bằng", "cafe", "any", 40, 35000, 1, "Vị mặn béo độc đáo.", "A unique salty-creamy coffee.", ""),
        ("hu-bun-bo", "Bún bò Huế gia truyền", "Heritage bun bo Hue", 16.4615, 107.5935, "Lý Thường Kiệt", "food", "lunch", 45, 50000, 1, "Nước dùng sả ớt thơm lừng.", "Lemongrass-chilli beef noodle soup.", ""),
        ("hu-com-hen", "Cơm hến Cồn Hến", "Con Hen clam rice", 16.4770, 107.5950, "Cồn Hến, Vỹ Dạ", "food", "meal", 40, 30000, 1, "Món dân dã nổi tiếng.", "A humble local classic.", "seafood"),
        ("hu-banh-hue", "Bánh bèo – nậm – lọc", "Hue steamed rice cakes", 16.4690, 107.5980, "Nguyễn Công Trứ", "food", "dinner", 60, 70000, 1, "Bộ ba bánh xứ Huế.", "Hue's trio of rice cakes.", ""),
        ("hu-pho-di-bo", "Phố đi bộ Nguyễn Đình Chiểu", "Nguyen Dinh Chieu walking street", 16.4672, 107.5930, "Nguyễn Đình Chiểu", "nightlife relax", "evening", 60, 0, 1, "Dạo bờ sông, ăn chè đêm.", "Riverside stroll and night desserts.", ""),
    ],
    "dalat": [
        ("dl-xuan-huong", "Hồ Xuân Hương", "Xuan Huong Lake", 11.9425, 108.4430, "Trung tâm Đà Lạt", "relax nature photo", "morning", 60, 0, 1, "Đạp vịt, đi bộ quanh hồ sương sớm.", "Morning mist walk around the lake.", ""),
        ("dl-cho", "Chợ Đà Lạt & chợ đêm", "Da Lat Market & night market", 11.9430, 108.4370, "Nguyễn Thị Minh Khai", "shopping food nightlife", "evening", 90, 100000, 1, "Bánh tráng nướng, sữa đậu nành nóng.", "Grilled rice paper and hot soy milk.", "crowd"),
        ("dl-truc-lam", "Thiền viện Trúc Lâm", "Truc Lam Zen Monastery", 11.9016, 108.4344, "Hồ Tuyền Lâm", "culture nature relax", "morning", 90, 0, 1, "Thiền viện yên tĩnh bên hồ.", "A tranquil lakeside monastery.", ""),
        ("dl-cau-dat", "Đồi chè Cầu Đất", "Cau Dat tea hills", 11.8434, 108.5682, "Xuân Trường", "nature photo", "morning", 120, 0, 1, "Đồi chè trăm năm trong sương.", "Century-old tea hills in the mist.", ""),
        ("dl-datanla", "Thác Datanla (máng trượt)", "Datanla Falls (alpine coaster)", 11.9018, 108.4494, "Đèo Prenn", "adventure nature", "day", 120, 250000, 2, "Máng trượt xuyên rừng thông.", "Alpine coaster through pine forest.", "water"),
        ("dl-ga", "Ga Đà Lạt", "Da Lat Railway Station", 11.9418, 108.4544, "1 Quang Trung", "photo culture", "day", 45, 10000, 1, "Nhà ga Art Deco cổ kính.", "A charming Art Deco station.", ""),
        ("dl-dinh-3", "Dinh Bảo Đại III", "Bao Dai's Summer Palace", 11.9300, 108.4300, "Triệu Việt Vương", "culture", "day", 60, 40000, 1, "Dinh thự mùa hè của vị vua cuối.", "The last emperor's summer villa.", ""),
        ("dl-nha-tho", "Nhà thờ Con Gà", "Rooster Church", 11.9364, 108.4378, "15 Trần Phú", "culture photo", "any", 30, 0, 1, "Nhà thờ hồng biểu tượng.", "The iconic pink cathedral.", ""),
        ("dl-langbiang", "Núi Langbiang", "Langbiang Mountain", 12.0450, 108.4380, "Lạc Dương", "adventure nature photo", "day", 180, 100000, 3, "Chinh phục nóc nhà Đà Lạt.", "Summit Da Lat's highest peak.", ""),
        ("dl-lam-vien", "Quảng trường Lâm Viên", "Lam Vien Square", 11.9393, 108.4447, "Trần Quốc Toản", "photo relax", "afternoon", 40, 0, 1, "Nụ hoa dã quỳ khổng lồ.", "Giant wild-sunflower sculptures.", ""),
        ("dl-vuon-hoa", "Vườn hoa thành phố", "City Flower Garden", 11.9495, 108.4485, "Trần Nhân Tông", "nature photo relax", "afternoon", 75, 50000, 1, "Muôn loài hoa xứ lạnh.", "Countless cool-climate blooms.", ""),
        ("dl-tuyen-lam", "Hồ Tuyền Lâm", "Tuyen Lam Lake", 11.8950, 108.4300, "Phường 3", "relax nature", "afternoon", 90, 0, 1, "Mặt hồ phẳng lặng giữa rừng thông.", "Still waters among pine forest.", "water"),
        ("dl-ca-phe-tung", "Cà phê Tùng", "Cafe Tung", 11.9420, 108.4366, "6 Khu Hòa Bình", "cafe relax", "any", 45, 35000, 1, "Quán cà phê hoài cổ từ 1960.", "A nostalgic cafe since 1960.", ""),
        ("dl-lau-ga", "Lẩu gà lá é", "Chicken hotpot with e leaves", 11.9480, 108.4380, "Tăng Bạt Hổ", "food", "dinner", 75, 150000, 1, "Món lẩu ấm áp ngày se lạnh.", "A warming hotpot for cool nights.", ""),
        ("dl-banh-can", "Bánh căn Đà Lạt", "Da Lat banh can", 11.9445, 108.4390, "Nhà Chung", "food", "lunch", 40, 45000, 1, "Bánh căn nóng chấm xíu mại.", "Hot rice cakes with meatball broth.", ""),
        ("dl-nem-nuong", "Nem nướng Bà Hùng", "Ba Hung grilled pork rolls", 11.9435, 108.4342, "328 Phan Đình Phùng", "food", "meal", 45, 70000, 1, "Nem nướng cuốn bánh tráng.", "Grilled pork rolled in rice paper.", ""),
    ],
    "hcm": [
        ("sg-duc-ba", "Nhà thờ Đức Bà & Bưu điện Thành phố", "Notre-Dame Cathedral & Central Post Office", 10.7798, 106.6990, "Công xã Paris, Quận 1", "culture photo", "morning", 60, 0, 1, "Kiến trúc Pháp giữa trung tâm.", "French landmarks at the city's heart.", "crowd"),
        ("sg-dinh-doc-lap", "Dinh Độc Lập", "Independence Palace", 10.7770, 106.6953, "135 Nam Kỳ Khởi Nghĩa, Quận 1", "culture", "morning", 90, 65000, 1, "Chứng nhân lịch sử 1975.", "A witness to the events of 1975.", ""),
        ("sg-ben-thanh", "Chợ Bến Thành", "Ben Thanh Market", 10.7725, 106.6980, "Lê Lợi, Quận 1", "shopping food", "afternoon", 75, 0, 1, "Biểu tượng mua sắm Sài Gòn.", "Saigon's shopping icon.", "crowd"),
        ("sg-chung-tich", "Bảo tàng Chứng tích Chiến tranh", "War Remnants Museum", 10.7795, 106.6921, "28 Võ Văn Tần, Quận 3", "culture", "day", 100, 40000, 1, "Bảo tàng lịch sử sâu sắc.", "A profound history museum.", ""),
        ("sg-nguyen-hue", "Phố đi bộ Nguyễn Huệ", "Nguyen Hue walking street", 10.7740, 106.7038, "Nguyễn Huệ, Quận 1", "nightlife photo relax", "evening", 60, 0, 1, "Quảng trường sáng đèn bên sông.", "A lit-up boulevard toward the river.", "crowd"),
        ("sg-bui-vien", "Phố Tây Bùi Viện", "Bui Vien street", 10.7670, 106.6930, "Bùi Viện, Quận 1", "nightlife food", "evening", 90, 200000, 1, "Âm nhạc và đám đông tới sáng.", "Music and crowds until dawn.", "crowd late"),
        ("sg-landmark", "Landmark 81 SkyView", "Landmark 81 SkyView", 10.7950, 106.7218, "Bình Thạnh", "photo adventure", "evening", 75, 400000, 1, "Ngắm thành phố từ tầng 79.", "City views from the 79th floor.", ""),
        ("sg-cu-chi", "Địa đạo Củ Chi", "Cu Chi Tunnels", 11.1418, 106.4614, "Phú Hiệp, Củ Chi", "culture adventure", "day", 240, 125000, 3, "Hệ thống địa đạo huyền thoại.", "The legendary tunnel network.", ""),
        ("sg-cho-lon", "Chợ Lớn & Chùa Bà Thiên Hậu", "Cholon & Thien Hau Temple", 10.7533, 106.6612, "Nguyễn Trãi, Quận 5", "culture photo shopping", "afternoon", 90, 0, 1, "Khu người Hoa sầm uất.", "The bustling Chinatown.", ""),
        ("sg-thao-cam-vien", "Thảo Cầm Viên", "Saigon Zoo & Botanical Gardens", 10.7875, 106.7053, "2 Nguyễn Bỉnh Khiêm, Quận 1", "nature relax", "morning", 120, 60000, 1, "Vườn thú và cây cổ thụ trăm năm.", "Zoo and century-old trees.", ""),
        ("sg-my-thuat", "Bảo tàng Mỹ thuật", "Fine Arts Museum", 10.7696, 106.6992, "97A Phó Đức Chính, Quận 1", "culture photo", "afternoon", 75, 30000, 1, "Dinh thự cổ với nghệ thuật Việt.", "A mansion full of Vietnamese art.", ""),
        ("sg-ca-phe-42", "Chung cư cà phê 42 Nguyễn Huệ", "42 Nguyen Hue cafe apartment", 10.7738, 106.7040, "42 Nguyễn Huệ, Quận 1", "cafe photo", "any", 50, 55000, 1, "Tòa chung cư cũ toàn quán cà phê.", "An old block full of cafes.", ""),
        ("sg-com-tam", "Cơm tấm Sài Gòn", "Saigon broken rice", 10.7860, 106.6900, "Quận 3", "food", "lunch", 45, 60000, 1, "Sườn nướng, bì, chả trứng.", "Grilled pork chop on broken rice.", ""),
        ("sg-banh-mi", "Bánh mì Huỳnh Hoa", "Huynh Hoa banh mi", 10.7710, 106.6920, "26 Lê Thị Riêng, Quận 1", "food", "meal", 30, 70000, 1, "Ổ bánh mì đầy ắp nhân.", "A famously overstuffed banh mi.", "crowd"),
        ("sg-oc", "Phố ốc Vĩnh Khánh", "Vinh Khanh snail street", 10.7600, 106.7030, "Vĩnh Khánh, Quận 4", "food nightlife", "dinner", 90, 200000, 1, "Hàng trăm món ốc, nhộn nhịp về đêm.", "Hundreds of snail dishes at night.", "seafood late"),
    ],
    "sapa": [
        ("sp-fansipan", "Fansipan – Nóc nhà Đông Dương", "Fansipan – Roof of Indochina", 22.3033, 103.7750, "Sun World Fansipan Legend", "adventure nature photo", "day", 300, 850000, 2, "Cáp treo lên đỉnh 3.143m.", "Cable car to the 3,143m summit.", "crowd"),
        ("sp-cat-cat", "Bản Cát Cát", "Cat Cat Village", 22.3290, 103.8320, "San Sả Hồ", "culture photo nature", "morning", 120, 150000, 2, "Bản H'Mông bên thác nước.", "A H'Mong village by a waterfall.", "crowd"),
        ("sp-nha-tho-da", "Nhà thờ đá Sa Pa", "Sa Pa Stone Church", 22.3355, 103.8424, "Trung tâm thị xã", "culture photo", "any", 30, 0, 1, "Nhà thờ cổ giữa thị trấn mây.", "An old church in the cloud town.", ""),
        ("sp-ham-rong", "Núi Hàm Rồng", "Ham Rong Mountain", 22.3340, 103.8460, "Trung tâm Sa Pa", "nature photo adventure", "morning", 120, 70000, 2, "Vườn hoa và sân mây trên núi.", "Flower gardens and cloud yards.", ""),
        ("sp-muong-hoa", "Thung lũng Mường Hoa", "Muong Hoa Valley", 22.3000, 103.8800, "Hầu Thào", "nature photo adventure", "day", 180, 0, 3, "Ruộng bậc thang trải dài.", "Endless rice terraces.", ""),
        ("sp-ta-van", "Bản Tả Van", "Ta Van Village", 22.3050, 103.8930, "Tả Van", "culture nature", "afternoon", 120, 75000, 2, "Homestay người Giáy, đường đất ven ruộng.", "Giay homestays on paddy paths.", ""),
        ("sp-lao-chai", "Bản Lao Chải", "Lao Chai Village", 22.3110, 103.8750, "Lao Chải", "culture adventure", "morning", 120, 75000, 3, "Trekking qua bản làng.", "Trek through hill villages.", ""),
        ("sp-thac-bac", "Thác Bạc", "Silver Waterfall", 22.3570, 103.7760, "QL4D", "nature photo", "afternoon", 60, 20000, 1, "Dòng thác trắng giữa núi.", "A silver cascade in the mountains.", ""),
        ("sp-o-quy-ho", "Đèo Ô Quy Hồ", "O Quy Ho Pass", 22.3500, 103.7700, "QL4D", "photo adventure nature", "afternoon", 90, 0, 2, "Hoàng hôn trên đèo dài nhất.", "Sunset on the longest pass.", ""),
        ("sp-ho", "Hồ Sa Pa", "Sa Pa Lake", 22.3375, 103.8435, "Trung tâm Sa Pa", "relax photo", "any", 45, 0, 1, "Đi dạo quanh hồ trong sương.", "Misty lakeside walk.", ""),
        ("sp-cho", "Chợ Sa Pa", "Sa Pa Market", 22.3370, 103.8380, "Trung tâm Sa Pa", "shopping food culture", "afternoon", 60, 0, 1, "Thổ cẩm, rau rừng, đặc sản núi.", "Brocade, mountain herbs and food.", "crowd"),
        ("sp-ca-phe", "Cà phê view thung lũng", "Valley-view cafe", 22.3320, 103.8400, "Mường Hoa", "cafe relax photo", "any", 50, 50000, 1, "Ngắm mây trôi qua núi.", "Watch clouds drift over peaks.", ""),
        ("sp-nuong", "Đồ nướng chợ đêm Sa Pa", "Sa Pa night grill", 22.3360, 103.8420, "Trung tâm Sa Pa", "food nightlife", "dinner", 75, 150000, 1, "Trứng nướng, cơm lam, thịt xiên.", "Grilled eggs, bamboo rice, skewers.", "late"),
        ("sp-lau-ca-hoi", "Lẩu cá hồi Sa Pa", "Sa Pa salmon hotpot", 22.3380, 103.8410, "Trung tâm Sa Pa", "food", "dinner", 75, 250000, 1, "Cá hồi nuôi nước lạnh.", "Cold-water farmed salmon hotpot.", "seafood"),
        ("sp-thang-co", "Thắng cố & phở chua", "Thang co & sour noodles", 22.3365, 103.8390, "Trung tâm Sa Pa", "food", "lunch", 45, 70000, 1, "Hương vị vùng cao.", "Highland flavours.", ""),
    ],
}

PLACES = {}
PLACES_BY_DEST = {}


def _build():
    for dest_id, rows in _RAW.items():
        lst = []
        for r in rows:
            (pid, vi, en, lat, lng, addr, tags, slot, dur, cost, inten, dvi, den, flags) = r
            p = {
                "id": pid, "dest": dest_id, "name": {"vi": vi, "en": en},
                "lat": lat, "lng": lng, "address": addr, "tags": tags.split(),
                "slot": slot, "duration": dur, "cost": cost, "intensity": inten,
                "desc": {"vi": dvi, "en": den}, "flags": flags.split(),
                "meal": slot in ("lunch", "dinner", "meal"),
                "verified": True, "source": "wayplot-directory",
            }
            PLACES[pid] = p
            lst.append(p)
        PLACES_BY_DEST[dest_id] = lst


_build()


def strip_accents(s: str) -> str:
    import unicodedata
    s = s.replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower().strip()


def find_destination(text: str):
    """Resolve free text ("Ha Noi", "Hội An") to a destination id."""
    if not text:
        return None
    if text in DESTINATIONS:
        return text
    q = strip_accents(text)
    for did, d in DESTINATIONS.items():
        if q in (strip_accents(d["vi"]), strip_accents(d["en"])) or q in d["aliases"]:
            return did
    for did, d in DESTINATIONS.items():
        if any(q in a or a in q for a in d["aliases"] + [strip_accents(d["vi"])]):
            return did
    return None


def destination_public(did):
    d = DESTINATIONS[did]
    return {
        "id": did, "name": {"vi": d["vi"], "en": d["en"]},
        "region": {"vi": d["region_vi"], "en": d["region_en"]},
        "tagline": {"vi": d["tag_vi"], "en": d["tag_en"]},
        "lat": d["lat"], "lng": d["lng"], "featured": d["featured"],
        "place_count": len(PLACES_BY_DEST.get(did, [])),
    }


FEATURED_ITINERARIES = [
    {"id": "f-hanoi", "dest": "hanoi", "days": 3, "price": 3500000, "new": True,
     "name": {"vi": "Hà Nội 36 phố phường", "en": "Hanoi's 36 Guild Streets"},
     "pace": "balanced", "interests": ["culture", "food", "cafe"]},
    {"id": "f-halong", "dest": "halong", "days": 2, "price": 4200000, "new": True,
     "name": {"vi": "Hạ Long – Một ngày trên vịnh", "en": "Ha Long – A day on the bay"},
     "pace": "slow", "interests": ["nature", "photo", "relax"]},
    {"id": "f-danang", "dest": "danang", "days": 4, "price": 5800000, "new": False,
     "name": {"vi": "Đà Nẵng biển xanh & Bà Nà", "en": "Da Nang beaches & Ba Na"},
     "pace": "balanced", "interests": ["nature", "adventure", "food"]},
    {"id": "f-hoian", "dest": "hoian", "days": 3, "price": 3200000, "new": False,
     "name": {"vi": "Hội An đèn lồng & làng nghề", "en": "Hoi An lanterns & craft villages"},
     "pace": "slow", "interests": ["culture", "photo", "food"]},
]
