// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const drive = require('./google-drive'); // optional helper (will try upload if configured)

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files (ensure frontend folder is at ../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// lowdb setup
const adapter = new JSONFile(path.join(__dirname, 'db.json'));
const db = new Low(adapter);

async function init() {
  await db.read();
  db.data = db.data || { users: [], payments: [], channels: [] };
  // seed channels if empty
  if (!db.data.channels || db.data.channels.length === 0) {
    db.data.channels = [
      { id: 'az1', type: 'bongo', name: 'Azam Sports 1', img: '/assets/images/azam1.jpg', url: '#' },
      { id: 'az2', type: 'bongo', name: 'Azam Sports 2', img: '/assets/images/azam2.jpg', url: '#' },
      { id: 'azm', type: 'movie', name: 'Azam Cinema', img: '/assets/images/azam_cinema.jpg', url: '#' },
      { id: 'sps', type: 'intl', name: 'SuperSport', img: '/assets/images/supersport.jpg', url: '#' }
    ];
    await db.write();
  }
}
init();

// helper: auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ----------------- Auth endpoints -----------------

// signup
app.post('/api/signup', async (req, res) => {
  const { name, phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });

  await db.read();
  if (db.data.users.find(u => u.phone === phone)) return res.status(400).json({ error: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), name: name || '', phone, password: hashed, createdAt: Date.now(), subscription: null };
  db.data.users.push(user);
  await db.write().catch(()=>{});
  // optional upload to Google Drive
  drive.uploadJson && drive.uploadJson('users.json', db.data.users).catch(()=>{});
  res.json({ success: true, userId: user.id });
});

// login
app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });

  await db.read();
  const user = db.data.users.find(u => u.phone === phone);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, subscription: user.subscription } });
});

// ----------------- Channels -----------------
app.get('/api/channels', async (req,res) => {
  await db.read();
  res.json(db.data.channels || []);
});

// get single channel
app.get('/api/channels/:id', async (req,res) => {
  const id = req.params.id;
  await db.read();
  const ch = (db.data.channels || []).find(c=>c.id===id);
  if(!ch) return res.status(404).json({error:'not found'});
  res.json(ch);
});

// ----------------- Payment (simulated) -----------------
// Plans mapping
const PLAN_MAP = {
  daily: {days:1, price:200},
  weekly: {days:7, price:1000},
  monthly: {days:30, price:2500},
  '2months': {days:60, price:4000},
  '6months': {days:180, price:10000},
  year: {days:365, price:18000}
};

// simulate payment endpoint
app.post('/api/pay', async (req,res) => {
  const { plan, phone, provider } = req.body; // provider optional (Airtel/Vodacom/Tigo/M-Pesa/Halotel)
  if(!plan || !phone) return res.status(400).json({ error: 'plan and phone required' });
  if(!PLAN_MAP[plan]) return res.status(400).json({ error: 'invalid plan' });

  await db.read();
  const payment = {
    id: nanoid(),
    plan,
    amount: PLAN_MAP[plan].price,
    phone,
    provider: provider || 'simulated',
    createdAt: Date.now()
  };
  db.data.payments.push(payment);

  // attach subscription if user exists
  const user = db.data.users.find(u => u.phone === phone);
  if(user){
    const ms = (PLAN_MAP[plan].days || 0) * 24*3600*1000;
    user.subscription = { plan, amount: PLAN_MAP[plan].price, validUntil: Date.now() + ms };
  }

  await db.write();
  // optional upload to Drive
  drive.uploadJson && drive.uploadJson('payments.json', db.data.payments).catch(()=>{});
  drive.uploadJson && user && drive.uploadJson('users.json', db.data.users).catch(()=>{});

  // return simulated success (in real integration you'd return provider callback status)
  res.json({ success: true, message: 'Payment simulated', payment });
});

// check subscription status
app.get('/api/subscription/:phone', async (req,res) => {
  const phone = req.params.phone;
  await db.read();
  const user = db.data.users.find(u => u.phone === phone);
  if(!user) return res.json({ hasSubscription: false });
  const s = user.subscription;
  const valid = s && s.validUntil && s.validUntil > Date.now();
  res.json({ hasSubscription: !!valid, subscription: s || null });
});

// admin: seed channels (dev)
app.post('/api/admin/seed', async (req,res) => {
  await db.read();
  db.data.channels = req.body.channels || db.data.channels;
  await db.write();
  drive.uploadJson && drive.uploadJson('channels.json', db.data.channels).catch(()=>{});
  res.json({ ok: true, count: db.data.channels.length });
});

// admin: dump db (dev)
app.get('/api/admin/db', async (req,res) => {
  await db.read();
  res.json(db.data);
});

// fallback - serve index.html for SPA routes
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`SwajayFour backend running on port ${PORT}`));