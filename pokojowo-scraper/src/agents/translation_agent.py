"""Translation agent for Polish to English translation using Claude."""

import logging
from typing import Optional

import anthropic

from src.config import settings
from src.models import BilingualText

logger = logging.getLogger(__name__)


class TranslationAgent:
    """Agent specialized in translating Polish rental listings to English."""

    SYSTEM_PROMPT = """You are a professional translator specializing in Polish real estate and rental listings.

Your task is to translate Polish rental listing descriptions to natural, fluent English.

## Translation Guidelines:

1. **Preserve Information**: Keep all factual details (sizes, prices, amenities, locations)
2. **Natural English**: Use idiomatic English real estate terminology
3. **Keep Tone**: Match the formality/informality of the original
4. **Polish Terms**: Translate common Polish real estate terms:
   - "mieszkanie" → apartment/flat
   - "kawalerka" → studio apartment
   - "pokój" → room
   - "kaucja" → security deposit
   - "czynsz" → rent/utility fees
   - "umeblowane" → furnished
   - "piwnica" → basement storage
   - "balkon" → balcony
   - "centrum" → city center
   - "komunikacja" → public transport

5. **Don't Add**: Don't add information not in the original
6. **Abbreviations**: Expand Polish abbreviations naturally

Output ONLY the English translation, nothing else."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.client = anthropic.Anthropic(api_key=api_key or settings.anthropic_api_key)
        self.model = model or settings.claude_model

    async def translate(self, polish_text: str) -> str:
        """Translate Polish text to English.

        Args:
            polish_text: Original Polish text

        Returns:
            English translation
        """
        if not polish_text or not polish_text.strip():
            return ""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Translate this Polish rental listing to English:\n\n{polish_text}",
                    }
                ],
            )

            return response.content[0].text.strip()

        except anthropic.APIError as e:
            logger.error(f"Translation API error: {e}")
            return polish_text  # Fallback to original

    async def create_bilingual(self, polish_text: str) -> BilingualText:
        """Create bilingual text from Polish original.

        Args:
            polish_text: Original Polish description

        Returns:
            BilingualText with both versions
        """
        english_text = await self.translate(polish_text)
        return BilingualText(en=english_text, pl=polish_text)

    async def translate_title(self, polish_title: str) -> str:
        """Translate a listing title (shorter text).

        Args:
            polish_title: Original Polish title

        Returns:
            English title
        """
        if not polish_title:
            return ""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                system="Translate this Polish rental listing title to English. Output ONLY the translation.",
                messages=[{"role": "user", "content": polish_title}],
            )

            return response.content[0].text.strip()

        except anthropic.APIError as e:
            logger.error(f"Title translation error: {e}")
            return polish_title

    async def batch_translate(self, texts: list[str]) -> list[str]:
        """Translate multiple texts efficiently.

        Args:
            texts: List of Polish texts to translate

        Returns:
            List of English translations
        """
        translations = []
        for text in texts:
            translation = await self.translate(text)
            translations.append(translation)
        return translations
