import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface InterpretationRequest {
  text: string;
  reference: string;
  type: 'verse' | 'passage' | 'story';
}

export async function generateInterpretation(request: InterpretationRequest): Promise<string> {
  try {
    const prompt = createPrompt(request);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a thoughtful biblical scholar and theologian who provides insightful, accessible interpretations of scripture. Your responses should be encouraging, practical, and help readers understand both the historical context and modern application of biblical texts. Keep responses to 2-3 sentences that are meaningful and inspiring."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || "Scripture speaks to us across time, offering wisdom and guidance for our daily lives.";
  } catch (error) {
    console.error('Error generating AI interpretation:', error);
    return getFallbackInterpretation(request);
  }
}

function createPrompt(request: InterpretationRequest): string {
  const { text, reference, type } = request;
  
  switch (type) {
    case 'verse':
      return `Please provide a brief, inspiring interpretation of this Bible verse: "${text}" (${reference}). Focus on its practical application for modern readers.`;
    
    case 'passage':
      return `Please provide a thoughtful interpretation of this Bible passage from ${reference}: "${text}". Explain its key message and relevance for today.`;
    
    case 'story':
      return `Please provide an insightful interpretation of this Bible story from ${reference}: "${text}". Highlight the main lessons and their application to modern life.`;
    
    default:
      return `Please provide a meaningful interpretation of this scripture from ${reference}: "${text}".`;
  }
}

function getFallbackInterpretation(request: InterpretationRequest): string {
  const fallbacks = [
    "This scripture reminds us of God's enduring love and faithfulness throughout all generations.",
    "These words offer comfort and guidance, showing us how to live with purpose and hope.",
    "This passage reveals God's character and His desire for relationship with His people.",
    "Scripture like this teaches us about faith, love, and the importance of trusting in God's plan.",
    "These verses encourage us to seek wisdom and understanding in our daily walk with God."
  ];
  
  const index = request.text.length % fallbacks.length;
  return fallbacks[index];
}