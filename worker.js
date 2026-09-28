// Creator Intelligence Center - Cloudflare Worker backend
// Runs entirely on Groq (real-time AI generation, model: openai/gpt-oss-120b).
// NewsAPI free tier was dropped: it returns totalResults > 0 but an empty
// articles array for any non-localhost/production request — a documented
// restriction of their free plan, not something fixable from our side.
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

// Uses Groq's native JSON mode (response_format: json_object) instead of
// regex-extracting JSON from free text — far more reliable. The prompt must
// ask for a top-level JSON OBJECT (json_object mode rejects bare arrays),
// so array-shaped results are wrapped as {"items": [...]}.
async function groqJson(prompt, env, maxTokens = 600) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.6,
      response_format: { type: 'json_object' }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Groq returned invalid JSON: ${content.substring(0, 200)}`);
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
      return json({ status: 'ok', groq: !!env.GROQ_API_KEY });
    }

    if (path === '/api/trending-topics') {
      try {
        const prompt = `You are a LinkedIn content strategist for the HR/recruitment/talent acquisition space. List 5 currently important trending topics LinkedIn creators in HR should post about right now (September 2026). For each, give: name (short string), mentions (realistic int 1000-5000), posts (realistic int 5000-20000), trend (one of "📈", "➡️", "📉"). Return a JSON object: {"items":[{"name":"...","mentions":2450,"posts":12450,"trend":"📈"}, ...]}`;
        const parsed = await groqJson(prompt, env, 700);
        return json({ trending: parsed.items || [] });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path.startsWith('/api/trend/')) {
      try {
        const topic = decodeURIComponent(path.replace('/api/trend/', ''));
        const prompt = `A LinkedIn creator wants to post about "${topic}". Return a JSON object: {"analysis":"2-3 sentence analysis of why this topic matters right now and what angle to take","post_ideas":["idea 1 title","idea 2 title","idea 3 title"]}`;
        const parsed = await groqJson(prompt, env, 500);
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
          analysis: parsed.analysis || '',
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
          const prompt = `Analyze this LinkedIn post for engagement potential. Post: "${p.replace(/"/g, "'")}". Return a JSON object: {"engagement_score": 7.5, "estimated_reach": 12000, "estimated_likes": 340, "feedback": "one sentence tip"}`;
          const parsed = await groqJson(prompt, env, 250);
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
        const prompt = `Give a realistic LinkedIn benchmark estimate for these companies: ${(companies || []).join(', ')}. Return a JSON object: {"items":[{"name":"...","avg_engagement":2500,"followers":150000}, ...]}`;
        const parsed = await groqJson(prompt, env, 500);
        return json({ competitors: parsed.items || [] });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (path === '/api/recommendations') {
      try {
        const prompt = `Give 4 prioritized LinkedIn content recommendations for an HR creator right now (Sept 2026). Return a JSON object: {"items":[{"priority":1,"title":"...","reason":"..."}, ...]}`;
        const parsed = await groqJson(prompt, env, 500);
        return json({ recommendations: parsed.items || [] });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  }
};
