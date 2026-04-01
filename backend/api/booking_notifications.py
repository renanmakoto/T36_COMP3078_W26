from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from html import escape
from urllib.parse import quote

import resend
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from resend.exceptions import ResendError

from .models import (
    Appointment,
    AppointmentEmailNotification,
    AppointmentNotificationEvent,
    AppointmentNotificationRecipient,
    AppointmentNotificationStatus,
)

logger = logging.getLogger(__name__)
BOOKING_EMAIL_TOKEN_SALT = "booking-email-action"
BOOKING_EMAIL_TOKEN_MAX_AGE = 60 * 60 * 24 * 45


@dataclass(frozen=True)
class EmailMessage:
    recipient_type: str
    recipient_email: str
    subject: str
    html: str
    text: str
    idempotency_key: str
    payload: dict


def booking_emails_enabled() -> bool:
    return bool(
        settings.BOOKING_EMAILS_ENABLED
        and settings.RESEND_API_KEY
        and settings.RESEND_FROM_EMAIL
        and settings.RESEND_OWNER_EMAIL
    )


def queue_booking_notifications(
    appointment: Appointment,
    event_type: str,
    *,
    previous_start: datetime | None = None,
):
    if not booking_emails_enabled():
        return

    appointment_id = str(appointment.id)
    previous_start_iso = previous_start.isoformat() if previous_start else ""

    def _send_after_commit():
        try:
            send_booking_notifications(
                appointment_id,
                event_type,
                previous_start_iso=previous_start_iso or None,
            )
        except Exception:
            logger.exception(
                "Failed to send booking notifications",
                extra={"appointment_id": appointment_id, "event_type": event_type},
            )

    transaction.on_commit(_send_after_commit)


def send_booking_notifications(
    appointment_id: str,
    event_type: str,
    *,
    previous_start_iso: str | None = None,
):
    if not booking_emails_enabled():
        return

    appointment = (
        Appointment.objects.select_related("user", "service")
        .prefetch_related("add_ons")
        .get(id=appointment_id)
    )
    previous_start = (
        datetime.fromisoformat(previous_start_iso)
        if previous_start_iso
        else None
    )

    for message in _build_messages(appointment, event_type, previous_start=previous_start):
        notification, created = AppointmentEmailNotification.objects.get_or_create(
            idempotency_key=message.idempotency_key,
            defaults={
                "appointment": appointment,
                "event_type": event_type,
                "recipient_type": message.recipient_type,
                "recipient_email": message.recipient_email,
                "subject": message.subject,
                "payload": message.payload,
            },
        )
        if not created and notification.status in {
            AppointmentNotificationStatus.SENT,
            AppointmentNotificationStatus.DELIVERED,
        }:
            continue

        if not created:
            notification.subject = message.subject
            notification.payload = message.payload
            notification.error_message = ""
            notification.save(update_fields=["subject", "payload", "error_message", "updated_at"])

        try:
            resend.api_key = settings.RESEND_API_KEY
            response = resend.Emails.send(
                {
                    "from": f"{settings.BUSINESS_NAME} <{settings.RESEND_FROM_EMAIL}>",
                    "to": [message.recipient_email],
                    "subject": message.subject,
                    "html": message.html,
                    "text": message.text,
                    "reply_to": settings.BOOKING_REPLY_TO or settings.RESEND_OWNER_EMAIL,
                    "tags": [
                        {"name": "booking_id", "value": str(appointment.id)},
                        {"name": "event_type", "value": _tag_value(event_type)},
                        {"name": "recipient", "value": _tag_value(message.recipient_type)},
                    ],
                },
                {"idempotency_key": message.idempotency_key},
            )
            notification.provider_message_id = response.get("id")
            notification.status = AppointmentNotificationStatus.SENT
            notification.sent_at = timezone.now()
            notification.error_message = ""
            notification.save(
                update_fields=[
                    "provider_message_id",
                    "status",
                    "sent_at",
                    "error_message",
                    "updated_at",
                ]
            )
        except ResendError as exc:
            notification.status = AppointmentNotificationStatus.FAILED
            notification.error_message = str(exc)
            notification.save(update_fields=["status", "error_message", "updated_at"])
            logger.warning(
                "Resend notification failed",
                extra={
                    "appointment_id": appointment_id,
                    "event_type": event_type,
                    "recipient": message.recipient_email,
                    "error": str(exc),
                },
            )


