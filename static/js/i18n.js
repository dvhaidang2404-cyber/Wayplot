// VI is the default language; EN switches every string instantly (no reload).
import { store } from "./store.js";

const D = {
  // shell
  "nav.home": ["Trang chủ", "Home"], "nav.plan": ["Lập kế hoạch", "Plan a trip"], "nav.trips": ["Chuyến đi của tôi", "My trips"], "nav.plan_s": ["Kế hoạch", "Plan"], "nav.trips_s": ["Chuyến đi", "Trips"],
  "nav.explore": ["Khám phá", "Explore"], "nav.profile": ["Hồ sơ", "Profile"], "nav.overview": ["Tổng quan", "Overview"],
  "nav.login": ["Đăng nhập", "Sign in"], "nav.register": ["Đăng ký", "Sign up"], "brand.sub": ["Hành trình Việt", "Journeys of Vietnam"],
  "announce": ["Ưu đãi mùa lễ hội · Tạo phòng nhóm miễn phí, mời cả hội cùng lên lịch trình", "Festive season · Group rooms are free — plan together with everyone"],
  "close": ["Đóng", "Close"], "cancel": ["Hủy", "Cancel"], "save": ["Lưu", "Save"], "back": ["Quay lại", "Back"], "next": ["Tiếp tục", "Continue"],
  "retry": ["Thử lại", "Retry"], "open": ["Mở", "Open"], "view_all": ["Xem tất cả", "View all"], "confirm": ["Xác nhận", "Confirm"],
  "loading": ["Đang tải…", "Loading…"], "optional": ["Tùy chọn", "Optional"], "required": ["Bắt buộc", "Required"], "or": ["hoặc", "or"],
  "glass.title": ["Tùy chỉnh kính", "Adjust glass"], "glass.blur": ["Độ mờ kính", "Glass blur"], "glass.opacity": ["Độ đậm của kính", "Glass tint"],
  "glass.theme": ["Tông màu", "Tone"], "glass.burgundy": ["Đỏ đô", "Burgundy"], "glass.cream": ["Kem", "Cream"], "glass.scene": ["Phông nền di sản", "Heritage backdrop"],
  "glass.reduce": ["Giảm hiệu ứng trong suốt", "Reduce transparency"], "glass.reset": ["Mặc định", "Reset"],
  "scene.halong": ["Hạ Long", "Ha Long"], "scene.hoian": ["Hội An", "Hoi An"], "scene.sapa": ["Sa Pa", "Sa Pa"],
  "notif.title": ["Thông báo", "Notifications"], "notif.mark": ["Đánh dấu đã đọc", "Mark all read"], "notif.empty": ["Chưa có thông báo nào.", "No notifications yet."],
  "notif.invite": ["{from} mời bạn tham gia “{trip}” — mã {code}", "{from} invited you to “{trip}” — code {code}"],
  "notif.member_joined": ["{name} đã tham gia “{trip}”", "{name} joined “{trip}”"],
  "notif.all_ready": ["Mọi thành viên “{trip}” đã sẵn sàng — bạn có thể tạo kế hoạch", "Everyone in “{trip}” is ready — you can generate plans"],
  "notif.ready_reminder": ["{from} nhắc bạn hoàn tất sở thích cho “{trip}”", "{from} reminded you to finish your preferences for “{trip}”"],
  "notif.plans_ready": ["Kế hoạch cho “{trip}” đã sẵn sàng để xem", "Plans for “{trip}” are ready to review"],
  "notif.comment": ["{by} đã {kind} trong “{trip}”: {excerpt}", "{by} left a {kind} on “{trip}”: {excerpt}"],
  "notif.kind.comment": ["bình luận", "comment"], "notif.kind.suggestion": ["đề xuất chỉnh sửa", "suggestion"],
  "notif.itinerary_updated": ["{by} đã cập nhật lịch trình “{trip}” (phiên bản {version})", "{by} updated “{trip}” (version {version})"],
  "notif.finalized": ["{by} đã chốt kế hoạch “{trip}” — đã lưu vào Chuyến đi của bạn", "{by} finalized “{trip}” — saved to your trips"],
  "notif.leader_transferred": ["{from} đã chuyển quyền Trưởng nhóm “{trip}” cho bạn", "{from} made you the leader of “{trip}”"],
  "menu.account": ["Tài khoản", "Account"], "menu.demo": ["Tài khoản demo", "Demo accounts"], "menu.logout": ["Đăng xuất", "Sign out"],
  "menu.switched": ["Đã chuyển sang {name}", "Switched to {name}"],

  // errors
  "err.required": ["Vui lòng điền thông tin này.", "Please fill this in."],
  "err.email_format": ["Email chưa đúng định dạng (ví dụ ten@mien.com).", "Email format looks wrong (e.g. name@domain.com)."],
  "err.email_taken": ["Email này đã được đăng ký. Hãy đăng nhập.", "This email is already registered. Please sign in."],
  "err.password_weak": ["Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.", "Password needs at least 8 characters with letters and numbers."],
  "err.password_mismatch": ["Hai mật khẩu chưa khớp.", "Passwords don't match."],
  "err.agree_required": ["Bạn cần đồng ý với điều khoản để tiếp tục.", "Please accept the terms to continue."],
  "err.invalid_credentials": ["Email hoặc mật khẩu chưa đúng.", "Email or password is incorrect."],
  "err.wrong_password": ["Mật khẩu hiện tại chưa đúng.", "Current password is incorrect."],
  "err.unsupported_destination": ["Wayplot chưa hỗ trợ điểm đến này. Hãy chọn từ danh sách gợi ý.", "This destination isn't supported yet. Pick one from the suggestions."],
  "err.date_order": ["Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.", "End date must be on or after the start date."],
  "err.too_long": ["Chuyến đi tối đa 10 ngày trong bản hiện tại.", "Trips are limited to 10 days for now."],
  "err.in_past": ["Ngày bắt đầu không được ở quá khứ.", "Start date can't be in the past."],
  "err.range": ["Giá trị nằm ngoài khoảng cho phép.", "Value is out of the allowed range."],
  "err.budget_format": ["Ngân sách chỉ gồm chữ số, ví dụ 3500000.", "Budget must be digits only, e.g. 3500000."],
  "err.budget_range": ["Ngân sách chưa hợp lệ.", "Budget is not valid."],
  "err.too_long_text": ["Nội dung quá dài.", "Text is too long."],
  "err.invalid": ["Giá trị chưa hợp lệ.", "Invalid value."],
  "err.network": ["Mất kết nối mạng. Dữ liệu bạn nhập vẫn được giữ — hãy thử lại.", "Network problem. Your input is kept — please retry."],
  "err.generic": ["Có lỗi xảy ra. Vui lòng thử lại.", "Something went wrong. Please try again."],
  "err.forbidden": ["Bạn không có quyền truy cập nội dung này.", "You don't have access to this."],
  "err.not_found": ["Không tìm thấy nội dung.", "Not found."],
  "err.code_not_found": ["Không tìm thấy mã mời. Hãy kiểm tra lại từng ký tự.", "Invite code not found. Please check each character."],
  "err.code_expired": ["Mã mời đã hết hạn. Hãy xin mã mới từ Trưởng nhóm {leader}.", "This invite code has expired. Ask the leader {leader} for a new one."],
  "err.room_closed": ["Phòng hành trình đã đóng, không thể tham gia thêm.", "This trip room is closed to new members."],
  "err.room_full": ["Phòng đã đủ {max} thành viên.", "The room is full ({max} members)."],
  "err.already_member": ["Bạn đã là thành viên của phòng này.", "You're already a member of this room."],
  "err.rate_limited": ["Bạn thử quá nhiều lần. Vui lòng đợi vài phút.", "Too many attempts. Please wait a few minutes."],
  "err.leader_only": ["Chỉ Trưởng nhóm mới thực hiện được thao tác này.", "Only the group leader can do this."],
  "err.edit_forbidden": ["Bạn chưa được cấp quyền chỉnh sửa. Hãy gửi đề xuất trong phần Thảo luận.", "You don't have edit rights. Send a suggestion in Discussion instead."],
  "err.submission_required": ["Hãy gửi sở thích trước khi đánh dấu Sẵn sàng.", "Submit your preferences before marking ready."],
  "err.not_all_ready": ["Còn thành viên chưa sẵn sàng.", "Some members are not ready yet."],
  "err.no_ready_members": ["Chưa có thành viên nào sẵn sàng.", "Nobody is ready yet."],
  "err.vip_required": ["Ba kế hoạch chỉ dành cho gói VIP.", "Three plans require VIP."],
  "err.quota_exceeded": ["Bạn đã dùng hết lượt tạo trong kỳ này.", "You've used all generations for this period."],
  "err.leader_must_transfer": ["Trưởng nhóm cần chuyển quyền cho người khác trước khi rời phòng.", "Transfer leadership before leaving the room."],
  "err.last_member_close_instead": ["Bạn là thành viên cuối cùng — hãy đóng phòng thay vì rời đi.", "You're the last member — close the room instead."],
  "err.ai_failed": ["AI chưa chỉnh được lịch trình. Lượt dùng không bị trừ — hãy thử lại.", "AI couldn't refine the plan. No quota was used — try again."],
  "err.version_conflict": ["Có người vừa cập nhật lịch trình.", "Someone just updated this itinerary."],
  "err.owner_only": ["Chỉ người tạo chuyến đi mới làm được việc này.", "Only the trip owner can do this."],

  // landing
  "land.title1": ["Hành trình Việt,", "Journeys of Vietnam,"], "land.title2": ["cùng nhau trọn vẹn", "complete together"],
  "land.feat1": ["Lịch trình AI", "AI itinerary"], "land.feat2": ["Bản đồ", "Maps"], "land.feat3": ["Ngân sách", "Budget"], "land.feat4": ["Phòng nhóm", "Group rooms"],
  "land.lead": ["Nhập điểm đến, ngày đi, ngân sách và sở thích — Wayplot đề xuất lịch trình theo từng ngày, xác minh địa điểm trên bản đồ và ước tính chi phí. Đi theo nhóm? Mỗi người gửi sở thích riêng, AI tổng hợp thành kế hoạch chung.",
    "Enter a destination, dates, budget and interests — Wayplot suggests a day-by-day itinerary, verifies places on the map and estimates costs. Travelling as a group? Everyone submits their own preferences and AI blends them into one plan."],
  "land.cta": ["Bắt đầu lên kế hoạch", "Start planning"], "land.join": ["Tôi có mã mời", "I have an invite code"],
  "land.dest": ["Điểm đến", "Destinations"], "land.featured": ["Hành trình được yêu thích", "Loved itineraries"],
  "land.new": ["Mới", "New"], "land.per_person": ["/người", "/person"], "land.days": ["{n} ngày", "{n} days"],
  "land.see_all": ["Xem tất cả hành trình", "See all itineraries"],
  "land.b1": ["Lịch trình AI", "AI itineraries"], "land.b1d": ["Theo từng ngày, đúng nhịp độ và sở thích của bạn.", "Day by day, matched to your pace and interests."],
  "land.b2": ["Bản đồ xác thực", "Verified maps"], "land.b2d": ["Địa điểm được xác minh, không bịa tọa độ.", "Places are verified — no invented coordinates."],
  "land.b3": ["Ngân sách rõ ràng", "Clear budgets"], "land.b3d": ["Ước tính theo hạng mục, nêu rõ giả định.", "Estimates by category with clear assumptions."],
  "land.b4": ["Phòng nhóm", "Group rooms"], "land.b4d": ["Mỗi người một tiếng nói, một kế hoạch chung.", "Everyone has a say, one shared plan."],
  "land.block1": ["Lịch trình riêng", "Your own journey"], "land.block1d": ["Một mình hay cùng người thương — lịch trình cá nhân hóa trong vài phút.", "Solo or with someone special — a personalised plan in minutes."],
  "land.block2": ["Phòng hành trình", "Trip room"], "land.block2d": ["Tạo phòng, chia sẻ mã mời, chờ cả nhóm sẵn sàng rồi để AI tổng hợp.", "Create a room, share the code, wait until everyone's ready, then let AI blend it all."],
  "land.explore": ["Khám phá", "Explore"], "land.create_room": ["Tạo phòng", "Create room"],
  "land.news": ["Nhận gợi ý hành trình mỗi tháng", "Get monthly itinerary ideas"], "land.news_ph": ["Email của bạn", "Your email"],
  "land.subscribe": ["Đăng ký", "Subscribe"], "land.subscribed": ["Cảm ơn bạn! Gợi ý sẽ sớm đến hộp thư.", "Thank you! Ideas are on their way."],
  "foot.about": ["Giới thiệu", "About"], "foot.help": ["Trợ giúp", "Help"], "foot.terms": ["Điều khoản", "Terms"], "foot.privacy": ["Quyền riêng tư", "Privacy"], "foot.contact": ["Liên hệ", "Contact"],
  "land.sample": ["Giá, tên hành trình và số liệu trên trang là dữ liệu minh họa.", "Prices, names and figures on this page are illustrative."],

  // auth
  "auth.login": ["Đăng nhập", "Sign in"], "auth.register": ["Tạo tài khoản", "Create account"], "auth.welcome": ["Chào mừng trở lại", "Welcome back"],
  "auth.join_us": ["Bắt đầu hành trình", "Begin your journey"], "auth.email": ["Email", "Email"], "auth.password": ["Mật khẩu", "Password"],
  "auth.name": ["Họ và tên", "Full name"], "auth.confirm": ["Xác nhận mật khẩu", "Confirm password"],
  "auth.agree": ["Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Wayplot.", "I agree to Wayplot's Terms of Use and Privacy Policy."],
  "auth.forgot": ["Quên mật khẩu?", "Forgot password?"], "auth.show": ["Hiện mật khẩu", "Show password"], "auth.hide": ["Ẩn mật khẩu", "Hide password"],
  "auth.no_account": ["Chưa có tài khoản?", "No account yet?"], "auth.have_account": ["Đã có tài khoản?", "Already have an account?"],
  "auth.forgot_title": ["Khôi phục mật khẩu", "Reset password"], "auth.forgot_text": ["Nhập email đã đăng ký. Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến bạn.", "Enter your email. If an account exists, reset instructions will be sent."],
  "auth.forgot_sent": ["Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn trong ít phút.", "If that email exists, you'll receive instructions shortly."],
  "auth.send": ["Gửi hướng dẫn", "Send instructions"], "auth.art": ["Mỗi chuyến đi là một câu chuyện — hãy để cả nhóm cùng viết.", "Every trip is a story — write it together."],
  "auth.pw_hint": ["Ít nhất 8 ký tự, gồm chữ và số.", "At least 8 characters with letters and numbers."],

  // dashboard
  "dash.hello": ["Chào {name},", "Hello {name},"], "dash.where": ["Bạn muốn đi đâu tiếp theo?", "Where to next?"],
  "dash.personal": ["Tạo chuyến đi cá nhân", "Create a personal trip"], "dash.personal_d": ["Lịch trình riêng theo nhịp độ, sở thích và ngân sách của bạn.", "A plan shaped by your pace, interests and budget."],
  "dash.group": ["Tạo chuyến đi nhóm", "Create a group trip"], "dash.group_d": ["Mở phòng hành trình, mời bạn bè và để AI tổng hợp sở thích.", "Open a trip room, invite friends and let AI blend everyone's wishes."],
  "dash.join": ["Tham gia nhóm", "Join a group"], "dash.join_d": ["Nhập mã mời từ Trưởng nhóm.", "Enter the invite code from your leader."], "dash.join_btn": ["Tham gia", "Join"],
  "dash.upcoming": ["Chuyến đi sắp tới", "Upcoming trips"], "dash.recent": ["Gần đây", "Recent"], "dash.open_trip": ["Mở chuyến đi", "Open trip"],
  "dash.updated": ["Cập nhật {when}", "Updated {when}"], "dash.empty_t": ["Chưa có chuyến đi nào", "No trips yet"],
  "dash.empty_d": ["Hãy bắt đầu bằng một chuyến đi cá nhân, hoặc mở phòng để cả nhóm cùng lên kế hoạch.", "Start with a personal trip, or open a room so the whole group can plan together."],
  "dash.first": ["Tạo chuyến đi đầu tiên", "Create your first trip"], "dash.updates": ["Cập nhật mới", "Updates"],
  "dash.engine": ["Bộ máy lập lịch: {engine}", "Planner engine: {engine}"],
  "engine.claude": ["Claude AI", "Claude AI"], "engine.local": ["Wayplot nội bộ (không cần khóa API)", "Wayplot built-in (no API key needed)"],

  // trip meta
  "type.personal": ["Cá nhân", "Personal"], "type.group": ["Nhóm", "Group"],
  "status.draft": ["Bản nháp", "Draft"], "status.collecting": ["Đang thu thập sở thích", "Collecting preferences"], "status.planned": ["Có kế hoạch", "Planned"],
  "status.saved": ["Đã lưu", "Saved"], "status.finalized": ["Đã chốt", "Finalized"], "status.closed": ["Đã đóng", "Closed"], "status.archived": ["Đã lưu trữ", "Archived"],
  "room.open": ["Đang mở", "Open"], "room.generating": ["Đang tạo kế hoạch", "Generating"], "room.reviewing": ["Đang xem xét", "Reviewing"],
  "room.finalized": ["Đã chốt", "Finalized"], "room.closed": ["Đã đóng", "Closed"],
  "members_n": ["{n} thành viên", "{n} members"], "travelers_n": ["{n} người", "{n} people"], "days_n": ["{n} ngày", "{n} days"],

  // plan chooser / personal form
  "plan.choose": ["Bạn muốn lên kế hoạch thế nào?", "How would you like to plan?"],
  "pf.title": ["Chuyến đi cá nhân", "Personal trip"], "pf.s1": ["Điểm đến & ngày", "Destination & dates"], "pf.s2": ["Ngân sách", "Budget"],
  "pf.s3": ["Sở thích & phong cách", "Interests & style"], "pf.s4": ["Yêu cầu & xem lại", "Requests & review"],
  "pf.dest": ["Điểm đến", "Destination"], "pf.dest_ph": ["Ví dụ: Hội An, Đà Lạt…", "e.g. Hoi An, Da Lat…"], "pf.start": ["Ngày bắt đầu", "Start date"], "pf.end": ["Ngày kết thúc", "End date"],
  "pf.travelers": ["Số người đi", "Travellers"], "pf.budget": ["Ngân sách", "Budget"], "pf.budget_total": ["Tổng chuyến đi", "Whole trip"], "pf.budget_pp": ["Theo đầu người", "Per person"],
  "pf.amount": ["Số tiền", "Amount"], "pf.currency": ["Tiền tệ", "Currency"], "pf.budget_hint": ["Chưa gồm vé máy bay/tàu đến điểm đến.", "Excludes flights/trains to the destination."],
  "pf.hard": ["Đây là giới hạn cứng — không được vượt", "This is a hard limit — must not be exceeded"],
  "pf.interests": ["Sở thích", "Interests"], "pf.style": ["Phong cách du lịch", "Travel style"], "pf.pace": ["Nhịp độ", "Pace"], "pf.transport": ["Phương tiện ưu tiên", "Preferred transport"],
  "pf.avoid": ["Muốn tránh", "Things to avoid"], "pf.special": ["Yêu cầu đặc biệt", "Special requests"],
  "pf.special_ph": ["Tiếp cận, chế độ ăn, ràng buộc thực tế…", "Accessibility, diet, practical constraints…"],
  "pf.special_private": ["Chỉ bạn và AI đọc được nội dung này, trừ khi bạn bật chia sẻ trong Hồ sơ.", "Only you and the AI can read this, unless you turn on sharing in your Profile."], "sy.shared": ["Ghi chú thành viên chọn chia sẻ", "Notes members chose to share"],
  "pf.submit": ["Tạo lịch trình của tôi", "Create my itinerary"], "pf.review": ["Xem lại yêu cầu", "Review your request"],
  "pf.generating": ["Đang tạo lịch trình…", "Creating your itinerary…"], "pf.quota": ["Còn {n}/{limit} lượt tạo trong tháng", "{n}/{limit} generations left this month"],
  "pf.prefill": ["Đã điền sẵn từ sở thích mặc định trong hồ sơ.", "Prefilled from your saved profile preferences."],
  "pf.title_opt": ["Tên chuyến đi", "Trip name"],
  "i.food": ["Ẩm thực", "Food"], "i.cafe": ["Cà phê", "Cafés"], "i.nature": ["Thiên nhiên", "Nature"], "i.culture": ["Văn hóa", "Culture"],
  "i.shopping": ["Mua sắm", "Shopping"], "i.photo": ["Nhiếp ảnh", "Photography"], "i.adventure": ["Phiêu lưu", "Adventure"],
  "i.nightlife": ["Cuộc sống về đêm", "Nightlife"], "i.relax": ["Thư giãn", "Relaxation"],
  "s.relax": ["Thư giãn", "Relaxed"], "s.explore": ["Khám phá", "Explorer"], "s.experience": ["Trải nghiệm", "Experiences"], "s.saving": ["Tiết kiệm", "Budget-savvy"], "s.mixed": ["Kết hợp", "Mixed"],
  "p.slow": ["Chậm", "Slow"], "p.balanced": ["Cân bằng", "Balanced"], "p.fast": ["Nhanh", "Fast"],
  "p.slow_d": ["~2 điểm chính/ngày, nhiều thời gian nghỉ.", "~2 key stops a day, lots of downtime."],
  "p.balanced_d": ["~3 điểm/ngày, vừa đi vừa nghỉ.", "~3 stops a day, a comfortable mix."],
  "p.fast_d": ["~4 điểm/ngày, khởi hành sớm.", "~4 stops a day, early starts."],
  "t.walk": ["Đi bộ", "Walking"], "t.public": ["Phương tiện công cộng", "Public transport"], "t.car": ["Ô tô / taxi", "Car / taxi"], "t.motorbike": ["Xe máy", "Motorbike"], "t.mixed": ["Kết hợp", "Mixed"],
  "a.hiking": ["Leo dốc cường độ cao", "Strenuous hikes"], "a.crowd": ["Nơi quá đông", "Very crowded spots"], "a.seafood": ["Hải sản", "Seafood"],
  "a.water": ["Hoạt động dưới nước", "Water activities"], "a.late": ["Về khuya", "Late nights"], "a.long_transfer": ["Di chuyển xa", "Long transfers"],

  // group create / join
  "gc.title": ["Tạo chuyến đi nhóm", "Create a group trip"], "gc.name": ["Tên chuyến đi", "Trip name"], "gc.name_ph": ["Ví dụ: Hội An cùng hội bạn", "e.g. Hoi An with friends"],
  "gc.max": ["Số thành viên dự kiến", "Expected members"], "gc.max_hint": ["Từ 2 đến 15 người, gồm cả bạn.", "Between 2 and 15 people, including you."],
  "gc.notes": ["Ghi chú cho cả nhóm", "Note for the group"], "gc.explain": ["Mỗi thành viên sẽ tự gửi ngân sách và sở thích sau khi tham gia — bạn không cần điền thay ai.", "Each member submits their own budget and preferences after joining — you don't fill anything in for them."],
  "gc.submit": ["Tạo phòng hành trình", "Create trip room"], "gc.created": ["Phòng đã sẵn sàng!", "Your room is ready!"],
  "gc.created_d": ["Chia sẻ mã này với cả nhóm. Mã hết hạn sau 24 giờ, bạn có thể tạo lại bất cứ lúc nào.", "Share this code with the group. It expires in 24 hours and you can regenerate it any time."],
  "jn.title": ["Tham gia nhóm", "Join a group"], "jn.code": ["Mã mời", "Invite code"], "jn.example": ["Định dạng: WAY-8K2P9 — có thể dán trực tiếp.", "Format: WAY-8K2P9 — pasting works."],
  "jn.check": ["Kiểm tra mã", "Check code"], "jn.confirm": ["Xác nhận tham gia", "Confirm & join"], "jn.leader": ["Trưởng nhóm", "Leader"],
  "jn.members": ["Thành viên", "Members"], "jn.private": ["Thông tin riêng của thành viên chỉ hiển thị sau khi bạn tham gia.", "Members' private details are only visible after you join."],
  "jn.display_name": ["Tên hiển thị", "Display name"], "jn.guest": ["Chưa có tài khoản? Nhập tên hiển thị để tham gia ngay, đăng ký sau.", "No account? Enter a display name to join now and register later."],
  "jn.open_room": ["Vào phòng", "Open room"], "jn.joined": ["Bạn đã tham gia {trip}", "You joined {trip}"],

  // room
  "rm.code": ["Mã mời", "Invite code"], "rm.expires": ["Hết hạn sau {t}", "Expires in {t}"], "rm.expired": ["Mã đã hết hạn", "Code expired"],
  "rm.copy": ["Sao chép mã", "Copy code"], "rm.share": ["Chia sẻ liên kết", "Share link"], "rm.regen": ["Tạo lại mã", "New code"], "rm.extend": ["Gia hạn 24 giờ", "Extend 24h"],
  "rm.copied": ["Đã sao chép", "Copied"], "rm.link_copied": ["Đã sao chép liên kết mời", "Invite link copied"],
  "rm.member_view": ["Mã mời do Trưởng nhóm quản lý. Hãy nhờ {leader} gửi mã cho bạn bè.", "The leader manages invite codes. Ask {leader} to share it."],
  "rm.members": ["Thành viên", "Members"], "rm.leader": ["Trưởng nhóm", "Leader"], "rm.editor": ["Được sửa", "Can edit"],
  "rm.st.ready": ["Sẵn sàng", "Ready"], "rm.st.submitted": ["Đã gửi sở thích", "Submitted"], "rm.st.pending": ["Chưa hoàn thành", "Not finished"],
  "rm.progress": ["{r} trên {n} thành viên đã sẵn sàng", "{r} of {n} members are ready"],
  "rm.my": ["Trạng thái của tôi", "My status"], "rm.my.none": ["Hoàn thành sở thích của bạn", "Complete your preferences"],
  "rm.my.none_d": ["Mỗi người gửi một bản riêng. Nội dung tự do của bạn không hiển thị cho người khác.", "Everyone submits their own. Your free-text answers stay private."],
  "rm.my.draft": ["Bạn có bản nháp chưa gửi", "You have an unsent draft"], "rm.my.submitted": ["Đã gửi — hãy xem lại và bấm Sẵn sàng", "Submitted — review it and mark yourself ready"],
  "rm.my.ready": ["Bạn đã sẵn sàng", "You're ready"], "rm.fill": ["Điền sở thích", "Fill preferences"], "rm.edit": ["Sửa sở thích", "Edit preferences"],
  "rm.ready_btn": ["Tôi đã sẵn sàng", "I'm ready"], "rm.unready": ["Bỏ sẵn sàng", "Not ready"],
  "rm.generate": ["Tạo kế hoạch", "Generate plans"], "rm.gen_ready_only": ["Tạo với những người đã sẵn sàng", "Generate with ready members"],
  "rm.waiting": ["Đang chờ: {names}", "Waiting for: {names}"], "rm.leader_only_gen": ["Trưởng nhóm sẽ tạo kế hoạch khi mọi người sẵn sàng.", "The leader generates plans once everyone is ready."],
  "rm.remind": ["Nhắc người còn chờ", "Remind waiting members"], "rm.reminded": ["Đã gửi nhắc nhở tới {n} người", "Reminder sent to {n} people"],
  "rm.deadline": ["Hạn chót (tùy chọn)", "Deadline (optional)"], "rm.deadline_v": ["Hạn chót sẵn sàng: {d}", "Ready deadline: {d}"],
  "rm.manage": ["Quản lý", "Manage"], "rm.make_editor": ["Cấp quyền sửa lịch trình", "Allow itinerary edits"], "rm.remove_editor": ["Thu hồi quyền sửa", "Revoke edit rights"],
  "rm.transfer": ["Chuyển quyền Trưởng nhóm", "Make leader"], "rm.remove": ["Xóa khỏi phòng", "Remove from room"],
  "rm.leave": ["Rời phòng", "Leave room"], "rm.close": ["Đóng phòng", "Close room"],
  "rm.close_confirm": ["Đóng phòng sẽ chặn thành viên mới và việc tạo kế hoạch. Thành viên hiện tại vẫn xem được nội dung.", "Closing blocks new members and plan generation. Current members keep read access."],
  "rm.leave_confirm": ["Bạn sẽ không còn trong danh sách thành viên. Trạng thái sẵn sàng của nhóm sẽ được tính lại.", "You'll be removed from the member list and readiness will be recalculated."],
  "rm.successor": ["Chọn Trưởng nhóm mới", "Choose the new leader"],
  "rm.plans": ["Kế hoạch của nhóm", "Group plans"], "rm.view_plans": ["Xem & so sánh kế hoạch", "View & compare plans"],
  "rm.feed": ["Hoạt động trong phòng", "Room activity"], "rm.gen_running": ["AI đang tạo kế hoạch…", "AI is generating plans…"],
  "rm.gen_failed": ["Tạo kế hoạch thất bại — dữ liệu đầu vào đã được giữ, lượt dùng không bị trừ.", "Generation failed — inputs were kept and no quota was used."],
  "rm.closed_note": ["Phòng đã đóng. Bạn vẫn xem được nội dung theo chính sách của nhóm.", "This room is closed. You can still view its content."],
  "rm.finalized_note": ["Kế hoạch đã được chốt và lưu vào Chuyến đi của mỗi thành viên.", "The plan is finalized and saved to every member's trips."],
  "rm.toast_joined": ["{name} đã tham gia chuyến đi", "{name} joined the trip"], "rm.toast_ready": ["{name} đã sẵn sàng", "{name} is ready"],
  "rm.all_ready": ["Mọi người đã sẵn sàng!", "Everyone is ready!"],
  "feed.member.joined": ["{name} đã tham gia", "{name} joined"], "feed.member.ready": ["{name} đã sẵn sàng", "{name} is ready"],
  "feed.member.unready": ["{name} bỏ trạng thái sẵn sàng", "{name} is no longer ready"], "feed.submission.updated": ["{name} đã gửi/cập nhật sở thích", "{name} submitted preferences"],
  "feed.group.created": ["{name} đã tạo phòng", "{name} created the room"], "feed.generation.started": ["{name} bắt đầu tạo kế hoạch", "{name} started generating plans"],
  "feed.generation.completed": ["Kế hoạch đã sẵn sàng", "Plans are ready"], "feed.itinerary.updated": ["{name} đã sửa lịch trình", "{name} edited the itinerary"],
  "feed.comment.created": ["{name} đã bình luận", "{name} commented"], "feed.itinerary.finalized": ["{name} đã chốt kế hoạch", "{name} finalized the plan"],
  "feed.member.left": ["{name} đã rời phòng", "{name} left the room"], "feed.member.removed": ["Một thành viên đã bị xóa khỏi phòng", "A member was removed"],
  "feed.leader.transferred": ["Quyền Trưởng nhóm đã được chuyển", "Leadership was transferred"], "feed.invite.issued": ["Mã mời mới đã được tạo", "A new invite code was issued"],
  "feed.reminder.sent": ["{name} đã gửi nhắc nhở", "{name} sent reminders"], "feed.room.closed": ["Phòng đã đóng", "Room closed"],

  // prefs form
  "mp.title": ["Sở thích của bạn", "Your preferences"], "mp.for": ["Cho chuyến “{trip}”", "For “{trip}”"],
  "mp.budget": ["Ngân sách của bạn (mỗi người)", "Your budget (per person)"], "mp.draft": ["Lưu nháp", "Save draft"], "mp.submit": ["Gửi sở thích", "Submit preferences"],
  "mp.saved_draft": ["Đã lưu bản nháp", "Draft saved"], "mp.submitted": ["Đã gửi sở thích", "Preferences submitted"],
  "mp.reset_warn": ["Bạn đang ở trạng thái Sẵn sàng. Nếu thay đổi và gửi lại, trạng thái sẽ được đặt lại cho đến khi bạn xác nhận lần nữa.", "You're marked ready. If you change and resubmit, you'll need to confirm ready again."],
  "mp.reset_done": ["Trạng thái Sẵn sàng đã được đặt lại vì bản gửi thay đổi.", "Your ready status was reset because your submission changed."],
  "mp.summary": ["Tóm tắt bản gửi", "Submission summary"], "mp.save_default": ["Lưu làm sở thích mặc định trong hồ sơ", "Save as my default preferences"],
  "mp.version": ["Phiên bản {v} · cập nhật {when}", "Version {v} · updated {when}"],

  // synthesis
  "sy.title": ["AI tổng hợp", "AI synthesis"], "sy.s.check": ["Kiểm tra sở thích", "Checking preferences"], "sy.s.common": ["Tìm điểm chung", "Finding common ground"],
  "sy.s.budget": ["Cân bằng ngân sách", "Balancing budgets"], "sy.s.options": ["Chuẩn bị các phương án", "Preparing options"], "sy.s.done": ["Hoàn tất", "Done"],
  "sy.common": ["Sở thích chung", "Shared interests"], "sy.diff": ["Khác biệt chính", "Key differences"], "sy.constraints": ["Ràng buộc AI đang cân bằng", "Constraints being balanced"],
  "sy.hard": ["Ràng buộc cứng", "Hard constraints"], "sy.soft": ["Sở thích mềm", "Soft preferences"],
  "sy.dates": ["Ngày đi: {s} → {e}", "Dates: {s} → {e}"], "sy.maxbudget": ["Ngân sách tối đa: {v}/người", "Max budget: {v}/person"], "sy.nomax": ["Không có giới hạn ngân sách cứng", "No hard budget cap"],
  "sy.avoid": ["Tránh: {v}", "Avoid: {v}"], "sy.special": ["{n} yêu cầu đặc biệt đã được chuyển cho AI", "{n} special request(s) passed to the AI"],
  "sy.pace_split": ["Nhịp độ khác nhau: {v}", "Different paces: {v}"], "sy.budget_split": ["Ngân sách chênh lệch: {a} – {b}", "Budget spread: {a} – {b}"],
  "sy.interest_split": ["{i}: {c}/{n} người thích", "{i}: liked by {c}/{n}"],
  "sy.excluded": ["Tạm loại khỏi lần tạo này (ghi vào snapshot): {names}", "Temporarily excluded from this run (recorded in the snapshot): {names}"],
  "sy.count": ["Số kế hoạch", "Number of plans"], "sy.one": ["Một kế hoạch chung", "One shared plan"], "sy.one_d": ["Một lịch trình cân bằng cho cả nhóm.", "One balanced itinerary for everyone."],
  "sy.two": ["Hai kế hoạch thay thế", "Two alternative plans"], "sy.two_d": ["AI gợi ý chia nhóm theo mức tương đồng sở thích; mọi người vẫn có thể chọn.", "AI suggests groupings by similarity; anyone can still choose."],
  "sy.three": ["Ba kế hoạch (VIP)", "Three plans (VIP)"], "sy.three_d": ["Thêm một kế hoạch dung hòa cho cả nhóm.", "Adds a compromise plan for the whole group."],
  "sy.locked": ["Mở khóa với VIP", "Unlock with VIP"], "sy.quota": ["Còn {r}/{l} lượt tạo cho nhóm này", "{r}/{l} generations left for this group"],
  "sy.generate": ["Tạo kế hoạch", "Generate plans"], "sy.privacy": ["Chỉ hiển thị thông tin tổng hợp — văn bản riêng chỉ hiện khi chính thành viên đó cho phép.", "Only aggregated information is shown — a member's free text appears only if they allow it."],
  "sy.member_wait": ["Trưởng nhóm đang tạo kế hoạch. Trang sẽ tự cập nhật.", "The leader is generating plans. This page updates automatically."],

  // plans
  "pl.title": ["Kế hoạch của nhóm", "Group plans"], "pl.one": ["Lịch trình chính", "Main itinerary"], "pl.compare": ["So sánh nhanh", "Quick comparison"],
  "pl.view": ["Xem lịch trình", "View itinerary"], "pl.discuss": ["Thảo luận kế hoạch này", "Discuss this plan"], "pl.members": ["Thành viên đề xuất", "Suggested members"],
  "pl.pace": ["Nhịp độ", "Pace"], "pl.pp": ["Chi phí/người", "Cost/person"], "pl.highlights": ["Điểm nổi bật", "Highlights"], "pl.fit": ["Vì sao phù hợp", "Why it fits"],
  "pl.budget": ["Ngân sách ước tính", "Estimated budget"], "pl.ai_note": ["Việc AI chia nhóm chỉ là gợi ý — mọi thành viên đều có thể xem, bình luận và đề nghị thay đổi.", "AI's grouping is only a suggestion — every member can view, comment and request changes."],
  "pl.compat": ["Ngân sách thành viên", "Member budgets"], "pl.c.ok": ["Trong ngân sách", "Within budget"], "pl.c.over_soft": ["Vượt mức mong muốn", "Above preferred budget"],
  "pl.c.over_hard": ["Vượt giới hạn cứng — không tương thích", "Over hard limit — not compatible"], "pl.c.unknown": ["Chưa nêu ngân sách", "No budget given"],
  "pl.none": ["Chưa có kế hoạch nào. Trưởng nhóm sẽ tạo khi mọi người sẵn sàng.", "No plans yet. The leader will generate them when everyone is ready."],
  "pl.row.name": ["Tên", "Name"], "pl.row.days": ["Số ngày", "Days"], "pl.row.acts": ["Số hoạt động", "Activities"], "pl.row.interests": ["Trọng tâm", "Focus"],
  "pl.finalized": ["Đã chốt", "Finalized"], "pl.option": ["Phương án {n}", "Option {n}"], "pl.engine": ["Tạo bởi {e}", "Generated by {e}"],

  // itinerary
  "it.version": ["Phiên bản {v}", "Version {v}"], "it.tab.plan": ["Lịch trình", "Itinerary"], "it.tab.budget": ["Ngân sách", "Budget"], "it.tab.talk": ["Thảo luận", "Discussion"],
  "it.day": ["Ngày {n}", "Day {n}"], "it.all_days": ["Tất cả", "All"], "it.duration": ["{m} phút", "{m} min"], "it.hours": ["{h} giờ {m} phút", "{h}h {m}m"],
  "it.free": ["Miễn phí", "Free"], "it.verified": ["Đã xác minh", "Verified"], "it.review": ["Cần xem lại", "Needs review"],
  "it.overlap": ["Trùng giờ với hoạt động trước", "Overlaps the previous activity"],
  "it.late": ["Kéo dài quá nửa đêm — hãy chuyển sang ngày khác hoặc bớt điểm dừng.", "Runs past midnight — move it to another day or drop a stop."],
  "it.mode.walk": ["đi bộ", "walk"], "it.mode.car": ["ô tô/taxi", "car/taxi"], "it.mode.motorbike": ["xe máy", "motorbike"], "it.mode.public": ["xe buýt", "bus"],
  "it.travel": ["{m} phút {mode} · {km} km (ước tính)", "{m} min {mode} · {km} km (est.)"],
  "it.add": ["Thêm điểm dừng", "Add stop"], "it.replace": ["Thay thế", "Replace"], "it.delete": ["Xóa", "Delete"], "it.up": ["Lên", "Up"], "it.down": ["Xuống", "Down"],
  "it.time": ["Sửa giờ", "Edit time"], "it.refine": ["Nhờ AI chỉnh lại", "Ask AI to refine"], "it.comment_on": ["Bình luận", "Comment"],
  "it.unsaved": ["Có thay đổi chưa lưu", "Unsaved changes"], "it.save": ["Lưu thay đổi", "Save changes"], "it.discard": ["Hủy thay đổi", "Discard"],
  "it.saved": ["Đã lưu phiên bản {v}", "Saved version {v}"], "it.finalize": ["Chốt kế hoạch này", "Finalize this plan"],
  "it.finalize_confirm": ["Chốt sẽ khóa phiên bản hiện tại và lưu vào Chuyến đi của từng thành viên. Các phiên bản trước vẫn được giữ lại.", "Finalizing locks the current version and saves it to every member's trips. Previous versions are kept."],
  "it.save_trip": ["Lưu chuyến đi", "Save trip"], "it.trip_saved": ["Đã lưu vào Chuyến đi của tôi", "Saved to My trips"],
  "it.history": ["Lịch sử phiên bản", "Version history"], "it.restore": ["Khôi phục", "Restore"], "it.current": ["Hiện tại", "Current"],
  "it.view_only": ["Bạn đang xem. Hãy gửi đề xuất trong Thảo luận để thay đổi lịch trình.", "View only. Send a suggestion in Discussion to request changes."],
  "it.locked": ["Kế hoạch đã chốt — chỉ xem.", "Finalized plan — view only."],
  "it.conflict_t": ["Xung đột phiên bản", "Version conflict"],
  "it.conflict_d": ["{by} vừa lưu phiên bản {v} trong lúc bạn chỉnh sửa. Bạn muốn tải bản mới nhất (bỏ thay đổi của mình) hay ghi đè có chủ đích bằng bản của bạn?", "{by} saved version {v} while you were editing. Load the latest (discard your changes) or deliberately overwrite with yours?"],
  "it.load_latest": ["Tải bản mới nhất", "Load latest"], "it.overwrite": ["Ghi đè bằng bản của tôi", "Overwrite with mine"],
  "it.leave_t": ["Rời trang khi chưa lưu?", "Leave without saving?"], "it.leave_d": ["Bạn có thay đổi chưa lưu trên lịch trình này.", "You have unsaved changes on this itinerary."],
  "it.leave_save": ["Lưu rồi rời đi", "Save and leave"], "it.leave_discard": ["Bỏ thay đổi", "Discard changes"],
  "it.remote_update": ["{by} vừa cập nhật lịch trình lên phiên bản {v}.", "{by} updated the itinerary to version {v}."], "it.reload": ["Tải lại", "Reload"],
  "it.map_full": ["Mở bản đồ toàn màn hình", "Open full-screen map"], "it.map_close": ["Thu nhỏ bản đồ", "Exit full screen"],
  "it.no_geo": ["Không có vị trí trên bản đồ", "No map location"],
  "it.alt_title": ["Thay thế hoạt động", "Replace activity"], "it.alt_none": ["Không còn địa điểm phù hợp chưa dùng.", "No unused matching places left."],
  "it.add_title": ["Thêm điểm dừng vào {day}", "Add a stop to {day}"], "it.search": ["Tìm địa điểm đã xác minh…", "Search verified places…"],
  "it.custom": ["Hoặc nhập điểm dừng tự do", "Or enter a custom stop"], "it.custom_ph": ["Tên địa điểm", "Place name"],
  "it.custom_note": ["Wayplot sẽ thử xác minh. Nếu không xác minh được, điểm dừng được đánh dấu “Cần xem lại” và không có ghim bản đồ.", "Wayplot will try to verify it. If it can't, the stop is flagged “Needs review” with no map pin."],
  "it.add_btn": ["Thêm", "Add"], "it.time_title": ["Sửa giờ bắt đầu & thời lượng", "Edit start time & duration"], "it.start": ["Giờ bắt đầu", "Start time"], "it.dur": ["Thời lượng (phút)", "Duration (minutes)"],
  "it.pin_note": ["Giờ đã sửa sẽ được giữ cố định khi sắp xếp lại.", "Edited times stay fixed when reordering."],
  "it.refine_title": ["Nhờ AI chỉnh lại", "Ask AI to refine"], "it.r.lighter": ["Nhẹ nhàng hơn", "Lighter days"], "it.r.cheaper": ["Tiết kiệm hơn", "Cheaper"],
  "it.r.more_food": ["Thêm ẩm thực & cà phê", "More food & cafés"], "it.r.more_culture": ["Thêm văn hóa", "More culture"], "it.r.more_nature": ["Thêm thiên nhiên", "More nature"],
  "it.r.route": ["Tối ưu tuyến đường", "Optimise route"], "it.r.free": ["Hoặc mô tả thay đổi bạn muốn", "Or describe the change you want"],
  "it.r.free_off": ["Mô tả tự do cần cấu hình Claude API trên máy chủ.", "Free-form requests need the Claude API configured on the server."],
  "it.r.apply": ["Đề xuất thay đổi", "Propose changes"], "it.r.done": ["AI đã đề xuất thay đổi — xem lại rồi Lưu hoặc Hủy.", "AI proposed changes — review, then Save or Discard."],
  "it.day_cost": ["~{v}/người", "~{v}/person"], "it.engine": ["Tạo bởi {e}", "Generated by {e}"],
  "it.unverified_n": ["{n} điểm dừng chưa xác minh — cần xem lại", "{n} unverified stop(s) — needs review"],
  "it.status.active": ["Đang xem xét", "Under review"], "it.status.finalized": ["Đã chốt", "Finalized"], "it.status.superseded": ["Phiên bản cũ", "Superseded"],
  "it.back_room": ["Về phòng hành trình", "Back to trip room"], "it.other_plan": ["Phương án khác", "Other option"],
  "bd.total": ["Tổng ước tính cho nhóm", "Estimated group total"], "bd.pp": ["Ước tính mỗi người", "Estimate per person"],
  "bd.stay": ["Lưu trú", "Accommodation"], "bd.transport": ["Di chuyển", "Transport"], "bd.food": ["Ăn uống", "Food & drink"], "bd.tickets": ["Vé & hoạt động", "Tickets & activities"], "bd.other": ["Chi phí khác", "Other"],
  "bd.by_day": ["Chi phí theo ngày (mỗi người)", "Cost by day (per person)"], "bd.assumptions": ["Giả định", "Assumptions"], "bd.unknown": ["Chi phí chưa biết / chưa tính", "Unknown / not included"],
  "bd.estimate": ["Đây là ước tính, không phải giá đặt chỗ đã xác nhận.", "These are estimates, not confirmed booking prices."],
  "bd.members": ["So với ngân sách từng thành viên", "Against each member's budget"], "bd.your_budget": ["Ngân sách của bạn: {v}", "Your budget: {v}"],
  "bd.over": ["Vượt ngân sách {v}", "Over budget by {v}"], "bd.within": ["Trong ngân sách", "Within budget"],
  "cm.placeholder": ["Viết bình luận hoặc đề xuất…", "Write a comment or suggestion…"], "cm.comment": ["Bình luận", "Comment"], "cm.suggestion": ["Đề xuất chỉnh sửa", "Suggest a change"],
  "cm.about": ["Về hoạt động", "About activity"], "cm.whole": ["Cả kế hoạch", "Whole plan"], "cm.send": ["Gửi", "Send"], "cm.edited": ["đã chỉnh sửa", "edited"],
  "cm.applied": ["Đã áp dụng", "Applied"], "cm.dismissed": ["Đã bỏ qua", "Dismissed"], "cm.open": ["Chờ xử lý", "Pending"],
  "cm.mark_applied": ["Đánh dấu đã áp dụng", "Mark applied"], "cm.dismiss": ["Bỏ qua", "Dismiss"], "cm.edit": ["Sửa", "Edit"],
  "cm.empty": ["Chưa có thảo luận. Hãy là người đầu tiên góp ý!", "No discussion yet. Be the first to share a thought!"],
  "cm.note": ["Đề xuất không tự thay đổi lịch trình — người có quyền chỉnh sửa sẽ áp dụng.", "Suggestions don't change the itinerary automatically — an editor applies them."],
  "cm.personal": ["Thảo luận dành cho chuyến đi nhóm.", "Discussion is available for group trips."],

  // trips
  "tr.title": ["Chuyến đi của tôi", "My trips"], "tr.f.all": ["Tất cả", "All"], "tr.f.personal": ["Cá nhân", "Personal"], "tr.f.group": ["Nhóm", "Group"],
  "tr.f.upcoming": ["Sắp tới", "Upcoming"], "tr.f.past": ["Đã qua", "Past"], "tr.f.archived": ["Lưu trữ", "Archived"],
  "tr.duplicate": ["Nhân bản", "Duplicate"], "tr.archive": ["Lưu trữ", "Archive"], "tr.unarchive": ["Bỏ lưu trữ", "Unarchive"], "tr.delete": ["Xóa", "Delete"],
  "tr.delete_t": ["Xóa chuyến đi?", "Delete trip?"], "tr.delete_d": ["“{t}” và mọi lịch trình, bình luận liên quan sẽ bị xóa vĩnh viễn. Không thể hoàn tác.", "“{t}” and all its itineraries and comments will be permanently deleted. This can't be undone."],
  "tr.empty": ["Không có chuyến đi nào trong mục này.", "No trips in this view."], "tr.duplicated": ["Đã nhân bản chuyến đi", "Trip duplicated"],
  "tr.no_plan": ["Chưa có lịch trình", "No itinerary yet"],

  // profile
  "pr.title": ["Hồ sơ & cài đặt", "Profile & settings"], "pr.account": ["Thông tin tài khoản", "Account"], "pr.password": ["Đổi mật khẩu", "Change password"],
  "pr.current": ["Mật khẩu hiện tại", "Current password"], "pr.new": ["Mật khẩu mới", "New password"], "pr.pw_saved": ["Đã đổi mật khẩu", "Password updated"],
  "pr.defaults": ["Sở thích du lịch mặc định", "Default travel preferences"], "pr.defaults_d": ["Dùng để điền sẵn cho các biểu mẫu sau.", "Used to prefill future forms."],
  "pr.plan": ["Gói đăng ký", "Subscription"], "pr.free": ["Miễn phí", "Free"], "pr.vip": ["VIP", "VIP"],
  "pr.usage": ["Đã dùng {u}/{l} lượt tạo cá nhân tháng này", "{u}/{l} personal generations used this month"],
  "pr.ent": ["Tối đa {p} kế hoạch nhóm · {g} lượt tạo mỗi nhóm", "Up to {p} group plans · {g} generations per group"],
  "pr.try_vip": ["Dùng thử VIP (demo)", "Try VIP (demo)"], "pr.back_free": ["Về gói miễn phí", "Back to Free"],
  "pr.vip_note": ["Thanh toán thuộc giai đoạn sau (P2). Nút này chỉ bật quyền lợi trong chế độ demo.", "Payments are a later phase (P2). This only toggles entitlements in demo mode."],
  "pr.privacy": ["Quyền riêng tư & thông báo", "Privacy & notifications"], "pr.n.invites": ["Lời mời tham gia nhóm", "Group invitations"],
  "pr.n.ready": ["Nhắc nhở sẵn sàng", "Ready reminders"], "pr.n.comments": ["Bình luận mới", "New comments"], "pr.n.updates": ["Cập nhật lịch trình", "Itinerary updates"],
  "pr.share_text": ["Cho phép chia sẻ văn bản yêu cầu đặc biệt với thành viên khác", "Allow sharing my special-request text with other members"],
  "pr.saved": ["Đã lưu", "Saved"], "pr.logout": ["Đăng xuất", "Sign out"], "pr.lang": ["Ngôn ngữ", "Language"],
  "pr.guest_t": ["Hoàn tất đăng ký", "Finish registration"], "pr.guest_acct": ["Tài khoản khách", "Guest account"], "pr.since": ["Tham gia {date}", "Joined {date}"], "pr.guest_d": ["Bạn đang dùng tài khoản khách. Thêm email và mật khẩu để giữ chuyến đi trên mọi thiết bị.", "You're using a guest account. Add an email and password to keep your trips everywhere."],
  "ex.title": ["Khám phá điểm đến", "Explore destinations"], "ex.plan_here": ["Lên kế hoạch tại đây", "Plan a trip here"], "ex.places": ["{n} địa điểm đã xác minh", "{n} verified places"],
  "time.just": ["vừa xong", "just now"], "time.min": ["{n} phút trước", "{n} min ago"], "time.hour": ["{n} giờ trước", "{n}h ago"], "time.day": ["{n} ngày trước", "{n}d ago"],
  "nf.title": ["Không tìm thấy trang", "Page not found"], "nf.back": ["Về trang chủ", "Go home"],
  // feedback round 1
  "it.s.morning": ["Buổi sáng", "Morning"], "it.s.noon": ["Buổi trưa", "Midday"], "it.s.afternoon": ["Buổi chiều", "Afternoon"], "it.s.evening": ["Buổi tối", "Evening"],
  "it.s.count": ["{n} điểm", "{n} stops"],
  "it.gm_view": ["Xem trên Google Maps", "View on Google Maps"], "it.gm_dir": ["Chỉ đường", "Get directions"],
  "it.gm_day": ["Mở lộ trình cả ngày trên Google Maps", "Open the day's route in Google Maps"],
  "it.r.free_local": ["Ví dụ: “bỏ Bà Nà, thêm cà phê, đi nhẹ nhàng hơn”. Wayplot hiểu yêu cầu về nhịp độ, chi phí, ẩm thực, văn hóa, thiên nhiên, tuyến đường và tên địa điểm muốn bỏ hoặc thêm.", "E.g. “skip Ba Na, add a cafe, slower pace”. Wayplot understands pace, cost, food, culture, nature, route, and names of places to drop or add."],
  "it.r.free_ph": ["Mô tả thay đổi bạn muốn…", "Describe the change you want…"],
  "it.r.need": ["Chọn một gợi ý hoặc mô tả thay đổi bạn muốn.", "Pick a suggestion or describe the change you want."],
  "it.r.not_understood": ["Wayplot chưa hiểu yêu cầu này. Thử nói rõ hơn (ví dụ “bỏ Chợ Hàn”, “thêm bảo tàng”, “tiết kiệm hơn”) hoặc chọn một gợi ý ở trên.", "Wayplot couldn't understand that. Try being more specific (e.g. “skip Han Market”, “add a museum”, “cheaper”) or pick a suggestion above."],
  "it.r.done_list": ["Đã đề xuất: {list}. Xem lại rồi Lưu hoặc Hủy.", "Proposed: {list}. Review, then Save or Discard."],
  "gs.banner": ["Bạn đang dùng thử với tài khoản khách. Đăng ký để lưu hành trình và mở lại trên mọi thiết bị.", "You're trying Wayplot as a guest. Sign up to save your trips and open them on any device."],
  "gs.save_t": ["Đăng ký để lưu hành trình", "Sign up to save your trip"],
  "gs.save_d": ["Lịch trình bạn vừa tạo sẽ được giữ nguyên và chuyển sang tài khoản mới. Đã có tài khoản thì chọn Đăng nhập.", "The plan you just made is kept and moves into your new account. Already have one? Sign in."],
  "rm.wait_all": ["Nên chờ cả nhóm gửi đủ sở thích rồi mới tạo lịch trình. Lịch trình dựa trên sở thích tại lúc bấm tạo: ai gửi sau sẽ không được tự động cập nhật, khi đó phải tạo lịch trình mới từ đầu.", "Wait until everyone has sent their preferences before generating. Plans use the preferences at the moment you generate: anyone who submits later is not added automatically, and you'd need to generate a new plan."],
  "rm.after_plan_t": ["{names} đã gửi sở thích sau khi tạo lịch trình.", "{names} submitted preferences after the plans were made."],
  "rm.after_plan_leader": ["Các phương án hiện tại chưa tính đến sở thích này. Tạo lịch trình mới để đưa vào.", "Current plans don't include them. Generate new plans to include them."],
  "rm.after_plan_member": ["Các phương án hiện tại chưa tính đến sở thích này. Trưởng nhóm cần tạo lịch trình mới.", "Current plans don't include them. The leader needs to generate new plans."],
  "rm.after_plan_badge": ["Gửi sau", "Sent later"], "rm.after_plan_badge_d": ["Gửi sau khi đã tạo lịch trình, chưa có trong phương án", "Sent after plans were made; not in them yet"],
  "rm.regen": ["Tạo lịch trình mới", "Generate new plans"],
  "mp.after_plan": ["Nhóm đã có lịch trình. Sở thích bạn gửi bây giờ sẽ không tự cập nhật vào lịch trình hiện tại; trưởng nhóm cần tạo lịch trình mới.", "This group already has plans. Preferences sent now won't update them automatically; the leader needs to generate new plans."],
  "sy.no_auto": ["Nếu họ gửi sau, lịch trình sẽ không tự cập nhật; cần tạo lịch trình mới.", "If they submit later, the plans won't update automatically; you'll need to generate again."],
  "sy.snapshot_note": ["Lịch trình được tạo từ sở thích hiện có. Ai gửi hoặc sửa sở thích sau đó sẽ cần tạo lịch trình mới.", "Plans use the preferences sent so far. Anyone who submits or edits later will need a new generation."],
  "err.register_required": ["Hãy đăng ký tài khoản để dùng tính năng này.", "Please sign up to use this feature."],
};

