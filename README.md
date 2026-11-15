# Wayplot — Hành trình Việt

Ứng dụng lập kế hoạch du lịch Việt Nam bằng AI, cho cá nhân và cho nhóm cùng lên lịch trình.
Xây dựng theo PRD `WAYPLOT.pdf`. Giao diện theo phong cách "glassy dashboard", dùng bảng màu đỏ đô, vàng và kem của PRD.

## Chạy thử

Cần Python 3.10 trở lên.

```bash
python3 -m pip install -r requirements.txt
python3 app.py
```

Mở <http://127.0.0.1:8000>. Lần chạy đầu, app tự tạo cơ sở dữ liệu SQLite trong `instance/` và nạp dữ liệu mẫu.

Muốn xóa dữ liệu và nạp lại mẫu từ đầu:

```bash
WAYPLOT_RESET=1 python3 app.py
```

Không cần bước build: frontend là ES module thuần. Preact, htm và Leaflet được kèm sẵn trong `static/vendor/`.

## Triển khai lên Render

File `render.yaml` cấu hình sẵn gói **Free**: gunicorn (1 worker, nhiều luồng vì SSE chạy trong bộ nhớ), `WAYPLOT_DEMO=0`, `WAYPLOT_SECRET` tự sinh. Gói Free không có ổ đĩa và app ngủ sau khoảng 15 phút không có truy cập (lần mở đầu tiên sau đó mất chừng 1 phút).

