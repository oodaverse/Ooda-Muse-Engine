# Deployment Configuration for Shareable Character Profiles

## Overview
Character profiles can now be shared via URL routes that work on the deployed website. Users can share full character profiles with galleries, conversations, and all metadata.

## Required Configuration

### 1. Server-Side Routing (SPA Support)

Your web server needs to redirect all routes to `index.html` for client-side routing to work.

#### For **Vercel** (vercel.json):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### For **Netlify** (_redirects file):
```
/*    /index.html   200
```

#### For **Apache** (.htaccess):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### For **Nginx** (nginx.conf):
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 2. Share URL Format

Character profiles are shared using this URL structure:
```
https://yourdomain.com/share/?data=<base64_encoded_data>
```

The `data` parameter contains a base64-encoded JSON object with:
- Character information
- Gallery items (images, videos, embeds)
- Conversation history (chat nodes)

### 3. Gallery Media Considerations

**Important**: Gallery images and videos are embedded as base64 data URLs in the share link. This means:

- ✅ **Pros**: No external hosting needed, works offline after loading
- ⚠️ **Cons**: Large galleries will create very long URLs

**URL Length Limits**:
- Modern browsers: ~2MB URL length
- Recommended: Keep total gallery size under 10MB for best compatibility

**Alternative for Production** (Optional Enhancement):
Consider implementing a backend storage service:
1. Upload character data to cloud storage (S3, Cloudinary, etc.)
2. Generate short ID
3. Share URL becomes: `https://yourdomain.com/share/<short-id>`
4. Fetch data from storage when viewing

### 4. Build Configuration

Ensure your build process generates static files correctly:

```bash
# Build command
npm run build

# Output directory (typically)
dist/
```

### 5. Environment Variables

No environment variables are required for basic functionality. However, if you add backend storage for share links:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_STORAGE_BUCKET=your-bucket-name
```

## Testing Locally

Test the share functionality locally:

```bash
# Start dev server
npm run dev

# Generate a share link from the app
# URL will look like: http://localhost:5173/share/?data=...

# Test in different tab/browser to verify
```

## Features Included

### Shared Profile View
- ✅ Full character information (personality, scenario, etc.)
- ✅ Interactive gallery with modal viewer
- ✅ Complete conversation history (read-only)
- ✅ Responsive design matching app theme
- ✅ Copy share link button
- ✅ No login/authentication required
- ✅ Works offline after initial load

### Export Options
Users can:
1. **Export JSON** - Raw character data for backups
2. **Export HTML** - Standalone HTML file (no server needed)
3. **Share Profile** - Generate shareable URL for deployed site

## Security Considerations

1. **Data Privacy**: Share links contain all character data in the URL. Users should be aware they're sharing everything.
2. **URL Length**: Very large profiles may hit browser URL limits.
3. **No Authentication**: Shared profiles are publicly accessible by anyone with the link.
4. **Data Validation**: The app validates and sanitizes shared profile data on load.

## Troubleshooting

### Issue: 404 on shared profile URLs
**Solution**: Configure server-side routing (see section 1)

### Issue: Gallery images not loading
**Solution**: Check browser console for CORS errors. Gallery items are embedded as base64, so this should not occur unless blob URLs fail.

### Issue: URL too long error
**Solution**: Reduce gallery size or implement backend storage solution

### Issue: Profile shows "Invalid Profile Link"
**Solution**: The share link may be corrupted. Ensure URL is copied completely.

## Future Enhancements

Consider implementing:
- Backend storage service for shorter URLs
- Share link expiration/revocation
- View analytics for shared profiles
- Social media preview cards (Open Graph tags)
- QR code generation for easy mobile sharing
