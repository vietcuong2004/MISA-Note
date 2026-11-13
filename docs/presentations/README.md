# Cập nhật bài trình bày từ JSON

`misa-note-strategy.data.json` là nơi chỉnh nội dung. PowerPoint và PDF là **file xuất**, không tự đọc JSON khi được mở.

## Tự cập nhật mỗi lần lưu

Trong terminal tại thư mục dự án, chạy:

```bash
npm run slides:watch
```

Giữ terminal này chạy, sau đó sửa và lưu JSON. Chương trình sẽ dựng lại:

- `misa-note-strategy.pptx`
- `misa-note-strategy.pdf`
- `misa-note-strategy.md`

Dừng bằng `Ctrl+C`. Mở lại file PowerPoint/PDF nếu ứng dụng xem đang giữ bản cũ trong bộ nhớ. Chỉ sửa nội dung trong JSON; chỉnh trực tiếp file xuất sẽ bị thay thế ở lần dựng tiếp theo.

## Cập nhật một lần

```bash
npm run slides:build
```

Ví dụ sửa tiêu đề slide 6:

```json
{
  "title": "3 nền tảng nổi bật"
}
```

Sửa thuộc tính `slides[5].title` trong file hiện có, không thay toàn bộ file bằng đoạn ví dụ này. Chương trình giữ nguyên nội dung bạn nhập, không tự đổi lại theo các lần trao đổi trước.

## Nội dung có thể chỉnh

- `title`: tiêu đề slide.
- `section`: tên phần ở đầu slide.
- `intro`, `message`: mô tả hoặc thông điệp mở đầu nếu bố cục slide có trường đó.
- `items`: nội dung các thẻ hoặc ô bảng, giữ số hàng/cột hiện tại. Trong nội dung thẻ, viết mỗi ý trên một dòng, bắt đầu bằng `• ` hoặc `- ` để tạo gạch đầu dòng thật trong PowerPoint; dòng xuống hàng do chữ dài vẫn thuộc cùng một ý. Vùng chỉ có một ý sẽ hiển thị như đoạn văn, không có gạch đầu dòng. Không thêm dấu đầu dòng vào ô bảng hoặc tiêu đề.
- `conclusion`, `basis`, `context`, `value`, `principle`: các vùng nội dung tương ứng nếu có trong bố cục.
- `notes`: ghi chú thuyết trình.
- `images`: đường dẫn PNG/JPEG tương đối từ `assets/`, giữ số ảnh hiện tại. Thay ảnh tại cùng đường dẫn cũng kích hoạt dựng lại khi đang watch.

Các nhãn cấu trúc không hiển thị như “Phạm vi” hoặc “Nội dung chính” không tạo thêm dòng trên slide. Những vùng không có trong bố cục sẽ không tự xuất hiện chỉ vì thêm một trường JSON mới.

## Yêu cầu và bố cục

- Python 3.10 trở lên và font DejaVu Sans; chương trình dựng PowerPoint dùng thư viện chuẩn Python, không cần cài thêm gói pip.
- LibreOffice để xuất PDF. Máy không có LibreOffice vẫn có thể dựng PowerPoint và Markdown bằng:

```bash
python3 scripts/build-presentation.py
python3 scripts/build-presentation.py --watch
```

Bố cục hiện tại được lưu trong `templates/misa-note-strategy.pptx` và liên kết với JSON qua `templates/misa-note-strategy.layout.json`. Mẫu giữ vị trí, kích thước, font, hình ảnh và màu sắc của bài đã duyệt; chương trình điền nội dung mới vào các vùng đó, tự xuống dòng và giảm cỡ chữ trong giới hạn để vừa khung.

Việc thêm/xóa/đổi thứ tự slide, thay loại bố cục, tăng giảm số thẻ/hàng/cột/ảnh cần cập nhật mẫu và liên kết tương ứng. Đây không phải trình tự thiết kế bố cục từ văn bản tùy ý. Nếu nội dung quá dài để vừa vùng hiển thị, chương trình báo lỗi thay vì cắt chữ hoặc ghi đè bằng bản bị lỗi. Khi JSON tạm thời chưa hợp lệ trong lúc sửa, chế độ watch giữ bản xuất trước và thử lại ở lần lưu kế tiếp.

Mẫu là đầu vào dựng bài, không phải bản trình bày để phát hành. Mọi lần dựng chỉ đọc JSON, không sửa file nội dung của bạn.

## Kiểm tra

```bash
npm run slides:test
```

Kiểm tra việc cập nhật tiêu đề/nội dung/ghi chú, giữ bản xuất cũ khi cấu trúc sai, và tự dựng lại sau khi lưu hoặc sửa JSON lỗi. Các kiểm tra này không yêu cầu LibreOffice.
