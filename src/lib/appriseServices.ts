export type AppriseCategory =
  | 'chat'
  | 'push'
  | 'email'
  | 'home'
  | 'sms'
  | 'custom'

export const APPRISE_CATEGORY_LABELS: Record<AppriseCategory, string> = {
  chat: 'Chat & Collaboration',
  push: 'Push Notifications',
  email: 'Email',
  home: 'Home & Automation',
  sms: 'SMS',
  custom: 'Custom & Other',
}

export type AppriseFieldType = 'text' | 'password' | 'number' | 'select' | 'checkbox'

export interface AppriseServiceField {
  key: string
  label: string
  type: AppriseFieldType
  required?: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
  defaultValue?: string
}

export interface AppriseServiceDefinition {
  id: string
  name: string
  category: AppriseCategory
  scheme: string
  example: string
  docUrl: string
  fields: AppriseServiceField[]
  build: (values: Record<string, string>) => string | null
  /** Cross-field validation; runs before build. Return an error message or null. */
  validate?: (values: Record<string, string>) => string | null
}

function trim(v: string | undefined): string {
  return (v ?? '').trim()
}

function enc(v: string): string {
  return encodeURIComponent(trim(v))
}

function tlsField(defaultTls = false): AppriseServiceField {
  return {
    key: 'use_tls',
    label: 'Use TLS (HTTPS)',
    type: 'checkbox',
    defaultValue: defaultTls ? 'true' : 'false',
    help: 'Use the secure variant of this service URL when supported.',
  }
}

