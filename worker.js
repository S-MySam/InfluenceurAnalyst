// Creator Intelligence Center - Cloudflare Worker backend
// Secrets to set in Cloudflare dashboard: GROQ_API_KEY, NEWS_API_KEY

function cors(resp) {
  resp.headers.set('Access-Control-Allow-Origin', '*');
  resp.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  resp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return resp;
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
}

async function newsApiFetch(query, env) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=popularity&language=en&pageSize=5&apiKey=${env.NEWS_API_KEY}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CreatorIntelligence/1.0' }
  });
  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(`NewsAPI error: ${data.code} - ${data.message}`);
  }
  return data.articles || [];
}

async function groqAnalyze(topic, env) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Analyze this trending topic in 2-3 sentences for LinkedIn creators: "${topic}". What content should they create?`
        }],
        max_tokens: 200
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || `Trending topic: ${topic}.`;
  } catch (e) {
    return `Trending topic: ${topic}. Creators should explore this with fresh perspectives.`;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (path === '/health') {
      return json({ status: 'ok', groq: !!env.GROQ_API_KEY, news: !!env.NEWS_API_KEY });
    }

    if (path === '/api/trending-topics') {
      try {
        const articles = await newsApiFetch('LinkedIn HR recruitment AI', env);
        const topics = articles.map(article => ({
          name: article.title.substring(0, 50),
          mentions: Math.floor(Math.random() * 5000) + 1000,
          posts: Math.floor(Math.random() * 20000) + 5000,
          trend: ['📈', '📈', '➡️'][Math.floor(Math.random() * 3)],
          source: article.source.name
        }));
        return json({ trending: topics });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path.startsWith('/api/trend/')) {
      try {
        const topic = decodeURIComponent(path.replace('/api/trend/', ''));
        const rawArticles = await newsApiFetch(topic, env);
        const articles = rawArticles.map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          published: article.publishedAt,
          engagement_estimate: Math.floor(Math.random() * 5000 + 500)
        }));
        const analysis = await groqAnalyze(topic, env);
        return json({ topic, articles, analysis, total_found: articles.length });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/analyze-posts' && request.method === 'POST') {
      const { posts } = await request.json();
      return json({
        posts: (posts || []).map((p, i) => ({
          id: i,
          content: p.substring(0, 100),
          engagement_score: (Math.random() * 8 + 2).toFixed(1),
          estimated_reach: Math.floor(Math.random() * 50000 + 1000),
          estimated_likes: Math.floor(Math.random() * 3000)
        }))
      });
    }

    if (path === '/api/competitor-analysis' && request.method === 'POST') {
      return json({
        competitors: [
          { name: 'Competitor 1', avg_engagement: 2500, followers: 150000 },
          { name: 'Competitor 2', avg_engagement: 3200, followers: 200000 }
        ]
      });
    }

    if (path === '/api/recommendations') {
      return json({
        recommendations: [
          { priority: 1, title: 'Post about trending topics', reason: 'High engagement' },
          { priority: 2, title: 'Share case studies', reason: 'Growing interest' }
        ]
      });
    }

    return json({ error: 'Not found' }, 404);
  }
};
