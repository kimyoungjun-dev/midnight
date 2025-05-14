import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: Store API keys securely, e.g., in environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || "";
const MODEL = "qwen/qwen3-0.6b-04-28:free"; // 또는 다른 적절한 모델

async function translateText(text: string, sourceLang: 'KO' | 'EN', targetLang: 'EN' | 'KO'): Promise<string> {
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            auth_key: DEEPL_API_KEY,
            text: text,
            source_lang: sourceLang,
            target_lang: targetLang,
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`DeepL API error (${response.status}): ${errorBody}`);
        throw new Error(`DeepL API error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }
    const data = await response.json();
    if (!data.translations || data.translations.length === 0) {
        console.error('DeepL API did not return translations:', data);
        throw new Error('DeepL API did not return translations.');
    }
    return data.translations[0].text;
}

async function generateFairyTaleFromOpenRouter(promptEn: string): Promise<string> {
    const systemPrompt = "Write a short fairy tale in one sentence in the style of a warm picture book.";
    const headers = {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
    };
    const data = {
        model: MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `The theme of the story is: ${promptEn}` }
        ],
        temperature: 0.7,
        max_tokens: 512 // 모델에 따라 적절히 조절
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenRouter API error (${response.status}): ${errorBody}`);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }
    const responseData = await response.json();
    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message || !responseData.choices[0].message.content) {
        console.error('OpenRouter API did not return expected content:', responseData);
        throw new Error('OpenRouter API did not return expected content.');
    }
    return responseData.choices[0].message.content;
}

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 });
        }

        // 1. 한국어 프롬프트를 영어로 번역
        const promptEn = await translateText(prompt, 'KO', 'EN');

        // 2. 영어 프롬프트로 동화 생성
        const englishStory = await generateFairyTaleFromOpenRouter(promptEn);

        // 3. 생성된 영어 동화를 한국어로 번역
        const koreanStory = await translateText(englishStory, 'EN', 'KO');

        return NextResponse.json({ story: koreanStory });

    } catch (error: any) {
        console.error("Error in API route:", error);
        // error.message를 포함시켜 클라이언트에서 구체적인 오류 원인을 파악하도록 도움
        return NextResponse.json({ error: `Failed to generate story: ${error.message}` }, { status: 500 });
    }
} 