function parseDiscordWebhook(url: string): { webhookId: string; webhookToken: string } | null {
  const match = trim(url).match(/webhooks\/(\d+)\/([^/?#]+)/i)
  if (!match) return null
  return { webhookId: match[1], webhookToken: match[2] }
}

function requiredFields(
  fields: AppriseServiceField[],
  values: Record<string, string>
): string | null {
  for (const field of fields) {
    if (field.type === 'checkbox') continue
    if (field.required !== false && !trim(values[field.key])) {
      return `${field.label} is required`
    }
  }
  return null
}

export const APPRISE_SERVICES: AppriseServiceDefinition[] = [
  {
    id: 'discord',
    name: 'Discord',
    category: 'chat',
    scheme: 'discord',
    example: 'discord://WebhookID/WebhookToken',
    docUrl: 'https://appriseit.com/services/discord/',
    fields: [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'text',
        required: false,
        placeholder: 'https://discord.com/api/webhooks/…',
        help: 'Paste a full webhook URL, or enter Webhook ID and Token below.',
      },
      {
        key: 'webhook_id',
        label: 'Webhook ID',
        type: 'text',
        required: false,
        help: 'Required if not using a webhook URL above.',
      },
      {
        key: 'webhook_token',
        label: 'Webhook Token',
        type: 'password',
        required: false,
        help: 'Required if not using a webhook URL above.',
      },
      {
        key: 'botname',
        label: 'Bot name',
        type: 'text',
        required: false,
        placeholder: 'Optional display name',
      },
    ],
    validate(values) {
      const pasted = parseDiscordWebhook(values.webhook_url)
      const webhookId = pasted?.webhookId ?? trim(values.webhook_id)
      const webhookToken = pasted?.webhookToken ?? trim(values.webhook_token)
      if (webhookId && webhookToken) return null
      if (trim(values.webhook_url)) {
        return 'Could not parse webhook URL — check the format or enter Webhook ID and Token manually.'
      }
      return 'Provide a webhook URL or both Webhook ID and Webhook Token.'
    },
    build(values) {
      const pastedUrl = trim(values.webhook_url)
      const pasted = parseDiscordWebhook(pastedUrl)
      const webhookId = pasted?.webhookId ?? trim(values.webhook_id)
      const webhookToken = pasted?.webhookToken ?? trim(values.webhook_token)
      if (!webhookId || !webhookToken) return null
      const bot = trim(values.botname)
      if (pasted && /^https?:\/\//i.test(pastedUrl) && !bot) return pastedUrl
      return bot
        ? `discord://${enc(bot)}@${webhookId}/${webhookToken}`
        : `discord://${webhookId}/${webhookToken}`
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'chat',
    scheme: 'slack',
    example: 'slack://TokenA/TokenB/TokenC/Channel',
    docUrl: 'https://appriseit.com/services/slack/',
    fields: [
      { key: 'token_a', label: 'Token A', type: 'password', required: true },
      { key: 'token_b', label: 'Token B', type: 'password', required: true },
      { key: 'token_c', label: 'Token C', type: 'password', required: true },
      { key: 'channel', label: 'Channel', type: 'text', placeholder: 'Optional #channel' },
      { key: 'botname', label: 'Bot name', type: 'text', placeholder: 'Optional' },
    ],
    build(values) {
      const a = trim(values.token_a)
      const b = trim(values.token_b)
      const c = trim(values.token_c)
      if (!a || !b || !c) return null
      const channel = trim(values.channel)
      const bot = trim(values.botname)
      const base = bot ? `slack://${enc(bot)}@${a}/${b}/${c}` : `slack://${a}/${b}/${c}`
      return channel ? `${base}/${enc(channel.replace(/^#/, ''))}` : `${base}/`
    },
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'chat',
    scheme: 'tgram',
    example: 'tgram://bottoken/ChatID',
    docUrl: 'https://appriseit.com/services/telegram/',
    fields: [
      { key: 'bot_token', label: 'Bot token', type: 'password', required: true },
      { key: 'chat_id', label: 'Chat ID', type: 'text', required: true, placeholder: 'e.g. 123456789' },
    ],
    build(values) {
      const token = trim(values.bot_token)
      const chatId = trim(values.chat_id)
      if (!token || !chatId) return null
      return `tgram://${token}/${chatId}`
    },
  },
  {
    id: 'googlechat',
    name: 'Google Chat',
    category: 'chat',
    scheme: 'gchat',
    example: 'gchat://workspace/key/token',
    docUrl: 'https://appriseit.com/services/googlechat/',
    fields: [
      { key: 'workspace', label: 'Workspace', type: 'text', required: true },
      { key: 'key', label: 'Key', type: 'password', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
    ],
    build(values) {
      const workspace = trim(values.workspace)
      const key = trim(values.key)
      const token = trim(values.token)
      if (!workspace || !key || !token) return null
      return `gchat://${workspace}/${key}/${token}`
    },
  },
  {
    id: 'mattermost',
    name: 'Mattermost',
    category: 'chat',
    scheme: 'mmost',
    example: 'mmost://hostname/authkey',
    docUrl: 'https://appriseit.com/services/mattermost/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'mattermost.example.com' },
      { key: 'auth_key', label: 'Auth key / token', type: 'password', required: true },
      { key: 'channel', label: 'Channel', type: 'text', placeholder: 'Optional channel name' },
      tlsField(true),
    ],
    build(values) {
      const host = trim(values.hostname)
      const key = trim(values.auth_key)
      if (!host || !key) return null
      const scheme = values.use_tls === 'true' ? 'mmosts' : 'mmost'
      const channel = trim(values.channel)
      const base = `${scheme}://${host}/${key}`
      return channel ? `${base}?channel=${enc(channel)}` : base
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    category: 'chat',
    scheme: 'matrix',
    example: 'matrixs://user:pass@hostname:443/#room',
    docUrl: 'https://appriseit.com/services/matrix/',
    fields: [
      { key: 'hostname', label: 'Homeserver', type: 'text', required: true },
      { key: 'user', label: 'User', type: 'text', required: true },
      { key: 'password', label: 'Password / token', type: 'password', required: true },
      { key: 'room', label: 'Room', type: 'text', required: true, placeholder: '#alias or !room_id' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '443' },
      tlsField(true),
    ],
    build(values) {
      const host = trim(values.hostname)
      const user = trim(values.user)
      const pass = trim(values.password)
      const room = trim(values.room)
      if (!host || !user || !pass || !room) return null
      const scheme = values.use_tls === 'true' ? 'matrixs' : 'matrix'
      const port = trim(values.port)
      const hostPart = port ? `${host}:${port}` : host
      const roomPath = room.startsWith('#') || room.startsWith('!') ? room : `#${room}`
      return `${scheme}://${enc(user)}:${enc(pass)}@${hostPart}/${roomPath}`
    },
  },
  {
    id: 'rocketchat',
    name: 'Rocket.Chat',
    category: 'chat',
    scheme: 'rocket',
    example: 'rocket://webhook@hostname',
    docUrl: 'https://appriseit.com/services/rocketchat/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true },
      { key: 'webhook', label: 'Incoming webhook token', type: 'password', required: true },
      { key: 'channel', label: 'Channel', type: 'text', placeholder: 'Optional #channel' },
      tlsField(true),
    ],
    build(values) {
      const host = trim(values.hostname)
      const webhook = trim(values.webhook)
      if (!host || !webhook) return null
      const scheme = values.use_tls === 'true' ? 'rockets' : 'rocket'
      const channel = trim(values.channel)
      const base = `${scheme}://${enc(webhook)}@${host}`
      return channel ? `${base}/#${enc(channel.replace(/^#/, ''))}` : base
    },
  },
  {
    id: 'msteams',
    name: 'Microsoft Teams (Workflows)',
    category: 'chat',
    scheme: 'workflows',
    example: 'workflows://WorkflowID/Signature',
    docUrl: 'https://appriseit.com/services/workflows/',
    fields: [
      { key: 'workflow_id', label: 'Workflow ID', type: 'text', required: true },
      { key: 'signature', label: 'Signature', type: 'password', required: true },
    ],
    build(values) {
      const id = trim(values.workflow_id)
      const sig = trim(values.signature)
      if (!id || !sig) return null
      return `workflows://${id}/${sig}/`
    },
  },
  {
    id: 'webex',
    name: 'Webex Teams',
    category: 'chat',
    scheme: 'wxteams',
    example: 'wxteams://Token',
    docUrl: 'https://appriseit.com/services/wxteams/',
    fields: [{ key: 'token', label: 'Bot token', type: 'password', required: true }],
    build(values) {
      const token = trim(values.token)
      if (!token) return null
      return `wxteams://${token}`
    },
  },
  {
    id: 'guilded',
    name: 'Guilded',
    category: 'chat',
    scheme: 'guilded',
    example: 'guilded://webhook_id/webhook_token',
    docUrl: 'https://appriseit.com/services/guilded/',
    fields: [
      { key: 'webhook_id', label: 'Webhook ID', type: 'text', required: true },
      { key: 'webhook_token', label: 'Webhook Token', type: 'password', required: true },
    ],
    build(values) {
      const id = trim(values.webhook_id)
      const token = trim(values.webhook_token)
      if (!id || !token) return null
      return `guilded://${id}/${token}`
    },
  },
  {
    id: 'revolt',
    name: 'Revolt',
    category: 'chat',
    scheme: 'revolt',
    example: 'revolt://bottoken/ChannelID',
    docUrl: 'https://appriseit.com/services/revolt/',
    fields: [
      { key: 'bot_token', label: 'Bot token', type: 'password', required: true },
      { key: 'channel_id', label: 'Channel ID', type: 'text', required: true },
    ],
    build(values) {
      const token = trim(values.bot_token)
      const channel = trim(values.channel_id)
      if (!token || !channel) return null
      return `revolt://${token}/${channel}`
    },
  },
  {
    id: 'synology',
    name: 'Synology Chat',
    category: 'chat',
    scheme: 'synology',
    example: 'synology://hostname/token',
    docUrl: 'https://appriseit.com/services/synology_chat/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '5001' },
      tlsField(true),
    ],
    build(values) {
      const host = trim(values.hostname)
      const token = trim(values.token)
      if (!host || !token) return null
      const scheme = values.use_tls === 'true' ? 'synologys' : 'synology'
      const port = trim(values.port)
      const hostPart = port ? `${host}:${port}` : host
      return `${scheme}://${hostPart}/${token}`
    },
  },
  {
    id: 'feishu',
    name: 'Feishu / Lark',
    category: 'chat',
    scheme: 'feishu',
    example: 'feishu://token',
    docUrl: 'https://appriseit.com/services/feishu/',
    fields: [{ key: 'token', label: 'Webhook token', type: 'password', required: true }],
    build(values) {
      const token = trim(values.token)
      if (!token) return null
      return `feishu://${token}`
    },
  },
  {
    id: 'wecombot',
    name: 'WeCom Bot',
    category: 'chat',
    scheme: 'wecombot',
    example: 'wecombot://BotKey',
    docUrl: 'https://appriseit.com/services/wecombot/',
    fields: [{ key: 'bot_key', label: 'Bot key', type: 'password', required: true }],
    build(values) {
      const key = trim(values.bot_key)
      if (!key) return null
      return `wecombot://${key}`
    },
  },
  {
    id: 'pushover',
    name: 'Pushover',
    category: 'push',
    scheme: 'pover',
    example: 'pover://user@token/DEVICE',
    docUrl: 'https://appriseit.com/services/pushover/',
    fields: [
      { key: 'user_key', label: 'User key', type: 'password', required: true },
      { key: 'api_token', label: 'API token', type: 'password', required: true },
      { key: 'device', label: 'Device', type: 'text', placeholder: 'Optional device name' },
    ],
    build(values) {
      const user = trim(values.user_key)
      const token = trim(values.api_token)
      if (!user || !token) return null
      const device = trim(values.device)
      return device ? `pover://${user}@${token}/${device}` : `pover://${user}@${token}`
    },
  },
  {
    id: 'pushbullet',
    name: 'Pushbullet',
    category: 'push',
    scheme: 'pbul',
    example: 'pbul://accesstoken',
    docUrl: 'https://appriseit.com/services/pushbullet/',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password', required: true },
      { key: 'target', label: 'Target', type: 'text', placeholder: 'Optional #channel, device id, or email' },
    ],
    build(values) {
      const token = trim(values.access_token)
      if (!token) return null
      const target = trim(values.target)
      return target ? `pbul://${token}/${target}` : `pbul://${token}`
    },
  },
  {
    id: 'gotify',
    name: 'Gotify',
    category: 'push',
    scheme: 'gotify',
    example: 'gotify://hostname/token',
    docUrl: 'https://appriseit.com/services/gotify/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'gotify.example.com' },
      { key: 'token', label: 'Application token', type: 'password', required: true },
      tlsField(false),
    ],
    build(values) {
      const host = trim(values.hostname)
      const token = trim(values.token)
      if (!host || !token) return null
      const scheme = values.use_tls === 'true' ? 'gotifys' : 'gotify'
      return `${scheme}://${host}/${token}`
    },
  },
  {
    id: 'ntfy',
    name: 'ntfy',
    category: 'push',
    scheme: 'ntfy',
    example: 'ntfy://topic',
    docUrl: 'https://appriseit.com/services/ntfy/',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', required: true },
      { key: 'server', label: 'Server host', type: 'text', placeholder: 'Optional — defaults to ntfy.sh' },
      tlsField(true),
    ],
    build(values) {
      const topic = trim(values.topic)
      if (!topic) return null
      const scheme = values.use_tls === 'true' ? 'ntfys' : 'ntfy'
      const server = trim(values.server)
      return server ? `${scheme}://${server}/${topic}/` : `${scheme}://${topic}/`
    },
  },
  {
    id: 'bark',
    name: 'Bark',
    category: 'push',
    scheme: 'bark',
    example: 'bark://hostname/device_key',
    docUrl: 'https://appriseit.com/services/bark/',
    fields: [
      { key: 'hostname', label: 'Server', type: 'text', placeholder: 'Optional — defaults to api.day.app' },
      { key: 'device_key', label: 'Device key', type: 'password', required: true },
      tlsField(true),
    ],
    build(values) {
      const key = trim(values.device_key)
      if (!key) return null
      const scheme = values.use_tls === 'true' ? 'barks' : 'bark'
      const host = trim(values.hostname)
      return host ? `${scheme}://${host}/${key}` : `${scheme}://${key}`
    },
  },
  {
    id: 'join',
    name: 'Join',
    category: 'push',
    scheme: 'join',
    example: 'join://apikey/device',
    docUrl: 'https://appriseit.com/services/join/',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', required: true },
      {
        key: 'target_type',
        label: 'Target type',
        type: 'select',
        required: true,
        defaultValue: 'device',
        options: [
          { value: 'device', label: 'Device' },
          { value: 'group', label: 'Group' },
        ],
      },
      { key: 'target', label: 'Device or group ID', type: 'text', required: true },
    ],
    build(values) {
      const apiKey = trim(values.api_key)
      const target = trim(values.target)
      const type = values.target_type || 'device'
      if (!apiKey || !target) return null
      return `join://${apiKey}/${type}/${target}`
    },
  },
  {
    id: 'prowl',
    name: 'Prowl',
    category: 'push',
    scheme: 'prowl',
    example: 'prowl://apikey',
    docUrl: 'https://appriseit.com/services/prowl/',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', required: true },
      { key: 'provider_key', label: 'Provider key', type: 'password', placeholder: 'Optional' },
    ],
    build(values) {
      const apiKey = trim(values.api_key)
      if (!apiKey) return null
      const provider = trim(values.provider_key)
      return provider ? `prowl://${apiKey}/${provider}` : `prowl://${apiKey}`
    },
  },
  {
    id: 'pushsafer',
    name: 'PushSafer',
    category: 'push',
    scheme: 'psafer',
    example: 'psafer://privatekey/DEVICE',
    docUrl: 'https://appriseit.com/services/pushsafer/',
    fields: [
      { key: 'private_key', label: 'Private key', type: 'password', required: true },
      { key: 'device', label: 'Device ID', type: 'text', placeholder: 'Optional' },
      tlsField(true),
    ],
    build(values) {
      const key = trim(values.private_key)
      if (!key) return null
      const scheme = values.use_tls === 'true' ? 'psafers' : 'psafer'
      const device = trim(values.device)
      return device ? `${scheme}://${key}/${device}` : `${scheme}://${key}`
    },
  },
  {
    id: 'apprise_api',
    name: 'Apprise API',
    category: 'home',
    scheme: 'apprise',
    example: 'apprise://hostname/Token',
    docUrl: 'https://appriseit.com/services/apprise_api/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
      tlsField(true),
    ],
    build(values) {
      const host = trim(values.hostname)
      const token = trim(values.token)
      if (!host || !token) return null
      const scheme = values.use_tls === 'true' ? 'apprises' : 'apprise'
      return `${scheme}://${host}/${token}`
    },
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant',
    category: 'home',
    scheme: 'hassio',
    example: 'hassio://hostname/accesstoken',
    docUrl: 'https://appriseit.com/services/homeassistant/',
    fields: [
      { key: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'homeassistant.local:8123' },
      { key: 'access_token', label: 'Long-lived access token', type: 'password', required: true },
      { key: 'path', label: 'Path prefix', type: 'text', placeholder: 'Optional' },
      tlsField(false),
    ],
    build(values) {
      const host = trim(values.hostname)
      const token = trim(values.access_token)
      if (!host || !token) return null
      const scheme = values.use_tls === 'true' ? 'hassios' : 'hassio'
      const path = trim(values.path)
      return path ? `${scheme}://${host}/${path}/${token}` : `${scheme}://${host}/${token}`
    },
  },
  {
    id: 'ifttt',
    name: 'IFTTT Webhooks',
    category: 'home',
    scheme: 'ifttt',
    example: 'ifttt://webhooksID/Event',
    docUrl: 'https://appriseit.com/services/ifttt/',
    fields: [
      { key: 'webhooks_id', label: 'Webhooks key', type: 'password', required: true },
      { key: 'event', label: 'Event name', type: 'text', required: true },
    ],
    build(values) {
      const id = trim(values.webhooks_id)
      const event = trim(values.event)
      if (!id || !event) return null
      return `ifttt://${id}/${event}`
    },
  },
  {
    id: 'mqtt',
    name: 'MQTT',
    category: 'home',
    scheme: 'mqtt',
    example: 'mqtt://hostname/topic',
    docUrl: 'https://appriseit.com/services/mqtt/',
    fields: [
      { key: 'hostname', label: 'Broker hostname', type: 'text', required: true },
      { key: 'topic', label: 'Topic', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Optional' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Optional' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '1883' },
      tlsField(false),
    ],
    build(values) {
      const host = trim(values.hostname)
      const topic = trim(values.topic)
      if (!host || !topic) return null
      const scheme = values.use_tls === 'true' ? 'mqtts' : 'mqtt'
      const port = trim(values.port)
      const user = trim(values.username)
      const pass = trim(values.password)
      let authority = host
      if (port) authority = `${host}:${port}`
      if (user && pass) authority = `${enc(user)}:${enc(pass)}@${authority}`
      else if (user) authority = `${enc(user)}@${authority}`
      return `${scheme}://${authority}/${topic}`
    },
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    category: 'email',
    scheme: 'mailgun',
    example: 'mailgun://user@hostname/apikey/email',
    docUrl: 'https://appriseit.com/services/mailgun/',
    fields: [
      { key: 'user', label: 'SMTP login user', type: 'text', required: true },
      { key: 'hostname', label: 'Mailgun domain', type: 'text', required: true },
      { key: 'api_key', label: 'API key', type: 'password', required: true },
      { key: 'to_email', label: 'To email', type: 'text', required: true },
    ],
    build(values) {
      const user = trim(values.user)
      const host = trim(values.hostname)
      const key = trim(values.api_key)
      const to = trim(values.to_email)
      if (!user || !host || !key || !to) return null
      return `mailgun://${enc(user)}@${host}/${key}/${to}`
    },
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    scheme: 'sendgrid',
    example: 'sendgrid://APIToken:FromEmail/ToEmail',
    docUrl: 'https://appriseit.com/services/sendgrid/',
    fields: [
      { key: 'api_token', label: 'API token', type: 'password', required: true },
      { key: 'from_email', label: 'From email', type: 'text', required: true },
      { key: 'to_email', label: 'To email', type: 'text', required: true },
    ],
    build(values) {
      const token = trim(values.api_token)
      const from = trim(values.from_email)
      const to = trim(values.to_email)
      if (!token || !from || !to) return null
      return `sendgrid://${token}:${from}/${to}`
    },
  },
  {
    id: 'smtp2go',
    name: 'SMTP2Go',
    category: 'email',
    scheme: 'smtp2go',
    example: 'smtp2go://user@hostname/apikey/email',
    docUrl: 'https://appriseit.com/services/smtp2go/',
    fields: [
      { key: 'user', label: 'User', type: 'text', required: true },
      { key: 'hostname', label: 'Hostname', type: 'text', required: true },
      { key: 'api_key', label: 'API key', type: 'password', required: true },
      { key: 'to_email', label: 'To email', type: 'text', required: true },
    ],
    build(values) {
      const user = trim(values.user)
      const host = trim(values.hostname)
      const key = trim(values.api_key)
      const to = trim(values.to_email)
      if (!user || !host || !key || !to) return null
      return `smtp2go://${enc(user)}@${host}/${key}/${to}`
    },
  },
  {
    id: 'opsgenie',
    name: 'Opsgenie',
    category: 'custom',
    scheme: 'opsgenie',
    example: 'opsgenie://APIKey',
    docUrl: 'https://appriseit.com/services/opsgenie/',
    fields: [{ key: 'api_key', label: 'API key', type: 'password', required: true }],
    build(values) {
      const key = trim(values.api_key)
      if (!key) return null
      return `opsgenie://${key}`
    },
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    category: 'custom',
    scheme: 'pagerduty',
    example: 'pagerduty://IntegrationKey@ApiKey',
    docUrl: 'https://appriseit.com/services/pagerduty/',
    fields: [
      { key: 'integration_key', label: 'Integration key', type: 'password', required: true },
      { key: 'api_key', label: 'API key', type: 'password', required: true },
    ],
    build(values) {
      const integration = trim(values.integration_key)
      const api = trim(values.api_key)
      if (!integration || !api) return null
      return `pagerduty://${integration}@${api}`
    },
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'sms',
    scheme: 'twilio',
    example: 'twilio://AccountSID:AuthToken@FromPhoneNo/ToPhoneNo',
    docUrl: 'https://appriseit.com/services/twilio/',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth token', type: 'password', required: true },
      { key: 'from_phone', label: 'From phone number', type: 'text', required: true },
      { key: 'to_phone', label: 'To phone number', type: 'text', required: true },
    ],
    build(values) {
      const sid = trim(values.account_sid)
      const token = trim(values.auth_token)
      const from = trim(values.from_phone)
      const to = trim(values.to_phone)
      if (!sid || !token || !from || !to) return null
      return `twilio://${sid}:${token}@${from}/${to}`
    },
  },
  {
    id: 'custom_url',
    name: 'Custom Apprise URL',
    category: 'custom',
    scheme: 'custom',
    example: 'service://credentials/target',
    docUrl: 'https://appriseit.com/services/',
    fields: [
      {
        key: 'url',
        label: 'Apprise URL',
        type: 'text',
        required: true,
        placeholder: 'e.g. discord://id/token or https://…',
        help: 'Paste any valid Apprise notification URL. See appriseit.com for all supported services.',
      },
    ],
    build(values) {
      const url = trim(values.url)
      return url || null
    },
  },
]

