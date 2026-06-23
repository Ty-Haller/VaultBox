"""System-wide notification event catalog and default rule templates."""

from __future__ import annotations

from decimal import Decimal

# event_type, name, slug, category, description, enabled, threshold, email, in_app, apprise, refire_hours
NOTIFICATION_DEFAULTS: list[tuple] = [
    ('audit_due', 'Audit Due Reminder', 'audit-due', 'audit',
     'Vault audit is approaching its due date', True, None, True, True, False, 72),
    ('audit_overdue', 'Audit Overdue', 'audit-overdue', 'audit',
     'Vault audit is past due', True, None, True, True, False, 72),
    ('audit_completed', 'Audit Completed', 'audit-completed', 'audit',
     'Audit completed with no discrepancies', True, None, False, True, False, None),
    ('audit_completed_issues', 'Audit Completed (Issues)', 'audit-completed-issues', 'audit',
     'Audit completed with count discrepancies', True, None, True, True, False, None),
    ('audit_canceled', 'Audit Canceled', 'audit-canceled', 'audit',
     'An in-progress audit was canceled', True, None, False, True, False, None),
    ('signup_request', 'Signup Request', 'signup-request', 'admin',
     'A new VaultBox access request was submitted', True, None, True, True, False, None),
    ('user_created', 'User Created', 'user-created', 'admin',
     'A new user account was created', True, None, True, True, False, None),
    ('user_deleted', 'User Deleted', 'user-deleted', 'admin',
     'A user account was removed', True, None, True, True, False, None),
    ('passkey_added', 'Passkey Added', 'passkey-added', 'admin',
     'A passkey was registered on an account', True, None, False, True, False, None),
    ('passkey_removed', 'Passkey Removed', 'passkey-removed', 'admin',
     'A passkey was removed from an account', True, None, True, True, False, None),
    ('price_change', 'Spot/Market Price Change', 'price-change', 'market',
     'Configured spot price moved beyond threshold (%)', True, Decimal('1.0'), False, True, False, 6),
    ('asset_value_gain', 'Unrealized Gain Threshold', 'asset-value-gain', 'asset',
     'Holding unrealized gain exceeds threshold (%)', True, Decimal('10.0'), False, True, False, 24),
    ('asset_value_loss', 'Unrealized Loss Threshold', 'asset-value-loss', 'asset',
     'Holding unrealized loss exceeds threshold (%)', True, Decimal('10.0'), False, True, False, 24),
    ('capacity_warning', 'Vault Capacity Warning', 'capacity-warning', 'asset',
     'Vault fill level exceeds threshold (%)', True, Decimal('85.0'), False, True, False, 24),
    ('new_acquisition', 'New Acquisition', 'new-acquisition', 'asset',
     'A new holding was added to inventory', True, None, False, True, False, None),
    ('insurance_expiry', 'Insurance Expiry', 'insurance-expiry', 'asset',
     'Insurance coverage is nearing expiration', True, None, True, True, False, 168),
    ('activity_create', 'Activity: Created', 'activity-create', 'activity',
     'A record was created (mirrors Activity Log)', False, None, False, True, False, None),
    ('activity_update', 'Activity: Updated', 'activity-update', 'activity',
     'A record was updated (mirrors Activity Log)', False, None, False, True, False, None),
    ('activity_delete', 'Activity: Deleted', 'activity-delete', 'activity',
     'A record was deleted (mirrors Activity Log)', False, None, False, True, False, None),
    ('activity_transact', 'Activity: Transaction', 'activity-transact', 'activity',
     'A holding transaction was recorded (mirrors Activity Log)', False, None, False, True, False, None),
]

EVENT_CATEGORIES = {
    'audit': 'Audits',
    'admin': 'Admin & Users',
    'market': 'Spot / Market',
    'asset': 'Assets & Value',
    'activity': 'Activity Log',
}

ADMIN_EVENT_TYPES = {
    'signup_request', 'user_created', 'user_deleted', 'passkey_added', 'passkey_removed',
}
AUDIT_EVENT_TYPES = {
    'audit_due', 'audit_overdue', 'audit_completed', 'audit_completed_issues', 'audit_canceled',
}
ACTIVITY_EVENT_TYPES = {
    'activity_create', 'activity_update', 'activity_delete', 'activity_transact',
}
MARKET_EVENT_TYPES = {'price_change'}
ASSET_EVENT_TYPES = {
    'asset_value_gain', 'asset_value_loss', 'capacity_warning', 'new_acquisition', 'insurance_expiry',
}

# Where thresholds / schedules are configured (user prefs = enable + channels only).
EVENT_CONFIG_SCOPE = {
    'price_change': 'instrument',
    'asset_value_gain': 'holding',
    'asset_value_loss': 'holding',
    'capacity_warning': 'vault',
    'audit_due': 'vault',
    'audit_overdue': 'vault',
}

USER_CHANNEL_ONLY_EVENTS = set(EVENT_CONFIG_SCOPE.keys())