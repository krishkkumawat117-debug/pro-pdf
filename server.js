const express = require('express');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PDFDocument: PDFLibDocument, rgb } = require('pdf-lib');
const { createWorker } = require('tesseract.js');
const session = require('express-session');
const Razorpay = require('razorpay');

const app = express();
const port = 3001;

// Razorpay configuration
const razorpay = new Razorpay({
    key_id: 'rzp_test_your_key_id', // Replace with your Razorpay Key ID
    key_secret: 'your_secret_key' // Replace with your Razorpay Secret Key
});

// Subscription plans
const SUBSCRIPTION_PLANS = {
    weekly: { price: 200, name: 'Weekly Plan', duration: 7 },
    monthly: { price: 500, name: 'Monthly Plan', duration: 30 },
    yearly: { price: 5000, name: 'Yearly Plan', duration: 365 },
    permanent: { price: 10000, name: 'Permanent Plan', duration: -1 }
};

// Admin configuration
const ADMIN_PASSWORD = 'admin123'; // Change this in production
const USERS_DATA_FILE = path.join(__dirname, 'users.json');

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Initialize users data file if it doesn't exist
if (!fs.existsSync(USERS_DATA_FILE)) {
    fs.writeFileSync(USERS_DATA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin authentication
app.use(session({
    secret: 'pdf-tools-admin-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Admin authentication middleware
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. Images to PDF
app.post('/convert', upload.array('images'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No images uploaded.');
    }

    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, 'output.pdf');
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    for (const file of req.files) {
        try {
            const imageBuffer = await sharp(file.path).png().toBuffer();
            doc.addPage().image(imageBuffer, 0, 0, { width: 600 });
        } catch (error) {
            console.error('Error processing image:', error);
        } finally {
            fs.unlinkSync(file.path);
        }
    }

    doc.end();

    stream.on('finish', () => {
        res.download(pdfPath, 'converted.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            }
            fs.unlinkSync(pdfPath);
        });
    });
});

// 2. PDF to Images
app.post('/pdf-to-images', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF uploaded.');
    }

    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const images = [];

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            const imageBytes = await page.doc.saveAsBase64({ dataUri: true });
            images.push(imageBytes);
        }

        fs.unlinkSync(req.file.path);
        res.json({ images });
    } catch (error) {
        console.error('Error converting PDF to images:', error);
        res.status(500).send('Error processing PDF.');
    }
});

// 3. Merge PDFs
app.post('/merge-pdfs', upload.array('pdfs'), async (req, res) => {
    if (!req.files || req.files.length < 2) {
        return res.status(400).send('Upload at least 2 PDFs.');
    }

    try {
        const mergedPdf = await PDFLibDocument.create();

        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdf = await PDFLibDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
            fs.unlinkSync(file.path);
        }

        const pdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, 'merged.pdf');
        fs.writeFileSync(outputPath, pdfBytes);
        res.download(outputPath, 'merged.pdf', () => fs.unlinkSync(outputPath));
    } catch (error) {
        console.error('Error merging PDFs:', error);
        res.status(500).send('Error merging PDFs.');
    }
});

// 4. Split PDF
app.post('/split-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF uploaded.');
    }

    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const splitPdfs = [];

        for (let i = 0; i < pages.length; i++) {
            const newPdf = await PDFLibDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const bytes = await newPdf.save();
            splitPdfs.push(bytes);
        }

        fs.unlinkSync(req.file.path);
        res.json({ pdfs: splitPdfs });
    } catch (error) {
        console.error('Error splitting PDF:', error);
        res.status(500).send('Error splitting PDF.');
    }
});

// 5. Compress PDF
app.post('/compress-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF uploaded.');
    }

    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const compressedBytes = await pdfDoc.save({ useObjectStreams: false });
        const outputPath = path.join(__dirname, 'compressed.pdf');
        fs.writeFileSync(outputPath, compressedBytes);
        fs.unlinkSync(req.file.path);
        res.download(outputPath, 'compressed.pdf', () => fs.unlinkSync(outputPath));
    } catch (error) {
        console.error('Error compressing PDF:', error);
        res.status(500).send('Error compressing PDF.');
    }
});

// 6. Add Watermark
app.post('/add-watermark', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF uploaded.');
    }

    const watermarkText = req.body.watermark || 'Watermark';

    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
                x: width / 2 - 50,
                y: height / 2,
                size: 50,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.5,
            });
        }

        const watermarkedBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, 'watermarked.pdf');
        fs.writeFileSync(outputPath, watermarkedBytes);
        fs.unlinkSync(req.file.path);
        res.download(outputPath, 'watermarked.pdf', () => fs.unlinkSync(outputPath));
    } catch (error) {
        console.error('Error adding watermark:', error);
        res.status(500).send('Error adding watermark.');
    }
});

// 7. Password Protect PDF
app.post('/protect-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF uploaded.');
    }

    const password = req.body.password || 'password';

    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const protectedBytes = await pdfDoc.save({ userPassword: password });
        const outputPath = path.join(__dirname, 'protected.pdf');
        fs.writeFileSync(outputPath, protectedBytes);
        fs.unlinkSync(req.file.path);
        res.download(outputPath, 'protected.pdf', () => fs.unlinkSync(outputPath));
    } catch (error) {
        console.error('Error protecting PDF:', error);
        res.status(500).send('Error protecting PDF.');
    }
});