Để dữ liệu không mất khi app ngủ hoặc triển khai lại, app lưu vào Postgres bên ngoài khi có biến `DATABASE_URL`. Ví dụ dùng gói miễn phí của [Neon](https://neon.tech): tạo project, sao chép chuỗi kết nối `postgresql://...`, dán vào **Environment** của dịch vụ trên Render với khóa `DATABASE_URL`. App tự tạo bảng ở lần khởi động đầu. Không đặt `DATABASE_URL` thì app dùng SQLite, và trên Render dữ liệu đó mất mỗi lần khởi động lại.

1. Đẩy mã lên một repository GitHub.
2. Trên Render: **New → Blueprint**, chọn repository đó, xác nhận.
3. Render cấp link dạng `https://wayplot-xxxx.onrender.com`. Gửi link đó cho mọi người.

Ở chế độ chạy thật (`WAYPLOT_DEMO=0`), app không nạp dữ liệu và tài khoản demo; người dùng tự đăng ký.

## Tài khoản demo

Mọi tài khoản demo dùng chung mật khẩu `Wayplot2026` (hằng `DEMO_PASSWORD` trong `server/seed.py`).
Chúng dùng tên miền dành riêng `.test`. Ở trang đăng nhập có nút đăng nhập nhanh từng tài khoản.
Khi đã đăng nhập, có thể đổi tài khoản từ menu ảnh đại diện (chỉ khi `WAYPLOT_DEMO=1`).

| Tài khoản | Tên | Có sẵn |
|---|---|---|
| `minh@wayplot.test` | Minh Anh | Chuyến cá nhân Hà Nội (sắp tới) và Huế (đã qua); trưởng nhóm phòng Đà Nẵng (đang thu thập sở thích); thành viên phòng Hội An và Đà Lạt |
| `mai@wayplot.test` | Mai Phương | Trưởng nhóm "Đà Lạt mùa dã quỳ" (đã chốt); thành viên Đà Nẵng, Hội An |
| `huy@wayplot.test` | Quốc Huy | Trưởng nhóm "Hội An – Phố đèn lồng" (đã có 2 phương án và bình luận) |
| `linh@wayplot.test` | Thảo Linh | Trưởng nhóm phòng Hạ Long; thành viên Đà Nẵng (chưa sẵn sàng) |
| `bao@wayplot.test` | Gia Bảo | Thành viên phòng Hội An và Hạ Long |

Để thử cộng tác thời gian thực, mở hai trình duyệt (hoặc một cửa sổ ẩn danh) với hai tài khoản khác nhau.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8000` | Cổng HTTP |
| `HOST` | `127.0.0.1` | Địa chỉ lắng nghe |
| `WAYPLOT_DEMO` | `1` | `1` bật nút chuyển tài khoản demo và gói VIP demo; đặt `0` khi triển khai thật |
| `WAYPLOT_AI_ENGINE` | `auto` | `local`: luôn dùng engine nội bộ. `claude`: dùng Claude. `auto`: dùng Claude nếu có SDK và khóa API |
| `ANTHROPIC_API_KEY` | — | Khóa API Claude (hoặc `ANTHROPIC_AUTH_TOKEN`) |
| `WAYPLOT_CLAUDE_MODEL` | `claude-opus-5-5` | Model Claude dùng để tạo lịch trình |
| `GOOGLE_MAPS_API_KEY` | — | Tùy chọn: xác minh địa điểm tự nhập qua Google Places |
| `DATABASE_URL` | — | Chuỗi kết nối Postgres. Có thì dùng Postgres; không có thì dùng SQLite |
| `WAYPLOT_DATA_DIR` | `instance/` | Thư mục chứa `wayplot.db` và `secret.key` |
| `WAYPLOT_SECRET` | tự sinh | Khóa ký mã mời. Nếu không đặt, app sinh và lưu vào `secret.key` |
| `WAYPLOT_RESET` | — | `1` xóa toàn bộ dữ liệu khi khởi động (kể cả trên Postgres). Không đặt biến này trên Render |
| `WAYPLOT_SIMULATE_AI_FAILURE` | — | `1` giả lập lỗi AI để thử màn hình lỗi và nút thử lại |

## AI tạo lịch trình

- **Mặc định: engine nội bộ** (`server/engine.py`). Engine chọn điểm từ danh mục địa điểm đã xác minh (`server/catalog.py`) theo sở thích, nhịp độ, ngân sách và những điều cần tránh. Sau đó engine sắp lộ trình, tính giờ, thời gian di chuyển và ngân sách. Không cần mạng hay khóa API.
- **Tùy chọn: Claude.** Cài `anthropic` và đặt `ANTHROPIC_API_KEY`. App gọi Messages API với structured output (JSON schema). Bật sẵn server-side fallbacks (`fallbacks: "default"`): nếu model chính quá tải, API tự chuyển sang model dự phòng.
  - Kết quả của Claude luôn qua bước làm sạch phía server. Điểm nào không khớp danh mục sẽ bị gắn nhãn "cần kiểm tra" chứ không bịa tọa độ.
  - Nếu Claude lỗi, app báo lỗi kèm nút thử lại.
  - Tính năng "Nhờ AI chỉnh lại" bằng câu chữ tự do chỉ bật khi đang dùng Claude.
  - **Chưa chạy thử với khóa thật** trong môi trường phát triển này.
- Hạn mức tạo: gói Free có 10 lượt cá nhân mỗi tháng, tối đa 2 phương án nhóm, 3 lượt cho mỗi nhóm. Gói VIP mở 3 phương án. Gói VIP chỉ bật/tắt bằng nút demo trong Hồ sơ; thanh toán thật thuộc P2.

## Bản đồ

- Bản đồ dùng Leaflet. Ô bản đồ lấy từ OpenStreetMap; nếu mạng chặn OSM, app tự chuyển sang Esri World Street Map và ghi nhớ lựa chọn trong 1 ngày. Dịch vụ của Esri có điều khoản sử dụng riêng; hãy xem lại trước khi triển khai công khai.
- Tọa độ và giá trong danh mục mẫu là ước tính, để demo. Cần kiểm tra lại trước khi dùng thật.
- Địa điểm người dùng tự nhập chỉ có tọa độ khi khớp danh mục hoặc khi Google Places xác minh được (cần `GOOGLE_MAPS_API_KEY`). Phần Google **chưa chạy thử**.

## Phạm vi so với PRD

**Đã có (P0 và phần lớn P1)**

- Tài khoản: đăng ký, đăng nhập, đăng xuất; người dùng khách tham gia nhóm rồi hoàn tất đăng ký sau.
- Kế hoạch cá nhân: biểu mẫu 4 bước có lưu nháp và điền sẵn từ sở thích mặc định. AI tạo lịch trình có tiến độ, lỗi và thử lại. Kết quả gồm dòng thời gian theo ngày, bản đồ có ghim và tuyến đường, ngân sách theo hạng mục và theo ngày.
- Chỉnh lịch trình:
  - đổi thứ tự, sửa giờ, thay thế, thêm hoặc xóa điểm
  - xem trước khi lưu
  - lịch sử phiên bản và khôi phục
  - xử lý xung đột chỉnh sửa (409)
  - chặn rời trang khi chưa lưu
- Phòng nhóm:
  - mã mời hết hạn sau 24 giờ; trưởng nhóm gia hạn hoặc tạo lại mã
  - tham gia bằng mã hoặc liên kết, kể cả với tư cách khách
  - phân quyền trưởng nhóm, người sửa, thành viên; chuyển quyền trưởng nhóm, rời nhóm, đóng phòng
- Sở thích thành viên: bản nháp, gửi, trạng thái Sẵn sàng. Yêu cầu đặc biệt mặc định chỉ AI đọc. Nội dung chỉ hiện cho cả phòng khi chính thành viên bật "Cho phép chia sẻ" trong Hồ sơ.
- Tổng hợp AI: điểm chung, khác biệt, ràng buộc cứng và mềm. Tạo 1 hoặc 2 phương án (3 với VIP), bảng so sánh, điểm tương thích từng thành viên.
- Thảo luận: bình luận và đề xuất gắn với từng hoạt động; trưởng nhóm áp dụng hoặc bỏ qua.
- Đồng bộ thời gian thực bằng SSE: thành viên, trạng thái, lịch trình, bình luận, thông báo.
- Chốt lịch trình, Chuyến đi của tôi (lọc, nhân bản, lưu trữ, xóa), Hồ sơ, quyền riêng tư và thông báo.
- Song ngữ Việt/Anh, giao diện đáp ứng (di động, máy tính bảng, máy tính), tùy chỉnh độ mờ kính và chủ đề đỏ đô/kem. Đủ các trạng thái tải, trống và lỗi.

**Chưa có / giới hạn**

- Thanh toán VIP thật, gửi email (quên mật khẩu chỉ trả lời chung chung), thông báo đẩy.
- Danh mục chỉ gồm 8 điểm đến: Hà Nội, Hạ Long, Sa Pa, Huế, Đà Nẵng, Hội An, Đà Lạt, TP.HCM.
- Một tiến trình Flask và SSE trong bộ nhớ (SQLite hoặc Postgres): đủ để demo, chưa dành cho nhiều máy chủ.

## Cấu trúc

```
app.py               Khởi động Flask, phục vụ SPA
server/api.py        REST API (/api/...), CSRF qua header X-Requested-With
server/services.py   Nghiệp vụ: chuyến đi, nhóm, mã mời, phiên bản, bình luận
server/engine.py     Engine lập lịch nội bộ, sắp giờ, ngân sách
server/db.py         Lưu trữ: SQLite, hoặc Postgres khi có DATABASE_URL
server/ai.py         Lớp AI: engine nội bộ hoặc Claude
server/catalog.py    Danh mục điểm đến và địa điểm
server/realtime.py   SSE
server/seed.py       Dữ liệu và tài khoản demo
static/              Frontend (Preact + htm, không cần build)
```
