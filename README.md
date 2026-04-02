# PDF Tools Suite - Complete PDF Manipulation App

A comprehensive Node.js web application for PDF manipulation with subscription-based monetization. Now available as a Progressive Web App (PWA) that can be installed on Android devices!

## ✨ Features

- 🖼️ **Images to PDF** - Convert multiple images to PDF
- ✂️ **Split PDF** - Split PDF into individual pages
- 🗜️ **Compress PDF** - Reduce PDF file size
- 💧 **Add Watermark** - Add text watermarks to PDF
- 🔒 **Password Protect** - Encrypt PDFs with passwords
- 📝 **PDF to Text** - Extract text from PDFs
- 🔄 **Rotate Pages** - Rotate PDF pages
- 🗑️ **Remove Pages** - Remove specific pages
- 📄 **Add Page Numbers** - Add page numbers to PDFs
- 👑 **Premium Features** - Subscription-based access
- 💳 **Razorpay Integration** - Real payment processing
- 📱 **PWA Support** - Install on Android devices

## 🚀 Installation

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm start
   ```

3. Open your browser and go to `http://localhost:3001`

### 📱 Android Installation

Your app is now a Progressive Web App (PWA)! Follow these steps:

#### Step 1: Deploy to Server
Choose one of these hosting options:

**Vercel (Recommended - Free)**:
```bash
npm run deploy
# or
./deploy.sh  # Linux/Mac
# or
deploy.bat   # Windows
```

**Other Options**: Railway, Render, DigitalOcean, AWS

#### Step 2: Install on Android
1. Open **Chrome Browser** on your Android device
2. Navigate to your deployed app URL
3. Tap the menu (⋮) → **"Add to Home screen"**
4. Tap **"Add"** to install

#### Step 3: Configure Payments (Optional)
1. Sign up at [razorpay.com](https://razorpay.com)
2. Get your API keys from the dashboard
3. Update `server.js` with real Razorpay keys:
   ```javascript
   const razorpay = new Razorpay({
       key_id: 'rzp_live_your_key_id',
       key_secret: 'your_secret_key'
   });
   ```

## 📋 Usage

### Web Version
- Upload files using the drag & drop interface
- Select your desired PDF operation
- Download the processed PDF

### Android App
- Install as PWA from Chrome
- Works offline for cached content
- Native app-like experience
- Responsive design optimized for mobile

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **PDF Processing**: PDF-lib, PDFKit, Sharp
- **Payments**: Razorpay Integration
- **PWA**: Service Worker, Web App Manifest
- **UI**: Material Design inspired

## 📱 PWA Features

- ✅ **Installable** - Add to Android home screen
- ✅ **Offline Support** - Cached resources work offline
- ✅ **Native Experience** - Standalone app mode
- ✅ **Responsive** - Mobile-optimized interface
- ✅ **Fast Loading** - Service worker caching

## 🔧 Development

### Available Scripts
```bash
npm start      # Start development server
npm run dev    # Same as start
npm run deploy # Deploy to Vercel
```

### Project Structure
```
├── server.js           # Express server & API routes
├── public/             # Static web files
│   ├── index.html      # Main application
│   ├── subscription.html # Payment page
│   ├── style.css       # Stylesheets
│   ├── manifest.json   # PWA manifest
│   └── sw.js          # Service worker
├── uploads/            # File upload directory
├── users.json          # User data storage
└── package.json        # Dependencies
```

## 📖 API Endpoints

- `POST /convert` - Convert images to PDF
- `POST /split-pdf` - Split PDF
- `POST /compress-pdf` - Compress PDF
- `POST /add-watermark` - Add watermark
- `POST /protect-pdf` - Password protect
- `POST /pdf-to-text` - Extract text
- `POST /rotate-pdf` - Rotate pages
- `POST /remove-pages` - Remove pages
- `POST /add-numbers` - Add page numbers
- `POST /api/create-order` - Create payment order
- `POST /api/verify-payment` - Verify payment
- `GET /api/subscription-plans` - Get plans
- `GET /api/user/:id/subscription` - Get user subscription

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**🎉 Your PDF Tools Suite is now ready for Android! Install it today and start converting PDFs on the go!**

1. Click "Choose Files" to select one or more images.
2. Click "Convert to PDF" to generate and download the PDF.

## Dependencies

- Express: Web framework
- Multer: File upload handling
- PDFKit: PDF generation
- Sharp: Image processing