export function getAppriseService(id: string): AppriseServiceDefinition | undefined {
  return APPRISE_SERVICES.find((s) => s.id === id)
}

export function searchAppriseServices(query: string): AppriseServiceDefinition[] {
  const q = query.trim().toLowerCase()
  if (!q) return APPRISE_SERVICES
  return APPRISE_SERVICES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.scheme.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      APPRISE_CATEGORY_LABELS[s.category].toLowerCase().includes(q)
  )
}

export function defaultFieldValues(service: AppriseServiceDefinition): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of service.fields) {
    if (field.defaultValue != null) values[field.key] = field.defaultValue
    else if (field.type === 'checkbox') values[field.key] = 'false'
    else values[field.key] = ''
  }
  return values
}

export function buildAppriseUrl(
  service: AppriseServiceDefinition,
  values: Record<string, string>
): { url: string | null; error: string | null } {
  if (service.validate) {
    const customError = service.validate(values)
    if (customError) return { url: null, error: customError }
  } else {
    const validationError = requiredFields(service.fields, values)
    if (validationError) return { url: null, error: validationError }
  }
  try {
    const url = service.build(values)
    if (!url) return { url: null, error: 'Could not build URL — check required fields.' }
    return { url, error: null }
  } catch {
    return { url: null, error: 'Could not build URL from the provided values.' }
  }
}

export function servicesByCategory(
  services: AppriseServiceDefinition[]
): Record<AppriseCategory, AppriseServiceDefinition[]> {
  const grouped: Record<AppriseCategory, AppriseServiceDefinition[]> = {
    chat: [],
    push: [],
    email: [],
    home: [],
    sms: [],
    custom: [],
  }
  for (const service of services) grouped[service.category].push(service)
  return grouped
}