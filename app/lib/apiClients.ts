import { NextResponse } from 'next/server';

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Translates text using the DeepL API.
 * Throws an error if the API key is missing or if the API call fails.
 */
export async function translateTextWithDeepL(
    text: string,
    targetLang: 'KO' | 'EN',
    sourceLang?: 'KO' | 'EN'
): Promise<string> {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
        console.error("DeepL API key is not configured in environment variables (DEEPL_API_KEY).");
        throw new Error("Server configuration error: DeepL API key missing.");
    }

    const params = new URLSearchParams({
        auth_key: apiKey,
        text: text,
        target_lang: targetLang,
    });
    if (sourceLang) {
        params.append('source_lang', sourceLang);
    }

    const response = await fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        let errorDetails = `DeepL API Error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorDetails += ` - ${errorBody.message || JSON.stringify(errorBody)}`;
        } catch (e) {
            const textError = await response.text();
            errorDetails += ` - ${textError}`;
        }
        console.error(errorDetails);
        throw new Error(errorDetails);
    }

    const data = await response.json();
    if (!data.translations || data.translations.length === 0 || !data.translations[0].text) {
        console.error('DeepL API did not return the expected translation format:', data);
        throw new Error('DeepL API did not return valid translations.');
    }
    return data.translations[0].text;
}

/**
 * Generates text using the OpenRouter API (OpenAI compatible).
 * Throws an error if the API key is missing or if the API call fails.
 */
export async function generateTextWithOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number,
    temperature: number = 0.7
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("OpenRouter API key is not configured in environment variables (OPENROUTER_API_KEY).");
        throw new Error("Server configuration error: OpenRouter API key missing.");
    }

    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    const body = {
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
    };

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let errorDetails = `OpenRouter API Error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorDetails += ` - ${errorBody.error?.message || JSON.stringify(errorBody)}`;
        } catch (e) {
            const textError = await response.text();
            errorDetails += ` - ${textError}`;
        }
        console.error(errorDetails);
        throw new Error(errorDetails);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        console.error('OpenRouter API did not return the expected choices format:', data);
        throw new Error('OpenRouter API did not return valid choices.');
    }
    return data.choices[0].message.content;
} 