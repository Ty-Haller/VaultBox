"""Generic OIDC/OAuth2 SSO integration via Authlib."""

from __future__ import annotations

import secrets
from dataclasses import dataclass

from authlib.integrations.requests_client import OAuth2Session
from authlib.oauth2.rfc7636 import create_s256_code_challenge
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.text import slugify

from administration.models import UserProfile
from administration.sso_config import get_oauth_provider_map
from .models import OAuthIdentity, OAuthState


@dataclass
class OAuthFlowResult:
    user: User
    redirect_after: str
    mode: str  # 'login' | 'link'


def _provider_map(request=None) -> dict[str, dict]:
    admin = get_oauth_provider_map(request)
    if admin:
        return admin
    env = getattr(settings, 'OAUTH_PROVIDERS', {})
    return {
        pid: cfg for pid, cfg in env.items()
        if isinstance(cfg, dict) and cfg.get('enabled', True)
    }


def get_providers(request=None) -> list[dict]:
    return [
        {'id': pid, 'name': cfg.get('name', pid), 'enabled': True}
        for pid, cfg in _provider_map(request).items()
    ]


def _provider_name(provider_id: str, request=None) -> str:
    cfg = _provider_map(request).get(provider_id, {})
    return cfg.get('name', provider_id)


def _provider_config(provider_id: str, request=None) -> dict:
    cfg = _provider_map(request).get(provider_id)
    if not cfg:
        raise ValueError(f'OAuth provider "{provider_id}" is not configured')
    return cfg


def start_oauth_flow(
    provider_id: str,
    redirect_after: str = '/',
    request=None,
    *,
    link_user: User | None = None,
) -> tuple[str, OAuthState]:
    cfg = _provider_config(provider_id, request)
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = create_s256_code_challenge(code_verifier)
    oauth_state = OAuthState.objects.create(
        state=state,
        code_verifier=code_verifier,
        provider=provider_id,
        redirect_after=redirect_after,
        link_user=link_user,
    )
    client = OAuth2Session(
        cfg['client_id'],
        redirect_uri=cfg['redirect_uri'],
        scope=cfg.get('scope', 'openid email profile'),
    )
    auth_url, _ = client.create_authorization_url(
        cfg['authorize_url'],
        state=state,
        code_challenge=code_challenge,
        code_challenge_method='S256',
    )
    return auth_url, oauth_state


def _fetch_oauth_userinfo(provider_id: str, code: str, oauth_state: OAuthState, request=None) -> dict:
    cfg = _provider_config(provider_id, request)
    client = OAuth2Session(
        cfg['client_id'],
        redirect_uri=cfg['redirect_uri'],
    )
    token = client.fetch_token(
        cfg['token_url'],
        code=code,
        code_verifier=oauth_state.code_verifier,
        client_secret=cfg.get('client_secret', ''),
    )
    return client.get(cfg['userinfo_url'], token=token).json()


def complete_oauth_flow(provider_id: str, code: str, state: str, request=None) -> OAuthFlowResult:
    oauth_state = OAuthState.objects.filter(state=state, provider=provider_id).select_related('link_user').first()
    if not oauth_state:
        raise ValueError('Invalid OAuth state')
    redirect_after = oauth_state.redirect_after or '/'
    link_user = oauth_state.link_user

    userinfo = _fetch_oauth_userinfo(provider_id, code, oauth_state, request)
    subject = str(userinfo.get('sub') or userinfo.get('id') or '')
    email = userinfo.get('email', '')
    name = userinfo.get('name') or userinfo.get('preferred_username') or email.split('@')[0]
    if not subject:
        raise ValueError('OAuth provider did not return a subject identifier')

    if link_user is not None:
        result_user = _link_oauth_identity(
            link_user,
            provider_id=provider_id,
            subject=subject,
            email=email,
            name=name,
            request=request,
        )
        oauth_state.delete()
        return OAuthFlowResult(user=result_user, redirect_after=redirect_after, mode='link')

    identity = OAuthIdentity.objects.filter(provider=provider_id, subject=subject).select_related('user').first()
    if identity:
        oauth_state.delete()
        return OAuthFlowResult(user=identity.user, redirect_after=redirect_after, mode='login')

    username_base = slugify(email.split('@')[0] if email else name) or f'user-{subject[:8]}'
    username = username_base
    n = 1
    while User.objects.filter(username=username).exists():
        username = f'{username_base}-{n}'
        n += 1

    user = User.objects.create_user(username=username, email=email or '')
    user.set_unusable_password()
    user.save()
    UserProfile.objects.create(user=user, display_name=name)
    OAuthIdentity.objects.create(
        user=user, provider=provider_id, subject=subject, email=email, display_name=name,
    )
    oauth_state.delete()
    return OAuthFlowResult(user=user, redirect_after=redirect_after, mode='login')


def _link_oauth_identity(
    user: User,
    *,
    provider_id: str,
    subject: str,
    email: str,
    name: str,
    request=None,
) -> User:
    existing_subject = OAuthIdentity.objects.filter(provider=provider_id, subject=subject).first()
    if existing_subject and existing_subject.user_id != user.id:
        raise ValueError('This SSO account is already linked to another VaultBox user.')

    existing_provider = OAuthIdentity.objects.filter(user=user, provider=provider_id).first()
    if existing_provider:
        if existing_provider.subject == subject:
            if email and existing_provider.email != email:
                existing_provider.email = email
                existing_provider.save(update_fields=['email', 'updated_at'])
            return user
        raise ValueError(
            f'You already have {_provider_name(provider_id, request)} linked. '
            'Remove it before linking a different account.',
        )

    OAuthIdentity.objects.create(
        user=user,
        provider=provider_id,
        subject=subject,
        email=email,
        display_name=name,
    )
    return user


def list_user_oauth_identities(user: User, request=None) -> list[dict]:
    return [
        {
            'id': str(identity.id),
            'provider': identity.provider,
            'providerName': _provider_name(identity.provider, request),
            'email': identity.email,
            'displayName': identity.display_name,
            'linkedAt': identity.created_at.isoformat(),
        }
        for identity in OAuthIdentity.objects.filter(user=user).order_by('provider')
    ]


def unlink_oauth_identity(user: User, identity_id) -> bool:
    deleted, _ = OAuthIdentity.objects.filter(user=user, pk=identity_id).delete()
    return deleted > 0