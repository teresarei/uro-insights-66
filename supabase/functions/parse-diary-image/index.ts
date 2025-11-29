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

    const systemPrompt = `You are a medical data extraction assistant specialized in parsing bladder/urine diaries from images of handwritten or printed tables.

CRITICAL: You must process EACH ROW INDEPENDENTLY. Do NOT reuse values from one row for another row.

EXPECTED TABLE COLUMNS (may vary):
- Date (extract the specific date for EACH row)
- Time
- Drink/Intake (ml)
- Voided Urine (ml)
- Leakage Event (Yes/No or checkbox)
- Urgency (1-5 scale)
- Dry pad weight (g) - weight of pad before use
- Wet pad weight (g) - weight of pad after leakage
- Activity during leakage / Trigger
- Comments / Notes

EXTRACTION RULES - PROCESS EACH ROW INDEPENDENTLY:

1. DATE EXTRACTION (PER ROW):
   - Read the Date column value for EACH row separately
   - Do NOT copy the date from the first row to all other rows
   - If a row has no date but is on the same page as dated rows, use the closest previous date
   - Format: YYYY-MM-DD

2. TIME EXTRACTION (PER ROW):
   - Extract the time from each row's Time column
   - Convert to 24-hour format (HH:MM)

3. PAD WEIGHT CALCULATION (PER ROW):
   - For EACH row, read the Dry pad weight (g) if present
   - For EACH row, read the Wet pad weight (g) if present
   - Each row's pad weights are independent - do NOT reuse weights across rows
   - If both dry and wet weights exist for a row, the net leakage = wet - dry
   - If either weight is missing for a row, set both to null for that row

4. EVENT TYPE DETECTION (PER ROW):
   - A row can generate MULTIPLE events if multiple columns have values
   - If "Voided Urine" has a value → create a void event
   - If "Drink/Intake" has a value → create an intake event  
   - If "Leakage Event" is Yes/checked OR wet/dry pad weights exist → create a leakage event
   - Each event from the same row shares that row's date and time

5. VOLUME CONVERSION:
   - Convert all volumes to ml (1 oz ≈ 30ml, 1 cup ≈ 240ml)

6. CONFIDENCE SCORING:
   - "high" = clearly readable, unambiguous values
   - "medium" = somewhat unclear but reasonable interpretation
   - "low" = uncertain, handwriting illegible, or guessing

OUTPUT FORMAT (JSON):
{
  "voids": [
    { 
      "date": "YYYY-MM-DD",
      "time": "HH:MM", 
      "volume": number, 
      "urgency": number|null, 
      "notes": string|null, 
      "confidence": "high"|"medium"|"low" 
    }
  ],
  "intakes": [
    { 
      "date": "YYYY-MM-DD",
      "time": "HH:MM", 
      "volume": number, 
      "type": string|null, 
      "notes": string|null, 
      "confidence": "high"|"medium"|"low" 
    }
  ],
  "leakages": [
    { 
      "date": "YYYY-MM-DD",
      "time": "HH:MM", 
      "amount": "small"|"medium"|"large"|null,
      "dry_pad_weight_g": number|null,
      "wet_pad_weight_g": number|null,
      "trigger": string|null, 
      "notes": string|null, 
      "confidence": "high"|"medium"|"low" 
    }
  ],
  "rawText": "transcribed text from the diary showing row-by-row data",
  "parsingNotes": "any issues encountered, rows skipped, or uncertainties",
  "overallConfidence": "high"|"medium"|"low",
  "debugInfo": [
    {
      "rowNumber": number,
      "extractedDate": "YYYY-MM-DD",
      "extractedTime": "HH:MM",
      "dryPadWeight": number|null,
      "wetPadWeight": number|null,
      "computedNetLeakage": number|null,
      "eventsCreated": ["void"|"intake"|"leakage"]
    }
  ]
}

IMPORTANT REMINDERS:
- Process ROW BY ROW - each row is independent
- Each row's date, time, and pad weights belong ONLY to that row
- Do not carry forward or reuse values between rows
- Include debugInfo to help verify correct parsing
- Always output valid JSON`;

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
              { type: 'text', text: 'Please extract all diary entries from this bladder diary image(s). Process EACH ROW INDEPENDENTLY - extract the date, time, and pad weights separately for each row. Do NOT reuse values across rows. Include the debugInfo array showing what was extracted from each row. Return ONLY valid JSON.' },
              ...imageContents
            ]
          }
        ],
        max_tokens: 16384,
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
      
      // Log debug info if present
      if (parsedData.debugInfo && Array.isArray(parsedData.debugInfo)) {
        console.log('=== ROW-BY-ROW DEBUG INFO ===');
        parsedData.debugInfo.forEach((row: any) => {
          console.log(`Row ${row.rowNumber}: Date=${row.extractedDate}, Time=${row.extractedTime}, DryPad=${row.dryPadWeight}, WetPad=${row.wetPadWeight}, NetLeakage=${row.computedNetLeakage}, Events=${JSON.stringify(row.eventsCreated)}`);
        });
        console.log('=== END DEBUG INFO ===');
      }
      
      // Log individual entries for verification
      console.log('=== PARSED ENTRIES SUMMARY ===');
      console.log('Voids:');
      parsedData.voids?.forEach((v: any, i: number) => {
        console.log(`  [${i}] Date: ${v.date}, Time: ${v.time}, Volume: ${v.volume}ml, Urgency: ${v.urgency}`);
      });
      console.log('Intakes:');
      parsedData.intakes?.forEach((i: any, idx: number) => {
        console.log(`  [${idx}] Date: ${i.date}, Time: ${i.time}, Volume: ${i.volume}ml, Type: ${i.type}`);
      });
      console.log('Leakages:');
      parsedData.leakages?.forEach((l: any, i: number) => {
        const netWeight = (l.dry_pad_weight_g && l.wet_pad_weight_g) 
          ? (l.wet_pad_weight_g - l.dry_pad_weight_g) 
          : null;
        console.log(`  [${i}] Date: ${l.date}, Time: ${l.time}, DryPad: ${l.dry_pad_weight_g}g, WetPad: ${l.wet_pad_weight_g}g, NetLeakage: ${netWeight}g, Amount: ${l.amount}`);
      });
      console.log('=== END PARSED ENTRIES ===');
      
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