def handle_resend_webhook(event: dict):
    event_type = event.get("type", "")
    data = event.get("data") or {}
    message_id = (
        data.get("email_id")
        or data.get("id")
        or event.get("email_id")
        or event.get("id")
    )
    if not message_id:
        return

    notification = AppointmentEmailNotification.objects.filter(provider_message_id=message_id).first()
    if not notification:
        return

    status_value = {
        "email.sent": AppointmentNotificationStatus.SENT,
        "email.delivered": AppointmentNotificationStatus.DELIVERED,
        "email.delivery_delayed": AppointmentNotificationStatus.SENT,
        "email.bounced": AppointmentNotificationStatus.BOUNCED,
        "email.complained": AppointmentNotificationStatus.COMPLAINED,
        "email.failed": AppointmentNotificationStatus.FAILED,
    }.get(event_type, notification.status)

    now = timezone.now()
    update_fields = ["status", "last_event_payload", "last_event_at", "updated_at"]
    notification.status = status_value
    notification.last_event_payload = event
    notification.last_event_at = now

    if status_value == AppointmentNotificationStatus.DELIVERED:
        notification.delivered_at = now
        update_fields.append("delivered_at")
    if status_value == AppointmentNotificationStatus.FAILED:
        notification.error_message = data.get("message", notification.error_message)
        update_fields.append("error_message")

    notification.save(update_fields=update_fields)


def _build_messages(
    appointment: Appointment,
    event_type: str,
    *,
    previous_start: datetime | None = None,
) -> list[EmailMessage]:
    if event_type == AppointmentNotificationEvent.NO_SHOW:
        return [_build_client_no_show_message(appointment)]

    client_message = _build_client_message(appointment, event_type, previous_start=previous_start)
    owner_message = _build_owner_message(appointment, event_type, previous_start=previous_start)
    return [client_message, owner_message]


def _build_client_message(
    appointment: Appointment,
    event_type: str,
    *,
    previous_start: datetime | None = None,
) -> EmailMessage:
    appointment_when = _format_when(appointment.start_time)
    previous_when = _format_when(previous_start) if previous_start else ""
    service_names = _service_summary(appointment)
    client_name = appointment.user.display_name or appointment.user.email.split("@")[0]
    urls = _management_urls(appointment, owner=False)

    if event_type == AppointmentNotificationEvent.CREATED:
        intro = (
            f"Hi {client_name}, your appointment has been confirmed."
            if appointment.status == "CONFIRMED"
            else f"Hi {client_name}, your appointment request has been received."
        )
        title = "Your booking is confirmed" if appointment.status == "CONFIRMED" else "Your booking request was received"
        note = "You can manage your appointment from the links below."
    elif event_type == AppointmentNotificationEvent.RESCHEDULED:
        intro = f"Hi {client_name}, your appointment was rescheduled."
        title = "Your booking was rescheduled"
        note = f"Previous time: {previous_when}" if previous_when else ""
    elif event_type == AppointmentNotificationEvent.CANCELLED:
        intro = f"Hi {client_name}, your appointment was cancelled."
        title = "Your booking was cancelled"
        note = "If you still need a slot, you can book again from your dashboard."
    else:
        intro = f"Hi {client_name}, your appointment was updated."
        title = "Your booking was updated"
        note = ""

    details = [
        ("When", appointment_when),
        ("Where", settings.BUSINESS_ADDRESS),
        ("Service", service_names),
        ("Booking ID", str(appointment.id)),
    ]
    if settings.BUSINESS_PHONE:
        details.append(("Phone", settings.BUSINESS_PHONE))
    if note:
        details.append(("Note", note))

    subject = title
    html = _render_email_html(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("View appointment", urls["view"]),
            ("Reschedule appointment", urls["reschedule"]),
            ("Cancel appointment", urls["cancel"]),
        ],
    )
    text = _render_email_text(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("View appointment", urls["view"]),
            ("Reschedule appointment", urls["reschedule"]),
            ("Cancel appointment", urls["cancel"]),
        ],
    )
    return EmailMessage(
        recipient_type=AppointmentNotificationRecipient.CLIENT,
        recipient_email=appointment.user.email,
        subject=subject,
        html=html,
        text=text,
        idempotency_key=f"{event_type.lower()}-{appointment.id}-client",
        payload={
            "booking_id": str(appointment.id),
            "event_type": event_type,
            "recipient": AppointmentNotificationRecipient.CLIENT,
            "when": appointment_when,
        },
    )