export function t(key, vars) {
  const lang = store.lang === "en" ? 1 : 0;
  let s = D[key] ? D[key][lang] : key;
  if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k] == null ? "" : vars[k]);
  return s;
}
export const L = (obj) => (obj ? (store.lang === "en" ? obj.en || obj.vi : obj.vi || obj.en) : "");
export const hasKey = (k) => !!D[k];

export function money(n) {
  if (n == null || isNaN(n)) return "—";
  n = Math.round(n);
  return store.lang === "en" ? n.toLocaleString("en-US") + " VND" : n.toLocaleString("en-US").replace(/,/g, ".") + "đ";
}
export function moneyShort(n) {
  if (n == null) return "—";
  if (store.lang === "en") return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M" : Math.round(n / 1e3) + "K";
  return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(".", ",") + " tr" : Math.round(n / 1e3) + "k";
}
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso, opts = {}) {
  if (!iso) return "";
  if (iso.length > 10) {
    // Timestamps are stored in UTC; show the calendar day in the viewer's own time zone.
    const dt = new Date(iso);
    if (!isNaN(dt)) iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (store.lang === "en") return `${MONTH_EN[m - 1]} ${d}${opts.year === false ? "" : ", " + y}`;
  return opts.year === false ? `${d}/${m}` : `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
export function fmtRange(a, b) {
  if (!a) return "";
  return `${fmtDate(a, { year: false })} – ${fmtDate(b)}`;
}
export function weekday(iso) {
  const d = new Date(iso + "T00:00:00");
  return store.lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] : ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
}
export function ago(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("time.just");
  if (s < 3600) return t("time.min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.hour", { n: Math.floor(s / 3600) });
  if (s < 86400 * 14) return t("time.day", { n: Math.floor(s / 86400) });
  return fmtDate(iso.slice(0, 10));
}
export function monthLabel() {
  const d = new Date();
  return store.lang === "en" ? `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()]} ${d.getFullYear()}` : `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`;
}
export function errText(e, fallback) {
  if (!e) return "";
  const code = typeof e === "string" ? e : e.code;
  if (code === "code_expired") return t("err.code_expired", { leader: (e.details && e.details.leader_name) || "" });
  if (code === "room_full") return t("err.room_full", { max: (e.details && e.details.max_members) || "" });
  if (code === "too_long" && fallback === "text") return t("err.too_long_text");
  return hasKey("err." + code) ? t("err." + code) : t(fallback || "err.generic");
}
