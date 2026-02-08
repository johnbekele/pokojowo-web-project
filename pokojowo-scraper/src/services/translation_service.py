"""Translation service using Claude for Polish to English translation."""

import logging
from typing import Optional

import anthropic

from src.config import settings
from src.models import BilingualText

logger = logging.getLogger(__name__)


class TranslationService:
    """Service for translating Polish rental listings to English using Claude."""

    TRANSLATION_SYSTEM_PROMPT = """You are a professional translator specializing in Polish real estate and rental listings. Your task is to translate Polish rental listing descriptions to natural, fluent English while preserving:

1. All factual information (size, price, amenities, location details)
2. The tone and style of the original listing
3. Polish-specific real estate terminology translated to appropriate English equivalents

Common Polish real estate terms:
- "mieszkanie" = apartment/flat
- "kawalerka" = studio apartment
- "pokój" = room
- "kaucja" = security deposit
- "czynsz" = rent/utility fees
- "opłaty" = fees/charges
- "umeblowane" = furnished
- "do wynajęcia" = for rent
- "centrum" = city center
- "blisko" = near/close to
- "komunikacja" = public transport
- "piętro" = floor
- "balkon" = balcony
- "piwnica" = basement storage
- "parking" = parking space

Output ONLY the English translation, nothing else. Do not include any explanations or notes."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.client = anthropic.Anthropic(api_key=api_key or settings.anthropic_api_key)
        self.model = model or settings.claude_model

    async def translate_to_english(self, polish_text: str) -> str:
        """Translate Polish text to English.

        Args:
            polish_text: Original Polish description

        Returns:
            English translation
        """
        if not polish_text or not polish_text.strip():
            return ""

        try:
            # Use synchronous client (anthropic doesn't have native async)
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self.TRANSLATION_SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Translate this Polish rental listing to English:\n\n{polish_text}",
                    }
                ],
            )

            english_text = response.content[0].text.strip()
            logger.debug(f"Translated {len(polish_text)} chars Polish to {len(english_text)} chars English")
            return english_text

        except anthropic.APIError as e:
            logger.error(f"Translation API error: {e}")
            # Fallback: return original text
            return polish_text

    async def create_bilingual_description(
        self, polish_text: str, english_text: Optional[str] = None
    ) -> BilingualText:
        """Create bilingual description, translating if needed.

        Args:
            polish_text: Original Polish description
            english_text: Optional pre-existing English text

        Returns:
            BilingualText with both versions
        """
        if not english_text:
            english_text = await self.translate_to_english(polish_text)

        return BilingualText(en=english_text, pl=polish_text)

    async def translate_title(self, polish_title: str) -> str:
        """Translate a listing title from Polish to English.

        Args:
            polish_title: Original Polish title

        Returns:
            English title
        """
        if not polish_title or not polish_title.strip():
            return ""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                system="You are a translator. Translate the Polish rental listing title to English. Output ONLY the translation, nothing else.",
                messages=[
                    {
                        "role": "user",
                        "content": polish_title,
                    }
                ],
            )
            return response.content[0].text.strip()

        except anthropic.APIError as e:
            logger.error(f"Title translation error: {e}")
            return polish_title
