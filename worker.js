// Creator Intelligence Center - Cloudflare Worker backend
// Runs entirely on Groq (real-time AI generation). NewsAPI free tier was
// dropped: it returns totalResults > 0 but an empty articles array for any
// non-localhost/production request — a documented restriction of their free
// plan, not something fixable from our side.
// Secret required in Cloudflare dashboard: GROQ_API_KEY

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

async function groqChat(prompt, env, maxTokens = 500) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Groq response');
  return JSON.parse(match[0]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (path === '/health') {
      return json({ status: 'ok', groq: !!env.GROQ_API_KEY });
    }

    if (path === '/debug-models') {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` }
        });
        const data = await res.json();
        return json(data);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/trending-topics') {
      try {
        const prompt = `You are a LinkedIn content strategist for the HR/recruitment/talent acquisition space. List 5 currently important trending topics LinkedIn creators in HR should post about right now (September 2026). For each, give: name (short), a realistic mentions count (1000-5000), a realistic posts count (5000-20000), and a trend arrow (📈 or ➡️ or 📉). Return ONLY a JSON array, no prose, format: [{"name":"...","mentions":2450,"posts":12450,"trend":"📈"}]`;
        const raw = await groqChat(prompt, env, 600);
        const topics = extractJson(raw);
        return json({ trending: topics });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path.startsWith('/api/trend/')) {
      try {
        const topic = decodeURIComponent(path.replace('/api/trend/', ''));
        const prompt = `A LinkedIn creator wants to post about "${topic}". Give:
1. A 2-3 sentence analysis of why this topic matters right now and what angle to take.
2. Three concrete post ideas (titles only).
Return ONLY JSON: {"analysis":"...","post_ideas":["...","...","..."]}`;
        const raw = await groqChat(prompt, env, 500);
        const parsed = extractJson(raw);
        const searchLinks = [
          {
            title: `Voir les posts LinkedIn sur "${topic}"`,
            source: 'LinkedIn',
            url: `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(topic)}`,
            description: 'Recherche en direct sur LinkedIn'
          },
          {
            title: `Actualités sur "${topic}"`,
            source: 'Google News',
            url: `https://news.google.com/search?q=${encodeURIComponent(topic)}`,
            description: 'Recherche en direct sur Google News'
          }
        ];
        return json({
          topic,
          analysis: parsed.analysis,
          post_ideas: parsed.post_ideas || [],
          articles: searchLinks,
          total_found: searchLinks.length
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/analyze-posts' && request.method === 'POST') {
      try {
        const { posts } = await request.json();
        const results = [];
        for (const p of (posts || []).slice(0, 3)) {
          const prompt = `Analyze this LinkedIn post for engagement potential. Post: "${p}". Return ONLY JSON: {"engagement_score": <1-10 float>, "estimated_reach": <int>, "estimated_likes": <int>, "feedback": "<1 sentence tip>"}`;
          const raw = await groqChat(prompt, env, 200);
          const parsed = extractJson(raw);
          results.push({ content: p.substring(0, 100), ...parsed });
        }
        return json({ posts: results });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/competitor-analysis' && request.method === 'POST') {
      try {
        const { companies } = await request.json();
        const prompt = `Give a realistic LinkedIn benchmark estimate for these companies: ${(companies || []).join(', ')}. Return ONLY JSON array: [{"name":"...","avg_engagement":2500,"followers":150000}]`;
        const raw = await groqChat(prompt, env, 400);
        const competitors = extractJson(raw);
        return json({ competitors });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/recommendations') {
      try {
        const prompt = `Give 4 prioritized LinkedIn content recommendations for an HR creator right now (Sept 2026). Return ONLY JSON array: [{"priority":1,"title":"...","reason":"..."}]`;
        const raw = await groqChat(prompt, env, 400);
        const recommendations = extractJson(raw);
        return json({ recommendations });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  }
};
