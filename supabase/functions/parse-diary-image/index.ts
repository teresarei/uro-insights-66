import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to repair truncated JSON
function repairTruncatedJson(jsonStr: string): string {
  let repaired = jsonStr.trim();
  
  // Count open/close brackets and braces
  let openBraces = (repaired.match(/{/g) || []).length;
  let closeBraces = (repaired.match(/}/g) || []).length;
  let openBrackets = (repaired.match(/\[/g) || []).length;
  let closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Remove any trailing incomplete property (like `"t` or `"date": "2025`)
  // Find the last complete value
  const lastCompletePattern = /,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/;
  if (lastCompletePattern.test(repaired)) {
    repaired = repaired.replace(lastCompletePattern, '');
  }
  
  // Also handle truncation mid-string or mid-number
  if (repaired.endsWith('"')) {
    // String was complete, good
  } else if (/"\s*:\s*"[^"]*$/.test(repaired)) {
    // Truncated mid-string value, remove the incomplete property
    repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, '');
  } else if (/"\s*:\s*\d+$/.test(repaired)) {
    // Number value at end, likely complete, keep it
  } else if (/"\s*:\s*$/.test(repaired)) {
    // Truncated right after colon
    repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
  }
  
  // Recalculate after cleanup
  openBraces = (repaired.match(/{/g) || []).length;
  closeBraces = (repaired.match(/}/g) || []).length;
  openBrackets = (repaired.match(/\[/g) || []).length;
  closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Add missing closing brackets and braces
  while (closeBrackets < openBrackets) {
    repaired += ']';
    closeBrackets++;
  }
  while (closeBraces < openBraces) {
    repaired += '}';
    closeBraces++;
  }
  
  return repaired;
}

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

    // Bilingual system prompt with Swedish support
    const systemPrompt = `Extract bladder diary data from images. Support BOTH English and Swedish text. Process EACH ROW INDEPENDENTLY.

LANGUAGE DETECTION:
- Automatically detect if text is in English or Swedish
- Parse Swedish column names and terms using the mapping below
- If mixed languages appear, process per-row based on context

SWEDISH TO ENGLISH FIELD MAPPINGS:
| Swedish Term | Interpret As |
|--------------|--------------|
| Klockslag, Tid | Time |
| Mängd | Volume |
| Dryck, Intag | Intake / Drink |
| Urinmängd, Urin | Voided volume |
| Läckage | Leakage |
| Dagbok | Diary page |
| Natt | Night |
| Dag | Day |
| Torr vikt, Torrvikt | Dry pad weight |
| Blöt vikt, Våtvikt | Wet pad weight |
| Kommentar, Anteckning | Comment / Notes |
| Trängning, Urgency | Urgency |
| Datum | Date |
| Volym | Volume |
| Typ | Type |
| ml, milliliter | ml |
| gram, g | grams |
| Liten | small (leakage) |
| Medel | medium (leakage) |
| Stor | large (leakage) |
| Vatten | Water |
| Kaffe | Coffee |
| Te | Tea |
| Mjölk | Milk |
| Juice | Juice |
| Aktivitet | Activity |

COLUMNS (English/Swedish): Date/Datum, Time/Klockslag, Drink/Dryck(ml), Voided/Urin(ml), Leakage/Läckage, Urgency/Trängning(1-5), Dry pad/Torr vikt(g), Wet pad/Blöt vikt(g), Activity/Aktivitet, Notes/Kommentar

RULES:
- Each row's date/time/weights are independent - never reuse across rows
- Dates: YYYY-MM-DD format
- Times: HH:MM (24-hour)
- Convert volumes to ml (numeric values only)
- If both dry & wet pad weights exist: net = wet - dry
- For Swedish intake types, translate to English equivalents
- IMPORTANT: For leakage "amount" field, ONLY use these exact values: "small", "medium", "large", or null
  - If checkbox marked, yes, ja, x, or similar = "small"
  - Liten = "small", Medel = "medium", Stor = "large"
  - Never use "yes", "true", or other values

OUTPUT (JSON only, no markdown):
{"voids":[{"date":"YYYY-MM-DD","time":"HH:MM","volume":123,"urgency":null,"notes":null,"confidence":"high"}],"intakes":[{"date":"YYYY-MM-DD","time":"HH:MM","volume":123,"type":null,"notes":null,"confidence":"high"}],"leakages":[{"date":"YYYY-MM-DD","time":"HH:MM","amount":"small","dry_pad_weight_g":null,"wet_pad_weight_g":null,"trigger":null,"notes":null,"confidence":"high"}],"overallConfidence":"high","detectedLanguage":"en|sv"}

CONFIDENCE LEVELS:
- "high": Clear text, confident parsing
- "medium": Some ambiguity but likely correct
- "low": Swedish terms not fully recognized or handwriting unclear

IMPORTANT: Output ONLY the JSON object. No explanation text. Keep it compact.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Extract all diary entries from these images. Support both English and Swedish text. Output ONLY valid JSON, no markdown code blocks, no explanation. Be compact.' },
              ...imageContents
            ]
          }
        ],
        max_tokens: 32768,
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
          JSON.stringify({ error: 'AI service credits exhausted. Please add credits in Settings → Workspace → Usage.' }),
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
    
    console.log('AI response received, content length:', content.length);

    // Extract JSON from the response
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      // Try to match complete markdown block first
      const completeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (completeMatch) {
        jsonStr = completeMatch[1].trim();
      } else {
        // Truncated - extract content after opening fence
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').trim();
      }
    }
    
    // Try to parse as-is first
    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
      console.log('JSON parsed successfully on first try');
    } catch (firstError) {
      console.log('First parse failed, attempting repair...');
      console.log('Original error:', firstError);
      
      // Try to repair truncated JSON
      const repairedJson = repairTruncatedJson(jsonStr);
      console.log('Repaired JSON length:', repairedJson.length);
      
      try {
        parsedData = JSON.parse(repairedJson);
        console.log('JSON parsed successfully after repair');
      } catch (repairError) {
        console.error('Failed to parse even after repair:', repairError);
        console.log('Raw response (first 2000 chars):', content.substring(0, 2000));
        console.log('Raw response (last 500 chars):', content.substring(content.length - 500));
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse diary data - response may have been truncated',
            hint: 'Try uploading fewer images at once'
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Ensure arrays exist
    parsedData.voids = parsedData.voids || [];
    parsedData.intakes = parsedData.intakes || [];
    parsedData.leakages = parsedData.leakages || [];
    
    // Log summary with language detection info
    const detectedLang = parsedData.detectedLanguage || 'unknown';
    console.log('=== PARSED ENTRIES SUMMARY ===');
    console.log(`Detected Language: ${detectedLang}`);
    console.log(`Voids: ${parsedData.voids.length}`);
    parsedData.voids.forEach((v: any, i: number) => {
      console.log(`  [${i}] Date: ${v.date}, Time: ${v.time}, Volume: ${v.volume}ml, Confidence: ${v.confidence || 'unspecified'}`);
    });
    console.log(`Intakes: ${parsedData.intakes.length}`);
    parsedData.intakes.forEach((item: any, idx: number) => {
      console.log(`  [${idx}] Date: ${item.date}, Time: ${item.time}, Volume: ${item.volume}ml, Type: ${item.type || 'none'}, Confidence: ${item.confidence || 'unspecified'}`);
    });
    console.log(`Leakages: ${parsedData.leakages.length}`);
    parsedData.leakages.forEach((l: any, i: number) => {
      const netWeight = (l.dry_pad_weight_g != null && l.wet_pad_weight_g != null) 
        ? (l.wet_pad_weight_g - l.dry_pad_weight_g) 
        : null;
      console.log(`  [${i}] Date: ${l.date}, Time: ${l.time}, Dry: ${l.dry_pad_weight_g}g, Wet: ${l.wet_pad_weight_g}g, Net: ${netWeight}g, Confidence: ${l.confidence || 'unspecified'}`);
    });
    console.log('=== END SUMMARY ===');

    // Check for low confidence entries and add warning
    const hasLowConfidence = [
      ...parsedData.voids,
      ...parsedData.intakes,
      ...parsedData.leakages
    ].some((entry: any) => entry.confidence === 'low');

    if (hasLowConfidence || parsedData.overallConfidence === 'low') {
      parsedData.warning = detectedLang === 'sv' 
        ? 'Some Swedish terms could not be recognized with high confidence. Please review the parsed fields.'
        : 'Some terms could not be recognized with high confidence. Please review the parsed fields.';
    }
    
    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in parse-diary-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
