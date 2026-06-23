from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .rbac_views import (
    PermissionCatalogView,
    PublicSignupView,
    RoleViewSet,
    SetupPasskeyBeginView,
    SetupPasskeyFinishView,
    SetupPasskeyValidateView,
    SignupRequestViewSet,
    UserGroupViewSet,
)
from administration.notification_views import UserNotificationPreferencesView

from .views import (
    ApiTokenViewSet,
    AuthMeView,
    BootstrapPasskeyBeginView,
    BootstrapPasskeyFinishView,
    LogoutView,
    OAuthCallbackView,
    OAuthIdentitiesView,
    OAuthIdentityDetailView,
    OAuthLinkView,
    OAuthLoginView,
    OAuthProvidersView,
    PasskeyLoginBeginView,
    PasskeyLoginFinishView,
    PasskeyRegisterBeginView,
    PasskeyRegisterFinishView,
    PasskeyViewSet,
    RoleAssignmentViewSet,
    UserSettingsView,
    csrf_token_view,
)

router = DefaultRouter()
router.register('passkeys', PasskeyViewSet, basename='passkey')
router.register('tokens', ApiTokenViewSet, basename='api-token')
router.register('roles', RoleViewSet, basename='role')
router.register('groups', UserGroupViewSet, basename='user-group')
router.register('signup-requests', SignupRequestViewSet, basename='signup-request')
urlpatterns = [
    path('csrf/', csrf_token_view),
    path('me/', AuthMeView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('settings/', UserSettingsView.as_view()),
    path('notification-preferences/', UserNotificationPreferencesView.as_view()),
    path('passkey/login/begin/', PasskeyLoginBeginView.as_view()),
    path('passkey/login/finish/', PasskeyLoginFinishView.as_view()),
    path('passkey/register/begin/', PasskeyRegisterBeginView.as_view()),
    path('passkey/register/finish/', PasskeyRegisterFinishView.as_view()),
    path('passkey/bootstrap/begin/', BootstrapPasskeyBeginView.as_view()),
    path('passkey/bootstrap/finish/', BootstrapPasskeyFinishView.as_view()),
    path('oauth/providers/', OAuthProvidersView.as_view()),
    path('oauth/identities/', OAuthIdentitiesView.as_view()),
    path('oauth/identities/<uuid:identity_id>/', OAuthIdentityDetailView.as_view()),
    path('oauth/<str:provider>/login/', OAuthLoginView.as_view()),
    path('oauth/<str:provider>/link/', OAuthLinkView.as_view()),
    path('oauth/<str:provider>/callback/', OAuthCallbackView.as_view()),
    path('permissions/', PermissionCatalogView.as_view()),
    path('signup/', PublicSignupView.as_view()),
    path('setup-passkey/validate/', SetupPasskeyValidateView.as_view()),
    path('setup-passkey/begin/', SetupPasskeyBeginView.as_view()),
    path('setup-passkey/finish/', SetupPasskeyFinishView.as_view()),
    path('user-roles/<int:user_id>/', RoleAssignmentViewSet.as_view({'get': 'retrieve', 'put': 'update'})),
    path('', include(router.urls)),
]