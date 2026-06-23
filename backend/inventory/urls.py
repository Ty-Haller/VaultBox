from django.urls import include, path
from rest_framework.routers import DefaultRouter

from administration.notification_views import MarketAlertDetailView, MarketAlertsListView

from .views import (
    AuditReportViewSet,
    AuditSessionViewSet,
    ChainBalanceView,
    ChangeLogViewSet,
    CryptoPricesView,
    MarketQuotesView,
    PriceHistoryView,
    DocumentViewSet,
    HoldingViewSet,
    KitcoSearchView,
    PhotoViewSet,
    PortfolioHistoryView,
    QRLookupView,
    ReportPDFView,
    SecretViewSet,
    SeedDataView,
    SiteViewSet,
    VaultViewSet,
)

router = DefaultRouter()
router.register('sites', SiteViewSet, basename='site')
router.register('vaults', VaultViewSet, basename='vault')
router.register('holdings', HoldingViewSet, basename='holding')
router.register('photos', PhotoViewSet, basename='photo')
router.register('documents', DocumentViewSet, basename='document')
router.register('audits', AuditSessionViewSet, basename='audit')
router.register('audit-reports', AuditReportViewSet, basename='audit-report')
router.register('secrets', SecretViewSet, basename='secret')
router.register('changelog', ChangeLogViewSet, basename='changelog')

urlpatterns = [
    path('', include(router.urls)),
    path('chain-balance/', ChainBalanceView.as_view(), name='chain-balance'),
    path('kitco/search/', KitcoSearchView.as_view(), name='kitco-search'),
    path('crypto-prices/', CryptoPricesView.as_view(), name='crypto-prices'),
    path('market-quotes/', MarketQuotesView.as_view(), name='market-quotes'),
    path('price-history/', PriceHistoryView.as_view(), name='price-history'),
    path('market-alerts/', MarketAlertsListView.as_view(), name='market-alerts-list'),
    path(
        'market-alerts/<str:instrument_type>/<str:symbol>/',
        MarketAlertDetailView.as_view(),
        name='market-alert-detail',
    ),
    path('portfolio-history/', PortfolioHistoryView.as_view(), name='portfolio-history'),
    path('lookup/<str:code>/', QRLookupView.as_view(), name='qr-lookup'),
    path('reports/<str:report_type>.pdf', ReportPDFView.as_view(), name='report-pdf'),
    path('seed/', SeedDataView.as_view(), name='seed-data'),
]