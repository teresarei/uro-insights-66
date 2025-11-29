import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${images.length} image(s) for diary parsing`);

    // Prepare the content array with images
    const imageContents = images.map((imageData: string) => ({
      type: "image_url",
      image_url: {
        url: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`
      }
    }));

    const systemPrompt = `You are a medical data extraction assistant specialized in parsing handwritten bladder/urine diaries. Your task is to extract structured data from handwritten diary images.

EXTRACTION RULES:
1. Extract ALL entries you can identify from the image(s)
2. For each void event, extract: time, volume (in ml), urgency level (1-5 if noted), and any notes
3. For each fluid intake, extract: time, volume (in ml), type of fluid (water, coffee, tea, juice, alcohol, other)
4. For each leakage event, extract: time, amount (small/medium/large), trigger if noted, and any notes
5. Convert all times to 24-hour format (HH:MM)
6. Convert volumes to ml (1 oz ≈ 30ml, 1 cup ≈ 240ml)
7. If handwriting is unclear, set confidence to "low" and include your best interpretation

OUTPUT FORMAT (JSON):
{
  "voids": [
    { "time": "HH:MM", "volume": number, "urgency": number|null, "notes": string|null, "confidence": "high"|"medium"|"low" }
  ],
  "intakes": [
    { "time": "HH:MM", "volume": number, "type": string|null, "notes": string|null, "confidence": "high"|"medium"|"low" }
  ],
  "leakages": [
    { "time": "HH:MM", "amount": "small"|"medium"|"large", "trigger": string|null, "notes": string|null, "confidence": "high"|"medium"|"low" }
  ],
  "rawText": "transcribed text from the diary",
  "parsingNotes": "any issues or uncertainties encountered during parsing",
  "overallConfidence": "high"|"medium"|"low"
}

Be thorough but honest about uncertainty. Always output valid JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Please extract all diary entries from this handwritten bladder diary image(s). Parse all voids, fluid intakes, and leakage events into structured data. Return ONLY valid JSON.' },
              ...imageContents
            ]
          }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing JSON...');

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    
    // Try to match complete markdown block first
    let jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Handle truncated response - extract JSON after opening ```json
      const startMatch = content.match(/```(?:json)?\s*([\s\S]*)/);
      if (startMatch) {
        jsonStr = startMatch[1].trim();
        // Try to find valid JSON by looking for the last complete structure
        // Remove any trailing incomplete content
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace !== -1) {
          jsonStr = jsonStr.substring(0, lastBrace + 1);
        }
      }
    }
    
    console.log('Extracted JSON string length:', jsonStr.length);

    try {
      const parsedData = JSON.parse(jsonStr);
      console.log('Successfully parsed diary data:', {
        voids: parsedData.voids?.length || 0,
        intakes: parsedData.intakes?.length || 0,
        leakages: parsedData.leakages?.length || 0,
        confidence: parsedData.overallConfidence
      });
      
      return new Response(
        JSON.stringify({ success: true, data: parsedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', content);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse diary data',
          rawResponse: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in parse-diary-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