// 8. OCR for Images to PDF (add text layer)
app.post('/convert-with-ocr', upload.array('images'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No images uploaded.');
    }

    const worker = await createWorker('eng');
    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, 'ocr.pdf');
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    for (const file of req.files) {
        try {
            const imageBuffer = await sharp(file.path).png().toBuffer();
            const { data: { text } } = await worker.recognize(file.path);
            doc.addPage().image(imageBuffer, 0, 0, { width: 600 });
            doc.text(text, 50, 50);
        } catch (error) {
            console.error('Error processing image with OCR:', error);
        } finally {
            fs.unlinkSync(file.path);
        }
    }

    await worker.terminate();
    doc.end();

    stream.on('finish', () => {
        res.download(pdfPath, 'ocr.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            }
            fs.unlinkSync(pdfPath);
        });
    });
});

// Admin Routes
app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.send(`
            <script>
                alert('Invalid password!');
                window.location.href = '/admin/login';
            </script>
        `);
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes for Admin Panel
app.get('/api/admin/users', requireAdmin, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        const newUser = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        users.push(newUser);
        fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2));
        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.id === req.params.id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        users[userIndex] = { ...users[userIndex], ...req.body, updatedAt: new Date().toISOString() };
        fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2));
        res.json(users[userIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        const filteredUsers = users.filter(u => u.id !== req.params.id);
        fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(filteredUsers, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Mock Google auth endpoint (for demo)
app.post('/auth/google', (req, res) => {
    // In a real implementation, this would handle Google OAuth
    const mockUser = {
        id: Date.now().toString(),
        name: 'Demo User',
        email: 'demo@gmail.com',
        subscription: 'free',
        paymentHistory: [],
        loginTime: new Date().toISOString()
    };

    // Save to users data
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        const existingUser = users.find(u => u.email === mockUser.email);
        if (!existingUser) {
            users.push(mockUser);
            fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2));
        }
    } catch (error) {
        console.error('Error saving user:', error);
    }

    res.json({ success: true, user: mockUser });
});

// Payment Routes
app.post('/api/create-order', (req, res) => {
    const { plan, userId } = req.body;

    if (!SUBSCRIPTION_PLANS[plan]) {
        return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const planDetails = SUBSCRIPTION_PLANS[plan];
    const amount = planDetails.price * 100; // Razorpay expects amount in paisa

    const options = {
        amount: amount,
        currency: 'INR',
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: {
            userId: userId,
            plan: plan,
            planName: planDetails.name
        }
    };

    razorpay.orders.create(options, (err, order) => {
        if (err) {
            console.error('Error creating order:', err);
            return res.status(500).json({ error: 'Failed to create payment order' });
        }

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            plan: plan,
            planName: planDetails.name
        });
    });
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;

    // Verify payment signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = require('crypto')
        .createHmac('sha256', razorpay.key_secret)
        .update(sign.toString())
        .digest('hex');

    if (razorpay_signature === expectedSign) {
        // Payment verified successfully
        try {
            const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex !== -1) {
                // Update user subscription
                users[userIndex].subscription = plan;
                users[userIndex].status = 'active';

                // Add payment to history
                const paymentRecord = {
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    plan: plan,
                    amount: SUBSCRIPTION_PLANS[plan].price,
                    currency: 'INR',
                    date: new Date().toISOString(),
                    status: 'completed'
                };

                if (!users[userIndex].paymentHistory) {
                    users[userIndex].paymentHistory = [];
                }
                users[userIndex].paymentHistory.push(paymentRecord);

                // Set subscription expiry (except for permanent)
                if (plan !== 'permanent') {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_PLANS[plan].duration);
                    users[userIndex].subscriptionExpiry = expiryDate.toISOString();
                } else {
                    users[userIndex].subscriptionExpiry = null; // Never expires
                }

                users[userIndex].updatedAt = new Date().toISOString();

                fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2));

                res.json({
                    success: true,
                    message: 'Payment verified and subscription updated',
                    user: users[userIndex]
                });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user subscription' });
        }
    } else {
        res.status(400).json({ error: 'Payment verification failed' });
    }
});

// Get subscription plans
app.get('/api/subscription-plans', (req, res) => {
    res.json(SUBSCRIPTION_PLANS);
});

// Check subscription status
app.get('/api/user/:userId/subscription', (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_DATA_FILE, 'utf8'));
        const user = users.find(u => u.id === req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const now = new Date();
        const expiryDate = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;

        let isActive = user.subscription !== 'free';
        if (expiryDate && now > expiryDate) {
            isActive = false;
            // Optionally update user status to inactive
            user.status = 'inactive';
            fs.writeFileSync(USERS_DATA_FILE, JSON.stringify(users, null, 2));
        }

        res.json({
            subscription: user.subscription || 'free',
            status: user.status || 'active',
            isActive: isActive,
            expiryDate: user.subscriptionExpiry,
            paymentHistory: user.paymentHistory || []
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).json({ error: 'Failed to check subscription status' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});