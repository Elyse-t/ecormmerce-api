require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// SQLite connection
const db = new sqlite3.Database('./database.sqlite');

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    productid INTEGER PRIMARY KEY AUTOINCREMENT,
    productname TEXT,
    description TEXT,
    quantity INTEGER,
    price REAL
  )`);
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Signup
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Products API
app.post('/api/products', authenticateToken, (req, res) => {
  const { productName, description, quantity, price } = req.body;
  db.run(
    'INSERT INTO products (productname, description, quantity, price) VALUES (?, ?, ?, ?)',
    [productName, description, quantity, price],
    function(err) {
      if (err) return res.status(500).send(err.message);
      res.json({ productid: this.lastID, productName, description, quantity, price });
    }
  );
});

app.get('/api/products', authenticateToken, (req, res) => {
  db.all('SELECT * FROM products ORDER BY productid', [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM products WHERE productid = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).send(err.message);
    row ? res.json(row) : res.status(404).send('Product not found');
  });
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
  const { productName, description, quantity, price } = req.body;
  db.run(
    'UPDATE products SET productname = ?, description = ?, quantity = ?, price = ? WHERE productid = ?',
    [productName, description, quantity, price, req.params.id],
    function(err) {
      if (err) return res.status(500).send(err.message);
      this.changes ? res.json({ productid: req.params.id, productName, description, quantity, price }) : res.status(404).send('Product not found');
    }
  );
});

app.patch('/api/products/:id', authenticateToken, (req, res) => {
  const { quantity } = req.body;
  db.run(
    'UPDATE products SET quantity = ? WHERE productid = ?',
    [quantity, req.params.id],
    function(err) {
      if (err) return res.status(500).send(err.message);
      this.changes ? res.json({ quantity }) : res.status(404).send('Product not found');
    }
  );
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM products WHERE productid = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    this.changes ? res.status(200).json({ message: 'Product deleted successfully' }) : res.status(404).json({ error: 'Product not found' });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
