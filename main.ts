import { config } from './config.js';

const API_KEY = 'API_KEY';

interface Message {
	text: string;
	role: 'system' | 'user' | 'assistant';
}

interface Completion {
	Content: string | null;
	TokenUsage: number | undefined;
}

interface ConnectorResponse {
	Completions: Completion[];
	ModelType: string;
}

interface Response {
	id: string;
	outputs: {
		text: string;
		role: string;
	}[];
}

const mapToResponse = (apiResponses: Response[]): ConnectorResponse => {
	const Completions = apiResponses.flatMap(response =>
		response.outputs.map(output => ({
			Content: output.text,
			TokenUsage: undefined, 
		}))
	);

	const ModelType = 'j2-ultra';

	return { Completions, ModelType };
};

async function main(
	model: string,
	prompts: string[],
	properties: Record<string, unknown>,
	settings: Record<string, unknown>,
): Promise<ConnectorResponse> {
	const apiKey = settings?.[API_KEY] as string;

	const { prompt, ...restProperties } = properties;
	const systemPrompt = (prompt ||
		config.properties.find((prop) => prop.id === 'prompt')?.value) as string;

	const messageHistory: Message[] = [];
	const apiResponses: Response[] = [];

	try {
		for (const prompt of prompts) {
			messageHistory.push({ role: 'user', text: prompt });

			const response = await fetch(
				'https://api.ai21.com/studio/v1/j2-ultra/chat',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						messages: messageHistory,
						'system': systemPrompt,
						...restProperties,
					}),
				},
			);

			const data: Response = await response.json();

			data.outputs.forEach(output => {
				if (output.role === 'assistant') {
					messageHistory.push({ role: 'assistant', text: output.text });
				}
			});

			apiResponses.push(data);
		}

		return mapToResponse(apiResponses);
	} catch (error) {
		console.error('Error in main function:', error);
		throw error;
	}
}

export { main, config };
