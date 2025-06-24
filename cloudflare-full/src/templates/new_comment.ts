export function makeNewCommentEmailTemplate(data: {
  page_slug: string;
  content: string;
  by_nickname: string;
  unsubscribe_link: string;
  approve_link: string;
  notification_preferences_link: string;
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Comment on Cusdis</title>
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
    .comment-info {
      background-color: #f8f9fa;
      border-left: 4px solid #007cba;
      padding: 15px;
      margin: 20px 0;
    }
    .comment-content {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007cba;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 10px 0;
    }
    .button:hover {
      background-color: #006ba1;
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
      <h2>New comment on "${data.page_slug}"</h2>
      
      <div class="comment-info">
        <strong>${data.by_nickname}</strong> left a comment
      </div>
      
      <div class="comment-content">
        ${data.content}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.approve_link}" class="button">Approve / Reply</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">
        Click the button above to approve this comment or reply to it without logging into your dashboard.
      </p>
    </div>
    
    <div class="footer">
      <p>
        <a href="${data.unsubscribe_link}">Unsubscribe</a> from new comment notifications<br>
        <a href="${data.notification_preferences_link}">Manage notification preferences</a>
      </p>
      <p>
        Powered by <a href="https://cusdis.com">Cusdis</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}