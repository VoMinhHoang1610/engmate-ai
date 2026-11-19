const jobMessages: Record<string, string> = {
  provider_rate_limited: 'AI đang giới hạn lượt; chưa tạo xong. Thử lại sau.',
  provider_unavailable: 'Dịch vụ AI tạm thời không phản hồi; chưa có chủ đề mới.',
  provider_not_configured: 'Máy chủ chưa cấu hình AI cho từ vựng. Hãy báo quản trị viên.',
  provider_timeout: 'AI phản hồi quá lâu; chưa có chủ đề mới. Thử lại sau.',
  provider_error: 'Dịch vụ AI gặp lỗi; chưa có chủ đề mới.',
  invalid_output: 'AI trả về nội dung không hợp lệ; chưa công bố chủ đề.',
  incomplete: 'Chưa đủ từ hợp lệ; chưa tạo chủ đề.',
  interrupted: 'Job bị gián đoạn hoặc quá hạn; hãy tạo lại.',
  session_expired: 'Phiên đăng nhập đã hết hạn; hãy đăng nhập lại rồi tạo chủ đề.',
  refused: 'AI từ chối tạo nội dung cho chủ đề này. Hãy thử một chủ đề học tiếng Anh khác.',
  needs_clarification: 'Chủ đề còn quá rộng. Hãy nhập cụ thể hơn, ví dụ “từ vựng về pha cà phê”.',
  internal_error: 'Máy chủ gặp lỗi khi tạo chủ đề; chưa có nội dung mới.',
};

export function jobErrorMessage(code: string | null): string {
  return (code && jobMessages[code]) || 'Chưa tạo được chủ đề. Hãy thử lại sau.';
}
