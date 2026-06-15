const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

const middleware = `
// ---- Visual Editor Middleware ----
app.get(['/', '/index.html'], (req, res, next) => {
    if (req.query.editMode === '1') {
        const indexPath = path.join(__dirname, "public", "index.html");
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            html = html.replace('</body>', '<script src="/visual-editor.js"></script></body>');
            return res.send(html);
        }
    }
    next();
});
`;

if (!code.includes('Visual Editor Middleware')) {
    code = code.replace('app.use(cookieParser());', 'app.use(cookieParser());\n' + middleware);
}

const saveRoute = `
// ---- Save Website ----
app.post("/api/admin/save-website", express.json({limit: '50mb'}), (req, res) => {
    const adminId = Number(req.body?.adminId);
    const html = req.body?.html;

    const admin = requireUser(adminId);
    if (!admin) return res.status(401).json({ error: "Login qiling" });
    if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });
    
    if (!html) return res.status(400).json({ error: "HTML kodi yo'q" });

    const indexPath = path.join(__dirname, "public", "index.html");
    
    // Create backup
    if (fs.existsSync(indexPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(indexPath, indexPath.replace('.html', '-backup-' + timestamp + '.html'));
    }
    
    fs.writeFileSync(indexPath, html);
    return res.json({ ok: true });
});
`;

if (!code.includes('Save Website')) {
    code = code.replace('app.post("/api/admin/wallet-adjust"', saveRoute + '\napp.post("/api/admin/wallet-adjust"');
}

fs.writeFileSync('server/server.js', code);
console.log('server.js updated successfully');
