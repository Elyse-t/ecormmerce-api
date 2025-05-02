require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// better-sqlite3 connection
const db = new Database('./database.sqlite');

// Initialize tables
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS products (
  productid INTEGER PRIMARY KEY AUTOINCREMENT,
  productname TEXT,
  description TEXT,
  quantity INTEGER,
  price REAL
)`);

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

    try {
      const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
      const result = stmt.run(username, email, hashedPassword);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    
    if (!user) return res.status(400).json({ error: 'User not found' });

    bcrypt.compare(password, user.password_hash, (err, match) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Products API
app.post('/api/products', authenticateToken, (req, res) => {
  const { productName, description, quantity, price } = req.body;
  
  try {
    const stmt = db.prepare('INSERT INTO products (productname, description, quantity, price) VALUES (?, ?, ?, ?)');
    const result = stmt.run(productName, description, quantity, price);
    res.json({ 
      productid: result.lastInsertRowid, 
      productName, 
      description, 
      quantity, 
      price 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products ORDER BY productid');
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE productid = ?');
    const row = stmt.get(req.params.id);
    
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
  const { productName, description, quantity, price } = req.body;
  
  try {
    const stmt = db.prepare('UPDATE products SET productname = ?, description = ?, quantity = ?, price = ? WHERE productid = ?');
    const result = stmt.run(productName, description, quantity, price, req.params.id);
    
    if (result.changes) {
      res.json({ 
        productid: req.params.id, 
        productName, 
        description, 
        quantity, 
        price 
      });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/products/:id', authenticateToken, (req, res) => {
  const { quantity } = req.body;
  
  try {
    const stmt = db.prepare('UPDATE products SET quantity = ? WHERE productid = ?');
    const result = stmt.run(quantity, req.params.id);
    
    if (result.changes) {
      res.json({ quantity });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM products WHERE productid = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes) {
      res.status(200).json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
