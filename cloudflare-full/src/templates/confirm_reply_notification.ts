export function makeConfirmReplyNotificationTemplate(data: {
  confirm_url: string;
  page_slug: string;
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Reply Notification - Cusdis</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #007cba;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .message {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .info {
      background-color: #f8f9fa;
      border-left: 4px solid #007cba;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #333333;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #555555;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #007cba;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cusdis</h1>
    </div>
    
    <div class="content">
      <h2 class="message">Please confirm notification</h2>
      
      <div class="info">
        <p>You receive this email because you checked "notify me" when you added a comment on <strong>${data.page_slug}</strong>.</p>
        <p>We only send email when you have new replies. You can unsubscribe anytime through an unsubscribe link on the notification email.</p>
      </div>
      
      <div class="button-container">
        <a href="${data.confirm_url}" class="button">Yes, notify me when I have reply</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Powered by <a href="https://cusdis.com">Cusdis</a></p>
    </div>
  </div>
</body>
</html>`;
}