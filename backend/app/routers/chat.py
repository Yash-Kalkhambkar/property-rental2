"""
AI chat endpoint — streams responses from Groq LLaMA.
Two routes:
  POST /api/v1/chat/owner  → owner context  (requires owner JWT)
  POST /api/v1/chat/tenant → tenant context (requires tenant JWT)
"""

import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal

from app.core.config import settings
from app.dependencies.auth import get_current_owner, get_current_tenant
from app.models.owner import Owner
from app.models.tenant import Tenant

router = APIRouter()

# ── Shared system prompts ─────────────────────────────────────────────────────

OWNER_SYSTEM = """You are RentEase Assistant, an AI helper built into the RentEase property management platform.
You are talking to a PROPERTY OWNER / LANDLORD.

RentEase is an app that lets owners manage properties, units, tenants, leases, and rent payments.

Key features available to owners:
- Dashboard: occupancy rate, rent collected vs expected, overdue payments, expiring leases
- Properties: add/edit buildings and individual units
- Tenants: add tenant profiles with login credentials for the resident portal
- Leases: create and manage lease agreements linking tenants to units
- Payments: record and track rent payments, flag overdue amounts

Your job:
- Help owners navigate and use RentEase effectively
- Answer questions about property management best practices
- Explain features and where to find them in the app
- Give practical landlord advice (tenant screening, rent pricing, lease terms, maintenance, legal basics)
- Keep answers focused, practical, and under 120 words unless a detailed explanation is needed
- Use plain language — no jargon unless the owner uses it first
- If asked something completely unrelated to property/rental management, politely redirect

You do NOT have access to the owner's actual data — you cannot look up their specific tenants, payments, or properties. For data questions, direct them to the relevant page in the app.

Be warm but efficient. No fluff."""

TENANT_SYSTEM = """You are RentEase Assistant, an AI helper built into the RentEase resident portal.
You are talking to a TENANT / RESIDENT.

RentEase is an app that lets tenants view their lease, track rent payments, and manage their profile.

Key features available to tenants:
- Home Dashboard: upcoming payments, lease summary, payment status
- Leases: view active and past leases, terms, start/end dates
- Payments: payment history, status (paid/pending/overdue), amounts due
- Properties: details of units they occupy or have occupied
- Profile: update contact info, change password

Your job:
- Help tenants understand their dashboard and find information
- Answer questions about renting, tenant rights, and best practices
- Explain what the different statuses and terms mean
- Give practical renter advice (communication with landlords, documenting issues, understanding lease clauses)
- Keep answers focused and under 120 words unless a detailed explanation is needed
- Be reassuring and supportive — tenants may feel anxious about rent or lease issues

You do NOT have access to the tenant's actual data — you cannot look up their specific lease or payment history. For data questions, direct them to the relevant page in the app.

Be warm, clear, and supportive."""

# ── Request schema ────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(max_length=20)  # cap history at 20 turns


# ── Streaming generator ───────────────────────────────────────────────────────

async def stream_groq(system_prompt: str, messages: list[ChatMessage]):
    """Yields Server-Sent Events with streamed Groq tokens."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        groq_messages.append({"role": msg.role, "content": msg.content})

    try:
        stream = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=groq_messages,
            stream=True,
            max_tokens=512,
            temperature=0.65,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                payload = json.dumps({"token": delta.content})
                yield f"data: {payload}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/owner")
async def owner_chat(
    body: ChatRequest,
    current_owner: Owner = Depends(get_current_owner),
):
    return StreamingResponse(
        stream_groq(OWNER_SYSTEM, body.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/tenant")
async def tenant_chat(
    body: ChatRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
):
    return StreamingResponse(
        stream_groq(TENANT_SYSTEM, body.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
