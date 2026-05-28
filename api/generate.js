export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { anthropicKey, openaiKey, imageBase64, mediaType, q1, q2, q3, q4 } = req.body;

  if (!anthropicKey || !openaiKey || !imageBase64) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Step 1: Call Anthropic Claude
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          },
          {
            type: 'text',
            text: `You are a creative AI image prompt writer. The person in this photo wants a beautiful, painterly illustration of themselves at a San Francisco picnic.

Here are their picnic details:
- Dream SF food: ${q1}
- Dream SF park: ${q2}
- Blanket: ${q3}
- Pet at the park: ${q4}

Describe the person's appearance from the photo (hair color, skin tone, rough age, notable features, clothing style if visible) and write a vivid, detailed DALL-E image generation prompt for a beautiful illustrated scene of this specific person enjoying their dream SF picnic with all the details above.

The style should be warm, sun-drenched editorial illustration like a magazine cover for a San Francisco lifestyle magazine. Include the Golden Gate Bridge or iconic SF skyline subtly in the background. Make it feel golden hour, magical, and summery.

Return ONLY the image prompt, nothing else. No preamble, no explanation. Just the prompt.`
          }
        ]
      }]
    })
  });

  const claudeData = await claudeRes.json();
  if (!claudeRes.ok) return res.status(500).json({ error: claudeData.error?.message || 'Claude API error' });
  const imagePrompt = claudeData.content[0].text.trim();

  // Step 2: Call OpenAI DALL-E
  const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    })
  });

  const dalleData = await dalleRes.json();
  if (!dalleRes.ok) return res.status(500).json({ error: dalleData.error?.message || 'OpenAI API error' });

  res.status(200).json({ imageUrl: dalleData.data[0].url });
}