def _build_owner_message(
    appointment: Appointment,
    event_type: str,
    *,
    previous_start: datetime | None = None,
) -> EmailMessage:
    appointment_when = _format_when(appointment.start_time)
    previous_when = _format_when(previous_start) if previous_start else ""
    service_names = _service_summary(appointment)
    client_name = appointment.user.display_name or appointment.user.email.split("@")[0]
    urls = _management_urls(appointment, owner=True)

    if event_type == AppointmentNotificationEvent.CREATED:
        title = "New booking received"
        intro = "A new appointment was created in the booking system."
    elif event_type == AppointmentNotificationEvent.RESCHEDULED:
        title = "Booking rescheduled"
        intro = "An existing booking was rescheduled."
    elif event_type == AppointmentNotificationEvent.CANCELLED:
        title = "Booking cancelled"
        intro = "A booking was cancelled."
    else:
        title = "Booking updated"
        intro = "A booking was updated."

    details = [
        ("Client", client_name),
        ("Email", appointment.user.email),
        ("When", appointment_when),
        ("Service", service_names),
        ("Booking ID", str(appointment.id)),
        ("Status", appointment.status.replace("_", " ").title()),
    ]
    if previous_when:
        details.append(("Previous time", previous_when))

    subject = f"{title}: {client_name}"
    html = _render_email_html(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("Open booking", urls["manage"]),
            ("Open schedule", urls["reschedule"]),
        ],
    )
    text = _render_email_text(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("Open booking", urls["manage"]),
            ("Open schedule", urls["reschedule"]),
        ],
    )
    return EmailMessage(
        recipient_type=AppointmentNotificationRecipient.OWNER,
        recipient_email=settings.RESEND_OWNER_EMAIL,
        subject=subject,
        html=html,
        text=text,
        idempotency_key=f"{event_type.lower()}-{appointment.id}-owner",
        payload={
            "booking_id": str(appointment.id),
            "event_type": event_type,
            "recipient": AppointmentNotificationRecipient.OWNER,
            "when": appointment_when,
        },
    )


def _build_client_no_show_message(appointment: Appointment) -> EmailMessage:
    appointment_when = _format_when(appointment.start_time)
    client_name = appointment.user.display_name or appointment.user.email.split("@")[0]
    urls = _management_urls(appointment, owner=False)
    title = "Missed appointment notice"
    intro = f"Hi {client_name}, our records show your appointment was marked as no-show."
    details = [
        ("When", appointment_when),
        ("Service", _service_summary(appointment)),
        ("Booking ID", str(appointment.id)),
        ("Policy", "Please cancel or reschedule at least 2 hours in advance."),
    ]
    html = _render_email_html(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("View appointment", urls["view"]),
            ("Book again", f"{settings.FRONTEND_BASE_URL}/book"),
        ],
    )
    text = _render_email_text(
        title=title,
        intro=intro,
        details=details,
        actions=[
            ("View appointment", urls["view"]),
            ("Book again", f"{settings.FRONTEND_BASE_URL}/book"),
        ],
    )
    return EmailMessage(
        recipient_type=AppointmentNotificationRecipient.CLIENT,
        recipient_email=appointment.user.email,
        subject=title,
        html=html,
        text=text,
        idempotency_key=f"{AppointmentNotificationEvent.NO_SHOW.lower()}-{appointment.id}-client",
        payload={
            "booking_id": str(appointment.id),
            "event_type": AppointmentNotificationEvent.NO_SHOW,
            "recipient": AppointmentNotificationRecipient.CLIENT,
            "when": appointment_when,
        },
    )


def _management_urls(appointment: Appointment, *, owner: bool) -> dict[str, str]:
    base_price = appointment.service.price_cents
    total_price = appointment.total_price_cents or base_price
    duration = appointment.total_duration_minutes or appointment.service.duration_minutes
    add_on_ids = ",".join(str(add_on.id) for add_on in appointment.add_ons.all())
    add_on_names = "|".join(add_on.name for add_on in appointment.add_ons.all())
    schedule_path = (
        "/book/schedule"
        f"?rescheduleId={quote(str(appointment.id))}"
        f"&serviceId={quote(str(appointment.service_id))}"
        f"&title={quote(appointment.service.name)}"
        f"&basePrice={base_price}"
        f"&totalPrice={total_price}"
        f"&duration={duration}"
        f"&addOnIds={quote(add_on_ids)}"
        f"&addOnNames={quote(add_on_names)}"
    )
    if owner:
        manage_path = "/admin/dashboard/bookings"
        return {
            "view": _login_link(manage_path),
            "manage": _login_link(manage_path),
            "reschedule": _login_link(schedule_path),
        }

    view_path = "/user/dashboard"
    reschedule_token = make_booking_action_token(appointment, "reschedule")
    cancel_token = make_booking_action_token(appointment, "cancel")

    return {
        "view": _login_link(view_path),
        "manage": _login_link(view_path),
        "reschedule": f"{settings.FRONTEND_BASE_URL}/book/schedule?emailToken={quote(reschedule_token)}",
        "cancel": f"{settings.FRONTEND_BASE_URL}/book/manage?action=cancel&token={quote(cancel_token)}",
    }


