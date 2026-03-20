from openai import OpenAI

SYSTEM_PROMPT = """You are NyaySetu AI, a legal assistant helping inter-state migrant workers in India understand and enforce their rights.

Your role:
- Help workers understand the Inter-State Migrant Workmen Act 1979 (ISMWA), Minimum Wages Act 1948, BOCW Act 1996, and Bonded Labour Act 1976
- Ask clarifying questions to gather: worker's home state, work state, employer/contractor name, type of work, wages owed, duration of employment
- Identify which law sections apply to their situation
- Guide them on filing complaints with the correct Labour Commissioner (work state, NOT home state)
- Be empathetic, clear, and use simple language — many users have low literacy
- Respond in the same language the user writes in (Hindi or English)
- When you have enough information, summarise the case and tell them what complaint can be filed

Keep responses concise (2-4 sentences max). Ask one question at a time. Do not give generic disclaimers every message."""


class ChatService:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    def reply(self, history: list[dict], user_message: str) -> str:
        """
        history: list of {"role": "user"|"assistant"|"model", "content": "..."}
        Returns the assistant's reply as a string.
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for msg in history:
            role = msg.get("role", "user")
            # Normalise Gemini "model" role to OpenAI "assistant"
            if role == "model":
                role = "assistant"
            content = msg.get("content") or (
                msg["parts"][0]["text"] if msg.get("parts") else ""
            )
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=512,
        )
        return response.choices[0].message.content.strip()
