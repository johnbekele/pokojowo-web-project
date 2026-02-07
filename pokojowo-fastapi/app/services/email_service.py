"""
Email service for sending transactional emails.
Uses aiosmtplib for async SMTP operations.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from pathlib import Path
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Async email service using aiosmtplib."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM or settings.SMTP_USER
        self.frontend_url = settings.FRONTEND_URL

    def _is_configured(self) -> bool:
        """Check if email settings are configured."""
        return bool(self.smtp_user and self.smtp_password)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email asynchronously.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text body (optional fallback)

        Returns:
            bool: True if email was sent successfully
        """
        if not self._is_configured():
            logger.warning("Email not configured. Skipping email send to %s", to_email)
            return False

        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.email_from
            message["To"] = to_email
            message["Subject"] = subject

            # Add plain text version (fallback)
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, "html")
            message.attach(part2)

            # Send the email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )

            logger.info("Email sent successfully to %s", to_email)
            return True

        except Exception as e:
            logger.error("Failed to send email to %s: %s", to_email, str(e))
            return False

    async def send_verification_email(self, to_email: str, token: str) -> bool:
        """
        Send email verification email.

        Args:
            to_email: User's email address
            token: Verification token

        Returns:
            bool: True if email was sent successfully
        """
        verification_url = f"{self.frontend_url}/verify-email?token={token}"

        subject = "Verify Your Pokojowo Account"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Pokojowo!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Thanks for signing up! Please verify your email address to get started finding your perfect roommate.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;">
                        Verify Email Address
                    </a>
                </div>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                    {verification_url}
                </p>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    If you didn't create an account with Pokojowo, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to Pokojowo!

        Thanks for signing up! Please verify your email address by clicking the link below:

        {verification_url}

        If you didn't create an account with Pokojowo, you can safely ignore this email.
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        """
        Send password reset email.

        Args:
            to_email: User's email address
            token: Password reset token

        Returns:
            bool: True if email was sent successfully
        """
        reset_url = f"{self.frontend_url}/reset-password?token={token}"

        subject = "Reset Your Pokojowo Password"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password. Click the button below to create a new password.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;">
                        Reset Password
                    </a>
                </div>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>

                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                        <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned.
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    This email was sent because a password reset was requested for your Pokojowo account.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Request

        We received a request to reset your password. Click the link below to create a new password:

        {reset_url}

        This link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email.
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_new_match_notification(
        self,
        to_email: str,
        user_name: str,
        match_name: str,
        match_score: int
    ) -> bool:
        """
        Send notification about a new high-quality match.

        Args:
            to_email: User's email address
            user_name: Recipient's name
            match_name: Name of the matched user
            match_score: Compatibility score (0-100)

        Returns:
            bool: True if email was sent successfully
        """
        matches_url = f"{self.frontend_url}/matches"

        subject = f"New Match on Pokojowo - {match_score}% Compatible!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Match</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">New Match Found!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi {user_name},</p>

                <p style="font-size: 16px; margin-bottom: 20px;">Great news! We found a potential roommate that matches your preferences.</p>

                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                    <p style="font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">{match_name}</p>
                    <div style="font-size: 36px; font-weight: 700; color: #667eea; margin: 10px 0;">
                        {match_score}%
                    </div>
                    <p style="color: #666; margin: 0;">Compatibility Score</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{matches_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;">
                        View Your Matches
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    You're receiving this because you have match notifications enabled.
                    <a href="{self.frontend_url}/settings" style="color: #667eea;">Manage preferences</a>
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {user_name},

        Great news! We found a potential roommate that matches your preferences.

        {match_name} - {match_score}% Compatible

        View your matches: {matches_url}
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_new_message_notification(
        self,
        to_email: str,
        user_name: str,
        sender_name: str,
        message_preview: str
    ) -> bool:
        """
        Send notification about a new message.

        Args:
            to_email: User's email address
            user_name: Recipient's name
            sender_name: Name of the message sender
            message_preview: First ~100 chars of the message

        Returns:
            bool: True if email was sent successfully
        """
        chat_url = f"{self.frontend_url}/chat"

        subject = f"New message from {sender_name} on Pokojowo"

        # Truncate message preview
        if len(message_preview) > 100:
            message_preview = message_preview[:100] + "..."

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Message</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">New Message</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi {user_name},</p>

                <p style="font-size: 16px; margin-bottom: 20px;"><strong>{sender_name}</strong> sent you a message:</p>

                <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-style: italic; color: #555;">"{message_preview}"</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{chat_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;">
                        Reply Now
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    You're receiving this because you have message notifications enabled.
                    <a href="{self.frontend_url}/settings" style="color: #667eea;">Manage preferences</a>
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {user_name},

        {sender_name} sent you a message:

        "{message_preview}"

        Reply now: {chat_url}
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_mutual_match_notification(
        self,
        to_email: str,
        user_name: str,
        match_name: str
    ) -> bool:
        """
        Send notification about a mutual match (both users liked each other).

        Args:
            to_email: User's email address
            user_name: Recipient's name
            match_name: Name of the matched user

        Returns:
            bool: True if email was sent successfully
        """
        chat_url = f"{self.frontend_url}/chat"

        subject = f"It's a Match! You and {match_name} liked each other"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>It's a Match!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <div style="font-size: 60px; margin-bottom: 10px;">&#128149;</div>
                <h1 style="color: white; margin: 0; font-size: 32px;">It's a Match!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi {user_name},</p>

                <p style="font-size: 18px; margin-bottom: 20px; text-align: center;">
                    <strong>You and {match_name} both liked each other!</strong>
                </p>

                <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
                    <p style="font-size: 16px; color: #be185d; margin: 0;">
                        Now you can start a conversation and get to know each other better!
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{chat_url}"
                       style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
                              color: white;
                              padding: 16px 40px;
                              text-decoration: none;
                              border-radius: 30px;
                              font-weight: 600;
                              font-size: 18px;
                              display: inline-block;
                              box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                        Start Chatting
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    You're receiving this because you have match notifications enabled.
                    <a href="{self.frontend_url}/settings" style="color: #ec4899;">Manage preferences</a>
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {user_name},

        It's a Match! You and {match_name} both liked each other!

        Now you can start a conversation and get to know each other better.

        Start chatting: {chat_url}
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_new_like_notification(
        self,
        to_email: str,
        user_name: str,
        liker_name: str
    ) -> bool:
        """
        Send notification when someone likes you.

        Args:
            to_email: User's email address
            user_name: Recipient's name
            liker_name: Name of the person who liked them

        Returns:
            bool: True if email was sent successfully
        """
        likes_url = f"{self.frontend_url}/likes"

        subject = f"Someone likes you on Pokojowo!"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Someone Likes You!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <div style="font-size: 50px; margin-bottom: 10px;">&#10084;&#65039;</div>
                <h1 style="color: white; margin: 0; font-size: 28px;">Someone Likes You!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi {user_name},</p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    <strong>{liker_name}</strong> just liked your profile!
                </p>

                <div style="background: #fdf2f8; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                    <p style="font-size: 15px; color: #9d174d; margin: 0;">
                        Like them back to create a match and start chatting!
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{likes_url}"
                       style="background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;">
                        See Who Likes You
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #999; text-align: center;">
                    You're receiving this because you have like notifications enabled.
                    <a href="{self.frontend_url}/settings" style="color: #ec4899;">Manage preferences</a>
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {user_name},

        {liker_name} just liked your profile!

        Like them back to create a match and start chatting.

        See who likes you: {likes_url}
        """

        return await self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
