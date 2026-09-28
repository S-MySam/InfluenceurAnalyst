const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// NewsAPI key (get free one at newsapi.org)
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'demo';

// ==================== LINKEDIN POST ANALYZER ====================

app.post('/api/analyze-posts', async (req, res) => {
  try {
    const { posts } = req.body;
    
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: 'Posts array required' });
    }

    const analyzed = posts.map((post, idx) => ({
      id: idx,
      content: post.substring(0, 200),
      engagement_score: (Math.random() * 10 + 2).toFixed(2),
      estimated_likes: Math.floor(Math.random() * 5000 + 100),
      estimated_comments: Math.floor(Math.random() * 500 + 20),
      estimated_shares: Math.floor(Math.random() * 200 + 5),
      estimated_reach: Math.floor(Math.random() * 50000 + 5000),
      sentiment: ['Positif', 'Neutre', 'Engageant', 'Inspirant'][Math.floor(Math.random() * 4)],
      keywords: generateKeywords(post),
      posting_time_suggestion: ['09:00', '11:30', '14:00', '16:30'][Math.floor(Math.random() * 4)]
    }));

    res.json({ posts: analyzed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TRENDING TOPICS ====================

app.get('/api/trending-topics', async (req, res) => {
  try {
    const topics = [
      { 
        name: 'AI in HR & Recruitment', 
        mentions: 2450, 
        posts: 12450, 
        trend: '📈',
        keywords: ['AI', 'recruitment', 'automation', 'HR tech'],
        last_update: new Date().toISOString()
      },
      { 
        name: 'Remote Work & Culture', 
        mentions: 1890, 
        posts: 8760, 
        trend: '➡️',
        keywords: ['remote', 'hybrid', 'culture', 'collaboration'],
        last_update: new Date().toISOString()
      },
      { 
        name: 'Employee Wellness', 
        mentions: 3200, 
        posts: 15320, 
        trend: '📈',
        keywords: ['wellness', 'mental health', 'burnout', 'wellbeing'],
        last_update: new Date().toISOString()
      },
      { 
        name: 'Skills-Based Hiring', 
        mentions: 2100, 
        posts: 9870, 
        trend: '📈',
        keywords: ['skills', 'talent', 'hiring', 'development'],
        last_update: new Date().toISOString()
      },
      { 
        name: 'Employer Branding', 
        mentions: 1650, 
        posts: 7890, 
        trend: '📈',
        keywords: ['branding', 'EVP', 'talent attraction', 'company culture'],
        last_update: new Date().toISOString()
      }
    ];

    res.json({ trending: topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DRILL-DOWN: Get posts for a trend ====================

app.get('/api/trend/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const keywords = topic.split(' ').slice(0, 3).join(' ');

    // Fetch real articles from NewsAPI
    let articles = [];
    
    if (NEWS_API_KEY !== 'demo') {
      try {
        const newsRes = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: keywords,
            sortBy: 'relevancy',
            language: 'en',
            pageSize: 10,
            apiKey: NEWS_API_KEY
          },
          timeout: 5000
        });

        articles = (newsRes.data.articles || []).map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          image: article.urlToImage,
          published: article.publishedAt,
          engagement_estimate: Math.floor(Math.random() * 5000 + 500),
          relevance_score: (Math.random() * 0.5 + 0.5).toFixed(2)
        }));
      } catch (e) {
        console.log('NewsAPI error, using mock data');
      }
    }

    // Fallback: mock data if API fails or no key
    if (articles.length === 0) {
      articles = generateMockArticles(topic);
    }

    res.json({ 
      topic, 
      articles: articles.slice(0, 10),
      total_found: articles.length,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMPETITOR ANALYSIS ====================

app.post('/api/competitor-analysis', async (req, res) => {
  try {
    const { companies, industry } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ error: 'Companies array required' });
    }

    const analysis = companies.map(company => ({
      name: company,
      avg_engagement: (Math.random() * 3000 + 500).toFixed(0),
      post_frequency: Math.floor(Math.random() * 30 + 5) + ' posts/month',
      top_topics: generateKeywords(company),
      viral_posts_count: Math.floor(Math.random() * 15 + 3),
      audience_growth: (Math.random() * 15 + 5).toFixed(1) + '%',
      engagement_trend: ['📈', '➡️', '📉'][Math.floor(Math.random() * 3)],
      follower_estimate: Math.floor(Math.random() * 500000 + 10000)
    }));

    const benchmark = {
      industry,
      avg_engagement_across: (analysis.reduce((acc, a) => acc + parseInt(a.avg_engagement), 0) / analysis.length).toFixed(0),
      top_topics_overall: ['AI', 'Leadership', 'Innovation', 'Culture', 'Growth'],
      best_posting_times: ['09:00', '11:30', '14:00', '16:30'],
      best_content_format: 'Video (40%) > Carousel (35%) > Article (25%)'
    };

    res.json({ competitors: analysis, benchmark });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONTENT RECOMMENDATIONS ====================

app.get('/api/recommendations', async (req, res) => {
  try {
    const recommendations = [
      {
        priority: 1,
        title: 'Create video content on AI trends',
        reason: 'Trending now with 2450+ mentions',
        expected_reach: '5K-50K',
        time_to_create: '2-3 hours',
        content_type: 'Short video'
      },
      {
        priority: 2,
        title: 'Post about remote culture/flexibility',
        reason: 'Consistent engagement, 1890 mentions',
        expected_reach: '3K-20K',
        time_to_create: '1 hour',
        content_type: 'Carousel or long-form'
      },
      {
        priority: 3,
        title: 'Write about skills-based hiring',
        reason: 'Emerging trend, high engagement potential',
        expected_reach: '2K-15K',
        time_to_create: '1.5 hours',
        content_type: 'Article/Thread'
      },
      {
        priority: 4,
        title: 'Share employee wellness case study',
        reason: 'High volume (3200 mentions), authentic content wins',
        expected_reach: '4K-30K',
        time_to_create: '2 hours',
        content_type: 'Case study + video'
      }
    ];

    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== UTILS ====================

function generateKeywords(text) {
  const keywords = ['AI', 'Leadership', 'Growth', 'Culture', 'Innovation', 'Remote', 'Skills', 'Recruitment', 'Engagement', 'Future'];
  return keywords.sort(() => 0.5 - Math.random()).slice(0, 3);
}

function generateMockArticles(topic) {
  return [
    {
      title: `${topic}: Latest Trends and Insights`,
      description: `Comprehensive overview of what's happening in ${topic} right now. Industry leaders share their thoughts on future direction.`,
      url: `https://linkedin.com/feed?search=${encodeURIComponent(topic)}`,
      source: 'LinkedIn',
      image: 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(topic.split(' ')[0]),
      published: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      engagement_estimate: Math.floor(Math.random() * 5000 + 500),
      relevance_score: (Math.random() * 0.5 + 0.5).toFixed(2)
    },
    {
      title: `How Companies are Succeeding with ${topic}`,
      description: `Real case studies from leading organizations implementing ${topic} strategies effectively.`,
      url: `https://linkedin.com/feed?search=${encodeURIComponent(topic)}`,
      source: 'LinkedIn Pulse',
      image: 'https://via.placeholder.com/300x200?text=Case+Study',
      published: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      engagement_estimate: Math.floor(Math.random() * 5000 + 500),
      relevance_score: (Math.random() * 0.5 + 0.5).toFixed(2)
    },
    {
      title: `${topic}: What Experts Predict for 2026`,
      description: `Industry experts share their predictions and recommendations for ${topic} in the coming year.`,
      url: `https://linkedin.com/feed?search=${encodeURIComponent(topic)}`,
      source: 'HR.com',
      image: 'https://via.placeholder.com/300x200?text=Predictions',
      published: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      engagement_estimate: Math.floor(Math.random() * 5000 + 500),
      relevance_score: (Math.random() * 0.5 + 0.5).toFixed(2)
    }
  ];
}

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Creator Intelligence Backend v2 running on port ${PORT}`);
});
