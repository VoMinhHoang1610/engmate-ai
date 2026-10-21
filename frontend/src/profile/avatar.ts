/** Decode and resize local raster images; strip metadata before uploading. */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('Chọn ảnh PNG, JPEG hoặc WebP.');
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('Ảnh đại diện cần nhỏ hơn 2 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không đọc được ảnh. Hãy chọn ảnh khác.'));
      img.src = url;
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth > 4096 ||
      image.naturalHeight > 4096
    )
      throw new Error('Kích thước ảnh tối đa 4096 × 4096 pixel.');
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt chưa xử lý được ảnh.');
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      256,
      256,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Chưa xử lý được ảnh đại diện.'))),
        'image/jpeg',
        0.9,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
