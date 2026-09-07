from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.access import get_user_access
from accounts.scoping import (
    scope_audits,
    scope_documents,
    scope_holdings,
    scope_photos,
    scope_secrets,
    scope_sites,
    scope_vaults,
)
from administration.models import ProductType

from .chain_balance import fetch_chain_balance
from .crypto_prices import fetch_crypto_prices
from .market_prices import fetch_forex_prices, fetch_stock_prices
from .price_history import fetch_price_history
from .audit_lines import create_audit_line_items
from .kitco_catalog import search_catalog, search_product_types
from .changelog import log_change, log_model_create, log_model_delete, log_model_update, snapshot_instance
from .models import (
    AuditLineItem,
    AuditReport,
    AuditSession,
    ChangeLog,
    Document,
    Holding,
    Photo,
    PortfolioSnapshot,
    Secret,
    SecretAttachment,
    Site,
    Vault,
)
from .pdf_reports import inventory_pdf, labels_pdf, portfolio_pdf, profit_loss_pdf, purchase_sale_pdf
from .qr import generate_qr_png, holding_lookup_url
from .auth_mixins import AuthenticatedMixin, FullAdminMixin, ReportsMixin, ScopedInventoryMixin
from .serializers import (
    AuditLineItemSerializer,
    AuditReportSerializer,
    AuditSessionSerializer,
    ChangeLogSerializer,
    DocumentSerializer,
    HoldingSerializer,
    HoldingTransactSerializer,
    PhotoSerializer,
    PortfolioSnapshotSerializer,
    SecretAttachmentSerializer,
    SecretSerializer,
    SiteSerializer,
    VaultSerializer,
)


def _performed_by(request) -> str:
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return user.get_username() or user.email or ''
    return request.data.get('performedBy', '') if hasattr(request, 'data') else ''


class SiteViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return scope_sites(super().get_queryset(), self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_model_create(instance, 'site', performed_by=_performed_by(self.request))

    def perform_update(self, serializer):
        before = snapshot_instance(serializer.instance)
        instance = serializer.save()
        log_model_update(instance, 'site', before, performed_by=_performed_by(self.request))

    def perform_destroy(self, instance):
        log_model_delete(instance, 'site', performed_by=_performed_by(self.request))
        instance.delete()


class VaultViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Vault.objects.select_related('site').all()
    serializer_class = VaultSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_vaults(super().get_queryset(), self.request.user)
        site_id = self.request.query_params.get('site')
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_model_create(instance, 'vault', performed_by=_performed_by(self.request))

    def perform_update(self, serializer):
        before = snapshot_instance(serializer.instance)
        instance = serializer.save()
        log_model_update(instance, 'vault', before, performed_by=_performed_by(self.request))

    def perform_destroy(self, instance):
        log_model_delete(instance, 'vault', performed_by=_performed_by(self.request))
        instance.delete()


class HoldingViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Holding.objects.select_related(
        'vault', 'vault__site', 'asset_category', 'product_type'
    ).prefetch_related('photos', 'documents').all()
    serializer_class = HoldingSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_holdings(super().get_queryset(), self.request.user)
        vault_id = self.request.query_params.get('vault')
        metal = self.request.query_params.get('metal')
        asset_class = self.request.query_params.get('asset_class')
        status = self.request.query_params.get('status')
        include_archived = self.request.query_params.get('include_archived', '').lower() in ('1', 'true', 'yes')
        if vault_id:
            qs = qs.filter(vault_id=vault_id)
        if metal:
            qs = qs.filter(metal_type=metal)
        if asset_class:
            qs = qs.filter(asset_class=asset_class)
        if status:
            statuses = [s.strip() for s in status.split(',') if s.strip()]
            qs = qs.filter(status__in=statuses)
        elif not include_archived:
            qs = qs.filter(status='active')
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_model_create(instance, 'holding', performed_by=_performed_by(self.request))
        from administration.notification_hooks import notify_new_acquisition
        label = instance.name or (instance.product_type.name if instance.product_type_id else 'Holding')
        notify_new_acquisition(label, str(instance.id), instance.vault.name)

    def perform_update(self, serializer):
        before = snapshot_instance(serializer.instance)
        instance = serializer.save()
        log_model_update(instance, 'holding', before, performed_by=_performed_by(self.request))

    def perform_destroy(self, instance):
        log_model_delete(instance, 'holding', performed_by=_performed_by(self.request))
        instance.delete()

    @action(detail=True, methods=['post'])
    def transact(self, request, id=None):
        holding = self.get_object()
        if holding.status != 'active':
            return Response(
                {'error': 'Only active holdings can be transacted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = HoldingTransactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tx_type = data['type']
        before = snapshot_instance(holding)
        holding.status = tx_type
        holding.transaction_type = tx_type
        holding.transaction_date = data.get('transactionDate') or timezone.now().date()
        holding.sale_price = data.get('salePrice')
        holding.buyer_name = data.get('buyerName', '')
        holding.insurance_claim_number = data.get('insuranceClaimNumber', '')
        holding.transaction_notes = data.get('transactionNotes', '')
        holding.archived_at = timezone.now()
        holding.save()
        performed_by = data.get('performedBy') or _performed_by(request)
        log_change(
            entity_type='holding',
            entity_id=holding.pk,
            entity_label=holding.name,
            action='transact',
            performed_by=performed_by,
            changes={
                'before': before,
                'after': snapshot_instance(holding),
                'transactionType': tx_type,
            },
            notes=data.get('transactionNotes', ''),
        )
        return Response(HoldingSerializer(holding, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def qr(self, request, id=None):
        holding = self.get_object()
        png = generate_qr_png(holding_lookup_url(holding))
        return HttpResponse(png, content_type='image/png')

    @action(detail=True, methods=['get'])
    def label(self, request, id=None):
        holding = self.get_object()
        pdf = labels_pdf([holding])
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="label-{holding.qr_code}.pdf"'
        return response


class PhotoViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Photo.objects.select_related('holding', 'holding__vault', 'vault', 'vault__site', 'site').all()
    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_photos(super().get_queryset(), self.request.user)
        holding_id = self.request.query_params.get('holding')
        vault_id = self.request.query_params.get('vault')
        site_id = self.request.query_params.get('site')
        if holding_id:
            qs = qs.filter(holding_id=holding_id)
        if vault_id:
            qs = qs.filter(vault_id=vault_id)
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def perform_create(self, serializer):
        photo = serializer.save()
        if photo.is_primary:
            Photo.objects.filter(holding=photo.holding).exclude(pk=photo.pk).update(is_primary=False)
            Photo.objects.filter(vault=photo.vault).exclude(pk=photo.pk).update(is_primary=False)
            Photo.objects.filter(site=photo.site).exclude(pk=photo.pk).update(is_primary=False)


class DocumentViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Document.objects.select_related('holding', 'holding__vault', 'holding__vault__site').all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_documents(super().get_queryset(), self.request.user)
        holding_id = self.request.query_params.get('holding')
        if holding_id:
            qs = qs.filter(holding_id=holding_id)
        return qs


class PortfolioHistoryView(ReportsMixin, APIView):
    def get(self, request):
        if not get_user_access(request.user).is_full_admin:
            return Response([])
        snapshots = PortfolioSnapshot.objects.all()
        serializer = PortfolioSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data)


class QRLookupView(ScopedInventoryMixin, APIView):
    def get(self, request, code):
        holding = get_object_or_404(
            scope_holdings(
                Holding.objects.select_related('vault', 'vault__site').prefetch_related('photos'),
                request.user,
            ),
            qr_code=code.upper(),
        )
        serializer = HoldingSerializer(holding, context={'request': request})
        return Response(serializer.data)


class ChainBalanceView(AuthenticatedMixin, APIView):
    """Query on-chain balance for a wallet address."""

    def post(self, request):
        address = request.data.get('address', '')
        symbol = request.data.get('symbol', '')
        chain = request.data.get('chain')
        result = fetch_chain_balance(address, symbol, chain)
        if result.get('error') and result.get('balance') is None:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class KitcoSearchView(AuthenticatedMixin, APIView):
    """Search curated catalog and product types for holding auto-fill."""

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])
        limit = min(int(request.query_params.get('limit', 15)), 30)
        products = ProductType.objects.filter(is_active=True).select_related(
            'metal_type', 'form_factor', 'category'
        )
        db_results = search_product_types(products, query, limit=limit)
        seen = {r['slug'] for r in db_results}
        catalog_results = [
            r for r in search_catalog(query, limit=limit)
            if r['slug'] not in seen
        ]
        combined = (db_results + catalog_results)[:limit]
        return Response(combined)


class SeedDataView(FullAdminMixin, APIView):
    def post(self, request):
        from django.core.management import call_command

        from .models import Holding, Site, Vault

        confirm = str(request.data.get('confirm') or '').strip()
        if confirm != 'RESET':
            return Response({'error': 'Type RESET (all caps) to confirm.'}, status=400)
        call_command('seed_data', flush=True)
        return Response({
            'status': 'seeded',
            'sites': Site.objects.count(),
            'vaults': Vault.objects.count(),
            'holdings': Holding.objects.count(),
        })


class AuditSessionViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = AuditSession.objects.select_related('vault').prefetch_related(
        'line_items', 'line_items__holding', 'line_items__product_type'
    ).all()
    serializer_class = AuditSessionSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_audits(super().get_queryset(), self.request.user)
        vault_id = self.request.query_params.get('vault')
        if vault_id:
            qs = qs.filter(vault_id=vault_id)
        return qs

    def _resolve_audit_type(self, request):
        audit_type = request.data.get('auditType')
        if audit_type in ('standard', 'advanced'):
            return audit_type
        from administration.models import AuditWorkflow
        wf = (
            AuditWorkflow.objects.filter(enabled=True, applies_to__in=('vault', 'all'))
            .order_by('name')
            .first()
        )
        if wf and wf.audit_type in ('standard', 'advanced'):
            return wf.audit_type
        return 'standard'

    def create(self, request, *args, **kwargs):
        vault_id = request.data.get('vaultId')
        if not vault_id:
            return Response({'error': 'vaultId required'}, status=status.HTTP_400_BAD_REQUEST)
        vault = get_object_or_404(Vault, id=vault_id)
        force_new = request.data.get('forceNew', False) in (True, 'true', '1', 1)
        if not force_new:
            existing = AuditSession.objects.filter(
                vault=vault, status__in=('draft', 'in_progress')
            ).prefetch_related('line_items', 'line_items__holding').order_by('-started_at').first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            AuditSession.objects.filter(
                vault=vault, status__in=('draft', 'in_progress')
            ).update(status='cancelled')
        audit_type = self._resolve_audit_type(request)
        audit = AuditSession.objects.create(
            vault=vault,
            performed_by=request.data.get('performedBy', ''),
            notes=request.data.get('notes', ''),
            status='in_progress',
            audit_type=audit_type,
        )
        log_change(
            entity_type='audit',
            entity_id=audit.pk,
            entity_label=f'{vault.name} audit',
            action='create',
            performed_by=_performed_by(request),
            changes={'after': {'vaultId': str(vault.id), 'status': audit.status}},
        )
        create_audit_line_items(audit, vault, audit_type)
        audit = AuditSession.objects.prefetch_related(
            'line_items', 'line_items__holding', 'line_items__product_type'
        ).get(pk=audit.pk)
        serializer = self.get_serializer(audit)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _reject_if_not_editable(self, audit):
        if audit.status == 'completed':
            return Response(
                {'error': 'Completed audits cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if audit.status == 'cancelled':
            return Response(
                {'error': 'Cancelled audits cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    @action(detail=True, methods=['post'])
    def cancel(self, request, id=None):
        audit = self.get_object()
        if audit.status == 'completed':
            return Response(
                {'error': 'Completed audits cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if audit.status == 'cancelled':
            return Response(AuditSessionSerializer(audit).data)
        audit.status = 'cancelled'
        audit.save(update_fields=['status'])
        log_change(
            entity_type='audit',
            entity_id=audit.pk,
            entity_label=f'{audit.vault.name} audit',
            action='update',
            performed_by=request.data.get('performedBy') or _performed_by(request),
            changes={'status': 'cancelled'},
            notes=request.data.get('notes', ''),
        )
        from administration.notification_hooks import notify_audit_canceled
        notify_audit_canceled(
            audit.vault.name, str(audit.vault_id),
            request.data.get('performedBy') or _performed_by(request),
        )
        audit = AuditSession.objects.prefetch_related(
            'line_items', 'line_items__holding', 'line_items__product_type'
        ).get(pk=audit.pk)
        return Response(AuditSessionSerializer(audit).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, id=None):
        audit = self.get_object()
        blocked = self._reject_if_not_editable(audit)
        if blocked:
            return blocked
        lines_data = request.data.get('lineItems', [])
        discrepancy_count = 0
        for line in lines_data:
            line_id = line.get('id')
            if not line_id:
                continue
            try:
                item = AuditLineItem.objects.get(id=line_id, audit=audit)
            except AuditLineItem.DoesNotExist:
                continue
            if 'sessionQty' in line and line['sessionQty'] is not None:
                sq = int(line['sessionQty'])
                if sq != 0:
                    item.current_count = max(0, (item.current_count or 0) + sq)
            if 'currentCount' in line and line['currentCount'] is not None:
                item.current_count = max(0, int(line['currentCount']))
            item.counted_qty = item.current_count if item.current_count is not None else 0
            item.verified = line.get('verified', item.counted_qty == item.expected_qty)
            item.discrepancy_notes = line.get('discrepancyNotes', '')
            item.save()
            if item.counted_qty is not None and item.counted_qty != item.expected_qty:
                discrepancy_count += 1

        audit.status = 'completed'
        audit.discrepancy_count = discrepancy_count
        audit.completed_at = timezone.now()
        audit.notes = request.data.get('notes', audit.notes)
        audit.performed_by = request.data.get('performedBy', audit.performed_by)
        audit.save()
        log_change(
            entity_type='audit',
            entity_id=audit.pk,
            entity_label=f'{audit.vault.name} audit',
            action='update',
            performed_by=audit.performed_by,
            changes={'status': 'completed', 'discrepancyCount': discrepancy_count},
            notes=audit.notes,
        )

        vault = audit.vault
        vault.last_audit_date = timezone.now().date()
        vault.save(update_fields=['last_audit_date'])

        from administration.notification_hooks import notify_audit_completed
        notify_audit_completed(vault.name, str(vault.id), discrepancy_count)

        line_items = AuditLineItemSerializer(audit.line_items.all(), many=True).data
        report_data = {
            'vaultId': str(vault.id),
            'vaultName': vault.name,
            'performedBy': audit.performed_by,
            'completedAt': audit.completed_at.isoformat(),
            'discrepancyCount': discrepancy_count,
            'lineItems': line_items,
            'notes': audit.notes,
        }
        AuditReport.objects.update_or_create(audit=audit, defaults={'report_data': report_data})

        audit = AuditSession.objects.prefetch_related(
            'line_items', 'line_items__holding'
        ).get(pk=audit.pk)
        return Response(AuditSessionSerializer(audit).data)

    @action(detail=True, methods=['patch'])
    def lines(self, request, id=None):
        audit = self.get_object()
        blocked = self._reject_if_not_editable(audit)
        if blocked:
            return blocked
        lines_data = request.data.get('lineItems', [])
        for line in lines_data:
            line_id = line.get('id')
            if not line_id:
                continue
            try:
                item = AuditLineItem.objects.get(id=line_id, audit=audit)
            except AuditLineItem.DoesNotExist:
                continue
            if 'sessionQty' in line and line['sessionQty'] is not None:
                sq = int(line['sessionQty'])
                if sq != 0:
                    item.current_count = max(0, (item.current_count or 0) + sq)
            if 'currentCount' in line and line['currentCount'] is not None:
                item.current_count = max(0, int(line['currentCount']))
            if 'discrepancyNotes' in line:
                item.discrepancy_notes = line['discrepancyNotes']
            item.save()
        if 'notes' in request.data:
            audit.notes = request.data['notes']
        if 'performedBy' in request.data:
            audit.performed_by = request.data['performedBy']
        if audit.status == 'draft':
            audit.status = 'in_progress'
        audit.save(update_fields=['notes', 'performed_by', 'status'])
        audit = AuditSession.objects.prefetch_related(
            'line_items', 'line_items__holding'
        ).get(pk=audit.pk)
        return Response(AuditSessionSerializer(audit).data)


class AuditReportViewSet(ReportsMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditReport.objects.select_related('audit', 'audit__vault').all()
    serializer_class = AuditReportSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        audit_qs = scope_audits(AuditSession.objects.all(), self.request.user)
        qs = qs.filter(audit_id__in=audit_qs.values_list('id', flat=True))
        vault_id = self.request.query_params.get('vault')
        if vault_id:
            qs = qs.filter(audit__vault_id=vault_id)
        return qs


class ChangeLogViewSet(ReportsMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ChangeLog.objects.all()
    serializer_class = ChangeLogSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        entity_type = self.request.query_params.get('entity_type')
        entity_id = self.request.query_params.get('entity_id')
        action = self.request.query_params.get('action')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=entity_id)
        if action:
            qs = qs.filter(action=action)
        return qs


class SecretViewSet(ScopedInventoryMixin, viewsets.ModelViewSet):
    queryset = Secret.objects.select_related('vault', 'site').prefetch_related('attachments').all()
    serializer_class = SecretSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = scope_secrets(super().get_queryset(), self.request.user)
        vault_id = self.request.query_params.get('vault')
        site_id = self.request.query_params.get('site')
        if vault_id:
            qs = qs.filter(vault_id=vault_id)
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_model_create(instance, 'secret', label_field='label', performed_by=_performed_by(self.request))

    def perform_update(self, serializer):
        before = snapshot_instance(serializer.instance)
        instance = serializer.save()
        log_model_update(instance, 'secret', before, label_field='label', performed_by=_performed_by(self.request))

    def perform_destroy(self, instance):
        log_model_delete(instance, 'secret', label_field='label', performed_by=_performed_by(self.request))
        instance.delete()

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, id=None):
        secret = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'file required'}, status=status.HTTP_400_BAD_REQUEST)
        attachment = SecretAttachment.objects.create(
            secret=secret,
            file=file,
            attachment_type=request.data.get('attachmentType', 'document'),
        )
        return Response(SecretAttachmentSerializer(attachment, context={'request': request}).data)


class CryptoPricesView(AuthenticatedMixin, APIView):
    def get(self, request):
        symbols = request.query_params.get('symbols', '').split(',')
        symbols = [s.strip().upper() for s in symbols if s.strip()]
        prices = fetch_crypto_prices(symbols or None)
        return Response(prices)


class MarketQuotesView(AuthenticatedMixin, APIView):
    """Stock and forex quotes for the price ticker."""

    def get(self, request):
        stocks = [s.strip().upper() for s in request.query_params.get('stocks', '').split(',') if s.strip()]
        forex = [s.strip().upper() for s in request.query_params.get('forex', '').split(',') if s.strip()]
        return Response({
            'stocks': fetch_stock_prices(stocks),
            'forex': fetch_forex_prices(forex),
        })


class PriceHistoryView(AuthenticatedMixin, APIView):
    """Historical price series for live price charts."""

    def get(self, request):
        asset_type = request.query_params.get('type', '').strip().lower()
        symbol = request.query_params.get('symbol', '').strip()
        range_key = request.query_params.get('range', '30d').strip().lower()
        if not asset_type or not symbol:
            return Response(
                {'error': 'type and symbol are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = fetch_price_history(asset_type, symbol, range_key)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not data['points']:
            return Response({'error': 'No price history available'}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class ReportPDFView(ReportsMixin, APIView):
    def get(self, request, report_type):
        access = get_user_access(request.user)
        holdings_qs = scope_holdings(
            Holding.objects.select_related('vault', 'vault__site', 'dealer'),
            request.user,
        )
        if report_type == 'portfolio':
            if not access.is_full_admin:
                return Response({'error': 'Portfolio report requires Full Admin access'}, status=status.HTTP_403_FORBIDDEN)
            pdf = portfolio_pdf(list(PortfolioSnapshot.objects.all()))
            filename = 'vaultbox-portfolio.pdf'
        elif report_type == 'inventory':
            pdf = inventory_pdf(
                list(
                    holdings_qs.filter(status='active').order_by('metal_type', 'name')
                )
            )
            filename = 'vaultbox-inventory.pdf'
        elif report_type == 'labels':
            ids = request.query_params.get('holdings', '')
            if ids:
                id_list = [i.strip() for i in ids.split(',') if i.strip()]
                holdings = list(holdings_qs.filter(id__in=id_list))
            else:
                holdings = list(holdings_qs.filter(status='active'))
            pdf = labels_pdf(holdings)
            filename = 'vaultbox-labels.pdf'
        elif report_type == 'purchase-sale':
            date_from = request.query_params.get('from') or None
            date_to = request.query_params.get('to') or None
            holdings = list(
                holdings_qs.exclude(status='deleted').order_by('name')
            )
            pdf = purchase_sale_pdf(holdings, date_from=date_from, date_to=date_to)
            filename = 'vaultbox-purchases-sales.pdf'
        elif report_type == 'profit-loss':
            date_from = request.query_params.get('from') or None
            date_to = request.query_params.get('to') or None
            include_charts = request.query_params.get('charts', '').lower() in (
                '1', 'true', 'yes', 'on'
            )
            holdings = list(holdings_qs.exclude(status='deleted').order_by('name'))
            snapshots = (
                list(PortfolioSnapshot.objects.order_by('date'))
                if access.is_full_admin
                else []
            )
            pdf = profit_loss_pdf(
                holdings,
                snapshots,
                date_from=date_from,
                date_to=date_to,
                include_charts=include_charts,
            )
            filename = 'vaultbox-profit-loss.pdf'
        else:
            return Response({'error': 'Unknown report type'}, status=status.HTTP_400_BAD_REQUEST)

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response