const sgMail = require('@sendgrid/mail');
const makeANiceEmail = require('./makeANiceEmail')

module.exports = (email, resetToken) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email,
    from: 'info.dannitv@gmail.com',
    subject: 'DANNI.TV: Yêu Cầu Đổi Mật Khẩu Đã Được Nhận',
    html: makeANiceEmail(`DANNI.TV đã nhận được yêu cầu đổi mật khẩu tài khoản của bạn. Nếu bạn không gửi yêu cầu này, bạn có thể bỏ qua. Để tiếp tục đặt mật khẩu mới:
    \n\n
    <a href="${process.env
      .FRONTEND_URL}/reset?resetToken=${resetToken}">Hẫy ấn vào đây</a>`)
  };
  sgMail.send(msg)
};
