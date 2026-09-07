from django.urls import path

from .views import (
    DemoPasskeyRegisterBeginView,
    DemoPasskeyRegisterFinishView,
    DemoSessionView,
    DemoStatusView,
)

urlpatterns = [
    path('api/demo-status/', DemoStatusView.as_view()),
    path('api/auth/demo-session/', DemoSessionView.as_view()),
    path('api/auth/demo-passkey/register/begin/', DemoPasskeyRegisterBeginView.as_view()),
    path('api/auth/demo-passkey/register/finish/', DemoPasskeyRegisterFinishView.as_view()),
]
