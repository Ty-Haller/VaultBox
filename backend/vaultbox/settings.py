from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-vaultbox-dev-key-change-in-production'

# Fernet key for encrypting secrets and seed phrases at rest (dev default — rotate in production)
VAULTBOX_ENCRYPTION_KEY = 'vaultbox-dev-fernet-key-change-in-prod!!'

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

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
        'NAME': BASE_DIR / 'db.sqlite3',
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

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

BACKUP_ROOT = BASE_DIR / 'backups'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

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

FRONTEND_BASE_URL = 'http://localhost:5173'
BACKEND_BASE_URL = 'http://127.0.0.1:8000'

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True

# WebAuthn / Passkey configuration
WEBAUTHN_RP_ID = 'localhost'
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