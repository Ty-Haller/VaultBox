import os
import secrets
from pathlib import Path

from vaultbox.host_env import (
    backend_base_url as _backend_base_url,
    env_bool,
    env_hostname,
    env_use_https,
    frontend_base_url as _frontend_base_url,
    hosts_and_origins,
    load_admin_override,
    rp_id_for,
)

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
_env_override = os.environ.get('VAULTBOX_ENV_FILE', '').strip()
ENV_FILE = Path(_env_override) if _env_override else REPO_ROOT / '.env'


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def _write_env_updates(path: Path, updates: dict[str, str]) -> None:
    lines: list[str] = []
    seen: set[str] = set()
    if path.is_file():
        lines = path.read_text(encoding='utf-8').splitlines()
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and '=' in stripped:
            key = stripped.split('=', 1)[0].strip()
            if key in updates:
                out.append(f'{key}={updates[key]}')
                seen.add(key)
                continue
        out.append(line)
    for key, value in updates.items():
        if key not in seen:
            out.append(f'{key}={value}')
    path.write_text('\n'.join(out) + '\n', encoding='utf-8')
    os.chmod(path, 0o600)


def _load_secret(name: str) -> str:
    value = os.environ.get(name, '').strip()
    if value:
        return value
    generated = secrets.token_urlsafe(48)
    os.environ[name] = generated
    _write_env_updates(ENV_FILE, {name: generated})
    return generated


for _key, _val in _parse_env_file(ENV_FILE).items():
    if _val:
        os.environ.setdefault(_key, _val)

SECRET_KEY = _load_secret('SECRET_KEY')
VAULTBOX_ENCRYPTION_KEY = _load_secret('VAULTBOX_ENCRYPTION_KEY')

DEBUG = env_bool('VAULTBOX_DEBUG', True)

_data_dir = os.environ.get('VAULTBOX_DATA_DIR', '').strip()
DATA_DIR = Path(_data_dir).resolve() if _data_dir else BASE_DIR
if _data_dir:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

VAULTBOX_HOSTNAME = env_hostname()
VAULTBOX_USE_HTTPS = env_use_https()
_admin_host, _admin_https = load_admin_override(DATA_DIR / 'db.sqlite3')
_boot_host = _admin_host or VAULTBOX_HOSTNAME
_boot_https = _admin_https if _admin_host else VAULTBOX_USE_HTTPS
ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS = hosts_and_origins(_boot_host, _boot_https)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'inventory',
    'administration',
    'accounts',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vaultbox.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vaultbox.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DATA_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
FRONTEND_DIST = BASE_DIR / 'frontend_dist'
if FRONTEND_DIST.is_dir():
    WHITENOISE_ROOT = FRONTEND_DIST

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': (
            'django.contrib.staticfiles.storage.StaticFilesStorage'
            if DEBUG
            else 'whitenoise.storage.CompressedStaticFilesStorage'
        ),
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = DATA_DIR / 'media'

BACKUP_ROOT = DATA_DIR / 'backups'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.ApiTokenAuthentication',
        'accounts.authentication.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S.%fZ',
    'DATE_FORMAT': '%Y-%m-%d',
}

FRONTEND_BASE_URL = _frontend_base_url(_boot_host or 'localhost', _boot_https)
BACKEND_BASE_URL = _backend_base_url(_boot_host or 'localhost', _boot_https)

CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
if VAULTBOX_USE_HTTPS:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True

# WebAuthn / Passkey configuration (derived from hostname; Admin may override at runtime)
WEBAUTHN_RP_ID = rp_id_for(_boot_host or 'localhost')
WEBAUTHN_RP_NAME = 'VaultBox'
WEBAUTHN_ORIGIN = FRONTEND_BASE_URL

# OAuth / OIDC SSO providers (configure per environment)
OAUTH_PROVIDERS = {
    # Example — enable and fill credentials to activate:
    # 'google': {
    #     'name': 'Google',
    #     'enabled': False,
    #     'client_id': '',
    #     'client_secret': '',
    #     'authorize_url': 'https://accounts.google.com/o/oauth2/v2/auth',
    #     'token_url': 'https://oauth2.googleapis.com/token',
    #     'userinfo_url': 'https://openidconnect.googleapis.com/v1/userinfo',
    #     'redirect_uri': 'http://127.0.0.1:8000/api/auth/oauth/google/callback/',
    #     'scope': 'openid email profile',
    # },
}