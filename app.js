const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session'); // For session management
const bcrypt = require('bcrypt'); // For password hashing
const db = require('./models/db'); // Import database connection
const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.use(
  session({
    secret: 'your-secret-key', // Replace with a secure secret
    resave: false,
    saveUninitialized: false,
  })
);

// Test database connection (Optional: Remove in production)
(async () => {
  try {
    await db.execute('SELECT 1'); // Simple query to verify DB connection
    console.log('Database connected successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

// Routes

// Home Route
app.get('/', (req, res) => {
  res.render('home', { title: 'Welcome to Edu App' });
});

// Search Route
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const [results] = await db.execute(
      'SELECT * FROM quizzes WHERE title LIKE ? OR category LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    res.render('search', { title: 'Search Results', results, query });
  } catch (err) {
    console.error('Error fetching search results:', err);
    res.status(500).send('An error occurred while processing your search.');
  }
});

// Sign-In Routes
app.get('/signin', (req, res) => {
  res.render('signin', { title: 'Sign In' });
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).send('User not found.');
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid password.');
    }

    // Store user session
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    console.error('Error during sign-in:', err);
    res.status(500).send('Error signing in.');
  }
});

// Signup Routes
app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up' });
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    res.redirect('/signin');
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).send('An error occurred during signup.');
  }
});

// Timetable Route
app.get('/timetable', (req, res) => {
  res.render('timetable', { title: 'Timetable & Planner' });
});

// About Route
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Edu App' });
});

// Feedback Routes
app.get('/feedback', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/signin'); // Ensure user is signed in
  }
  res.render('feedback', { title: 'Submit Feedback' });
});

app.post('/feedback', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/signin'); // Ensure user is signed in
  }

  const { content } = req.body;
  try {
    await db.execute(
      'INSERT INTO feedback (user_id, content) VALUES (?, ?)',
      [req.session.user.id, content]
    );
    res.redirect('/'); // Redirect to home or success page
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).send('Error saving feedback.');
  }
});

// 404 Page
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
