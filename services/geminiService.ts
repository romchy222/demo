
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL_NAME = 'gemini-3-flash-preview';

type Lang = 'ru' | 'en' | 'kk';

function getUiLang(): Lang {
  try {
    const raw = localStorage.getItem('bolashak_lang');
    if (raw === 'ru' || raw === 'en' || raw === 'kk') return raw;
  } catch {
    // ignore
  }
  return 'ru';
}

function getGeminiApiKey(): string {
  // Client-side (Vite) env vars must be prefixed with VITE_.
  // Support both VITE_GEMINI_API_KEY and the older VITE_API_KEY.
  const viteEnv: any = (import.meta as any)?.env;
  const fromVite = (viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.VITE_API_KEY || '') as string;
  if (fromVite) return fromVite;

  // Server-side (Node / Vercel functions)
  if (typeof process !== 'undefined') {
    return (process.env?.GEMINI_API_KEY || process.env?.API_KEY || '') as string;
  }

  return '';
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

export async function getAgentResponse(
  agentInstruction: string, 
  history: { role: 'user' | 'model', content: string }[], 
  userMessage: string,
  imageBase64?: string
) {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    
    // Формируем историю чата
    const contents: any[] = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));

    // Добавляем текущее сообщение пользователя
    const currentParts: any[] = [{ text: userMessage }];

    // Если есть изображение, добавляем его в текущий запрос
    if (imageBase64) {
      // Убираем префикс data:image/png;base64, если он есть
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      currentParts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: agentInstruction,
        temperature: 0.6,
        topP: 0.95,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const lang = getUiLang();
    if (error.message?.includes("API_KEY")) {
      if (lang === 'en') return "Security: API key is missing. Please contact an administrator.";
      if (lang === 'kk') return "Қауіпсіздік: API кілті жоқ. Әкімшіге хабарласыңыз.";
      return "Система безопасности: Отсутствует ключ API. Обратитесь к администратору.";
    }
    if (lang === 'en') return "Connection error. Please try again.";
    if (lang === 'kk') return "Байланыс қатесі. Қайталап көріңіз.";
    return "Произошла ошибка связи с нейросетью. Попробуйте повторить запрос.";
  }
}
