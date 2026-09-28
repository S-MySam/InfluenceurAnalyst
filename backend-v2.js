const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', groq: !!process.env.GROQ_API_KEY, news: !!NEWS_API_KEY });
});

// Trending topics
app.get('/api/trending-topics', async (req, res) => {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'LinkedIn HR recruitment AI',
        sortBy: 'popularity',
        language: 'en',
        pageSize: 5,
        apiKey: NEWS_API_KEY
      }
    });

    const articles = response.data.articles || [];
    const topics = articles.map((article, idx) => ({
      name: article.title.substring(0, 50),
      mentions: Math.floor(Math.random() * 5000) + 1000,
      posts: Math.floor(Math.random() * 20000) + 5000,
      trend: ['📈', '📈', '➡️'][Math.floor(Math.random() * 3)],
      source: article.source.name
    }));

    res.json({ trending: topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trend detail with Groq analysis
app.get('/api/trend/:topic', async (req, res) => {
  try {
    const { topic } = req.params;

    const newsRes = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: topic,
        sortBy: 'relevancy',
        language: 'en',
        pageSize: 5,
        apiKey: NEWS_API_KEY
      }
    });

    const articles = (newsRes.data.articles || []).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      published: article.publishedAt,
      engagement_estimate: Math.floor(Math.random() * 5000 + 500)
    }));

    let analysis = '';
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `Analyze this trending topic in 2-3 sentences for LinkedIn creators: "${topic}". What content should they create?`
          }
        ],
        model: 'mixtral-8x7b-32768',
        max_tokens: 200
      });
      analysis = completion.choices[0].message.content;
    } catch (groqErr) {
      analysis = `Trending topic: ${topic}. Creators should explore this topic with fresh perspectives.`;
    }

    res.json({
      topic,
      articles,
      analysis,
      total_found: articles.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze posts
app.post('/api/analyze-posts', (req, res) => {
  const { posts } = req.body;
  res.json({
    posts: (posts || []).map((p, i) => ({
      id: i,
      content: p.substring(0, 100),
      engagement_score: (Math.random() * 8 + 2).toFixed(1),
      estimated_reach: Math.floor(Math.random() * 50000 + 1000),
      estimated_likes: Math.floor(Math.random() * 3000)
    }))
  });
});

// Competitor analysis
app.post('/api/competitor-analysis', (req, res) => {
  res.json({
    competitors: [
      { name: 'Competitor 1', avg_engagement: 2500, followers: 150000 },
      { name: 'Competitor 2', avg_engagement: 3200, followers: 200000 }
    ]
  });
});

// Recommendations
app.get('/api/recommendations', (req, res) => {
  res.json({
    recommendations: [
      { priority: 1, title: 'Post about trending topics', reason: 'High engagement' },
      { priority: 2, title: 'Share case studies', reason: 'Growing interest' }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on ${PORT}`);
  console.log(`Groq: ${process.env.GROQ_API_KEY ? '✓' : '✗'}`);
  console.log(`NewsAPI: ${process.env.NEWS_API_KEY ? '✓' : '✗'}`);
});
