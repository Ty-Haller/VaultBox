"""VaultBox permission keys — customizable per Role."""

PERMISSIONS = {
    'view_sites': 'View sites',
    'edit_sites': 'Manage sites',
    'view_vaults': 'View vaults',
    'edit_vaults': 'Manage vaults',
    'view_inventory': 'View holdings / inventory',
    'edit_inventory': 'Create and edit holdings',
    'delete_inventory': 'Delete holdings',
    'view_secrets': 'View secrets vault',
    'manage_secrets': 'Manage secrets',
    'run_audits': 'Run and complete audits',
    'view_reports': 'View reports and analytics',
    'view_changelog': 'View activity log',
    'manage_users': 'Manage users and signup requests',
    'manage_roles': 'Manage groups and roles',
    'manage_admin': 'Manage admin configuration',
    'edit_market_alerts': 'Configure market price alert thresholds',
}

DEFAULT_ROLE_PERMISSIONS = {
    'full_admin': list(PERMISSIONS.keys()),
    'site_admin': [
        'view_sites', 'edit_sites', 'view_vaults', 'edit_vaults',
        'view_inventory', 'edit_inventory', 'delete_inventory',
        'view_secrets', 'manage_secrets', 'run_audits',
        'view_reports', 'view_changelog',
    ],
    'vault_admin': [
        'view_vaults', 'edit_vaults', 'view_inventory', 'edit_inventory',
        'delete_inventory', 'view_secrets', 'manage_secrets', 'run_audits',
        'view_reports', 'view_changelog',
    ],
    'viewer': [
        'view_sites', 'view_vaults', 'view_inventory', 'view_reports', 'view_changelog',
    ],
    'audit_reporting': [
        'view_sites', 'view_vaults', 'view_inventory',
        'run_audits', 'view_reports', 'view_changelog',
    ],
}

ROLE_RANK = {
    'viewer': 1,
    'audit_reporting': 2,
    'vault_admin': 3,
    'site_admin': 4,
    'full_admin': 5,
}