def _login_link(target_path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL}/login?next={quote(target_path, safe='')}"


def make_booking_action_token(appointment: Appointment, action: str) -> str:
    return signing.dumps(
        {
            "appointment_id": str(appointment.id),
            "recipient_email": appointment.user.email,
            "action": action,
        },
        salt=BOOKING_EMAIL_TOKEN_SALT,
    )


def resolve_booking_action_token(token: str, *, expected_action: str | None = None) -> dict:
    payload = signing.loads(
        token,
        salt=BOOKING_EMAIL_TOKEN_SALT,
        max_age=BOOKING_EMAIL_TOKEN_MAX_AGE,
    )
    if expected_action and payload.get("action") != expected_action:
        raise signing.BadSignature("Unexpected booking action.")
    return payload


def _format_when(value: datetime | None) -> str:
    if not value:
        return ""
    local_value = timezone.localtime(value)
    date_part = local_value.strftime("%A, %b %d, %Y")
    time_part = local_value.strftime("%I:%M %p").lstrip("0")
    return f"{date_part} at {time_part} Toronto time"


def _service_summary(appointment: Appointment) -> str:
    names = [appointment.service.name, *(add_on.name for add_on in appointment.add_ons.all())]
    return ", ".join(name for name in names if name)


def _render_email_html(
    *,
    title: str,
    intro: str,
    details: list[tuple[str, str]],
    actions: list[tuple[str, str]],
) -> str:
    details_html = "".join(
        f"<p style='margin:0 0 8px'><strong>{escape(label)}:</strong> {escape(value)}</p>"
        for label, value in details
        if value
    )
    actions_html = "".join(
        (
            "<a href='{url}' style='display:inline-block;margin:0 8px 8px 0;"
            "padding:12px 16px;border-radius:8px;background:{bg};color:{fg};"
            "text-decoration:none;font-weight:600;border:1px solid {border}'>{label}</a>"
        ).format(
            url=escape(url, quote=True),
            label=escape(label),
            bg=_button_theme(label)["bg"],
            fg=_button_theme(label)["fg"],
            border=_button_theme(label)["border"],
        )
        for label, url in actions
    )
    return (
        "<div style='font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827'>"
        f"<p style='margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:0.12em;text-transform:uppercase'>{escape(settings.BUSINESS_NAME)}</p>"
        f"<h1 style='margin:0 0 12px;font-size:28px;line-height:1.2'>{escape(title)}</h1>"
        f"<p style='margin:0 0 20px;color:#374151;font-size:16px;line-height:1.5'>{escape(intro)}</p>"
        "<div style='background:#f3f4f6;border-radius:16px;padding:16px 18px;margin:0 0 20px'>"
        f"{details_html}"
        "</div>"
        f"<div>{actions_html}</div>"
        "</div>"
    )


def _render_email_text(
    *,
    title: str,
    intro: str,
    details: list[tuple[str, str]],
    actions: list[tuple[str, str]],
) -> str:
    details_text = "\n".join(f"{label}: {value}" for label, value in details if value)
    actions_text = "\n".join(f"{label}: {url}" for label, url in actions)
    return f"{title}\n\n{intro}\n\n{details_text}\n\n{actions_text}\n"


def _tag_value(value: str) -> str:
    return value.lower().replace(" ", "_")


def _button_theme(label: str) -> dict[str, str]:
    lowered = label.lower()
    if "cancel" in lowered:
        return {"bg": "#7f1d1d", "fg": "#ffffff", "border": "#7f1d1d"}
    if "reschedule" in lowered:
        return {"bg": "#f3f4f6", "fg": "#111827", "border": "#d1d5db"}
    return {"bg": "#111827", "fg": "#ffffff", "border": "#111827"}
