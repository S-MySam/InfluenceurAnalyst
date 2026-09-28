const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/trending-topics', (req, res) => {
  res.json({
    trending: [
      { name: 'AI in HR', mentions: 2450, posts: 12450, trend: '📈' },
      { name: 'Remote Work', mentions: 1890, posts: 8760, trend: '➡️' }
    ]
  });
});

app.get('/api/trend/:topic', (req, res) => {
  res.json({ topic: req.params.topic, articles: [] });
});

app.post('/api/analyze-posts', (req, res) => {
  res.json({ posts: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
