// modules/custom-activity/src/index.js
import Postmonger from 'postmonger';

const connection = new Postmonger.Session();
let activity = null;
let isHydrating = false;
const defaultMessageBody = 'Hey {{Contact.Attribute.DE.FirstName}}, surprise! Enjoy 60% off on your next purchase with code WELCOME60.';
const defaultMediaUrl = 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b';
const defaultButtonLabel = 'Shop Now';
const defaultRecipientTo = '{{Contact.Attribute.DE.Mobile}}';
const defaultSendTiming = 'Sending immediately';

let formState = {
  campaignName: 'Adidas India – Welcome Offer',
  senderName: 'Adidas India',
  messageTemplate: 'promo',
  messageBody: defaultMessageBody,
  mediaUrl: defaultMediaUrl,
  buttonLabel: defaultButtonLabel,
  sendType: 'immediate',
  sendSchedule: '',
  recipientTo: defaultRecipientTo,
};

const $ = (id) => document.getElementById(id);

const requiredFields = ['campaignName', 'messageBody', 'recipientTo'];
const liveFields = [
  'campaignName',
  'senderName',
  'messageTemplate',
  'messageBody',
  'mediaUrl',
  'buttonLabel',
  'sendType',
  'sendSchedule',
  'recipientTo'
];
const previewDefaults = {
  templateLabel: 'Seasonal promotion',
  campaignName: 'Adidas India – Welcome Offer',
  senderName: 'Adidas India',
  messageBody: defaultMessageBody,
  sendTiming: defaultSendTiming,
};

let availableSchemaAttributes = [];
let recipientHydrated = false;

function enableDone(enabled) {
  $('done').disabled = !enabled;
}

function gatherFormValues() {
  const trim = (value = '') => value?.trim();

  return {
    campaignName: trim($('campaignName')?.value),
    senderName: trim($('senderName')?.value) || '',
    messageTemplate: $('messageTemplate')?.value || 'promo',
    messageBody: $('messageBody')?.value || '',
    mediaUrl: trim($('mediaUrl')?.value) || '',
    buttonLabel: trim($('buttonLabel')?.value) || '',
    sendType: $('sendType')?.value || 'immediate',
    sendSchedule: trim($('sendSchedule')?.value) || '',
    recipientTo: trim($('recipientTo')?.value) || '',
  };
}

function isValid(values = gatherFormValues()) {
  const hasRequired = requiredFields.every((field) => {
    const value = values[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });

  if (!hasRequired) return false;

  if (values.sendType === 'schedule' && !values.sendSchedule) {
    return false;
  }

  return true;
}

function updateScheduleVisibility(values = gatherFormValues()) {
  const shouldShow = values.sendType === 'schedule';
  const scheduleFields = $('scheduleFields');
  if (!scheduleFields) return;
  scheduleFields.classList.toggle('visible', shouldShow);
}

function updateMessageCounter(values = gatherFormValues()) {
  const counter = $('messageCounter');
  if (!counter) return;
  const length = values.messageBody.length;
  counter.textContent = `${length} / 1024 characters`;
}

function getSelectedTemplateLabel(select) {
  if (!select) return previewDefaults.templateLabel;

  const { options, selectedIndex } = select;
  if (typeof selectedIndex === 'number' && selectedIndex >= 0) {
    const option = options[selectedIndex];
    if (option?.text) return option.text;
  }

  // Fallback if the value was hydrated programmatically and the select
  // element has not yet updated its selectedIndex.
  const selectedOption = Array.from(options || []).find((option) => option.value === select.value);
  return selectedOption?.text || previewDefaults.templateLabel;
}

const personalizationTokenPattern = /({{\s*[^{}]+\s*}})/g;

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPreviewText(value, { multiline = false } = {}) {
  const escaped = escapeHtml(value);
  const withLineBreaks = multiline
    ? escaped.replace(/\r?\n/g, '<br />')
    : escaped;

  return withLineBreaks.replace(
    personalizationTokenPattern,
    '<span class="preview-token">$1</span>'
  );
}

function hasContent(value) {
  if (typeof value === 'string') return value.length > 0;
  return Boolean(value);
}

function setPreviewText(id, value, fallback, options = {}) {
  const node = $(id);
  if (!node) return;
  const source = hasContent(value) ? value : fallback;
  node.innerHTML = formatPreviewText(source || '', options);
}

function updatePreviewMedia(url) {
  const previewMedia = $('previewMedia');
  const previewMediaImage = $('previewMediaImage');
  if (!previewMedia || !previewMediaImage) return;

  if (url) {
    previewMedia.classList.add('visible');
    previewMediaImage.src = url;
  } else {
    previewMedia.classList.remove('visible');
    previewMediaImage.removeAttribute('src');
  }
}

function updatePreviewButton(label) {
  const previewButton = $('previewButton');
  const previewButtonText = $('previewButtonText');
  if (!previewButton || !previewButtonText) return;

  if (label) {
    previewButton.hidden = false;
    previewButtonText.innerHTML = formatPreviewText(label);
  } else {
    previewButton.hidden = true;
    previewButtonText.textContent = '';
  }
}

function updatePreview(values = formState) {
  const templateSelect = $('messageTemplate');
  const templateLabel = getSelectedTemplateLabel(templateSelect);

  setPreviewText('previewTemplateLabel', templateLabel, previewDefaults.templateLabel);
  setPreviewText('previewCampaign', values.campaignName, previewDefaults.campaignName);
  setPreviewText('previewSender', values.senderName, previewDefaults.senderName);
  setPreviewText('previewMessage', values.messageBody, previewDefaults.messageBody, { multiline: true });
  updateSendTimingPreview(values);
  updatePreviewMedia(values.mediaUrl);
  updatePreviewButton(values.buttonLabel);
}

function updateSendTimingPreview(values) {
  const node = $('previewSendTiming');
  if (!node) return;

  const label = formatSendTiming(values);
  node.textContent = label || previewDefaults.sendTiming;
}

function formatSendTiming(values) {
  if (values.sendType === 'schedule') {
    if (!values.sendSchedule) {
      return 'Scheduled send (date required)';
    }

    const schedule = values.sendSchedule;
    if (schedule.includes('{{')) {
      return `Scheduled: ${schedule}`;
    }

    const date = new Date(schedule);
    if (!Number.isNaN(date.getTime())) {
      try {
        return `Scheduled: ${date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      } catch (err) {
        // Ignore locale issues and fall through to raw value
      }
    }

    return `Scheduled: ${schedule}`;
  }

  return defaultSendTiming;
}

function handleInputChange() {
  const values = gatherFormValues();
  formState = { ...values };
  updateScheduleVisibility(values);
  updateMessageCounter(values);
  updatePreview(values);
  enableDone(isValid(values));
  if (!isHydrating) {
    connection.trigger('setActivityDirtyState', true);
  }
}

function wireUI() {
  liveFields.forEach((id) => {
    const node = $(id);
    if (!node) return;

    const eventName = node.tagName === 'SELECT' || node.type === 'datetime-local' ? 'change' : 'input';
    node.addEventListener(eventName, handleInputChange);
  });

  $('cancel')?.addEventListener('click', () => {
    connection.trigger('setActivityDirtyState', false);
    connection.trigger('requestInspectorClose');
  });

  $('done')?.addEventListener('click', onDone);
}

function hydrateField(id, value) {
  const element = $(id);
  if (!element) return;
  if (element.tagName === 'SELECT') {
    element.value = value || element.options[0]?.value;
  } else {
    element.value = value || '';
  }

  if (id === 'recipientTo') {
    recipientHydrated = Boolean(value);
  }
}

function onInitActivity(data) {
  activity = data || {};
  const inArgs = (activity?.arguments?.execute?.inArguments || []).reduce((acc, obj) => Object.assign(acc, obj), {});

  isHydrating = true;
  hydrateField('campaignName', inArgs.campaignName);
  hydrateField('senderName', inArgs.senderName);
  hydrateField('messageTemplate', inArgs.messageTemplate);
  hydrateField('messageBody', inArgs.messageBody);
  hydrateField('mediaUrl', inArgs.mediaUrl);
  hydrateField('buttonLabel', inArgs.buttonLabel);
  hydrateField('sendType', inArgs.sendType || 'immediate');
  hydrateField('sendSchedule', inArgs.sendSchedule);
  hydrateField('recipientTo', inArgs.recipientTo || inArgs.mobile || inArgs.to);

  handleInputChange();
  const hydratedValid = isValid(formState);
  const hasInArgs = Object.keys(inArgs || {}).length > 0;
  const storedValid = hasInArgs ? isValid(inArgs) : false;
  const shouldEnableDone = hydratedValid || (activity?.metaData?.isConfigured && storedValid);
  enableDone(shouldEnableDone);
  isHydrating = false;
}

function buildInArguments(values) {
  const entries = [
    ['campaignName', values.campaignName],
    ['senderName', values.senderName],
    ['messageTemplate', values.messageTemplate],
    ['messageBody', values.messageBody],
    ['mediaUrl', values.mediaUrl],
    ['buttonLabel', values.buttonLabel],
    ['sendType', values.sendType],
    ['recipientTo', values.recipientTo],
  ];

  if (values.sendType === 'schedule' && values.sendSchedule) {
    entries.push(['sendSchedule', values.sendSchedule]);
  }

  return entries
    .filter(([, value]) => value)
    .map(([key, value]) => ({ [key]: value }));
}

function onRequestedSchema(payload) {
  availableSchemaAttributes = normalizeSchemaAttributes(payload?.schema);
  populateRecipientOptions();
  ensureRecipientDefault();
}

function normalizeSchemaAttributes(schema = []) {
  return (schema || [])
    .map((attribute) => ({
      key: attribute?.key,
      name: attribute?.name || attribute?.key?.split('.')?.slice(-1)?.[0],
      type: attribute?.type || '',
    }))
    .filter((attribute) => Boolean(attribute.key));
}

function populateRecipientOptions() {
  const datalist = $('recipientOptions');
  if (!datalist) return;

  datalist.innerHTML = '';

  availableSchemaAttributes.forEach((attribute) => {
    const option = document.createElement('option');
    option.value = formatAttributeToken(attribute.key);
    option.textContent = attribute.name
      ? `${attribute.name} · ${option.value}`
      : option.value;
    datalist.appendChild(option);
  });
}

function ensureRecipientDefault() {
  if (recipientHydrated) return;

  const candidate = findPhoneLikeAttributeToken();
  if (!candidate) return;

  const current = $('recipientTo')?.value;
  if (current) {
    recipientHydrated = true;
    return;
  }

  isHydrating = true;
  hydrateField('recipientTo', candidate);
  handleInputChange();
  isHydrating = false;
}

function findPhoneLikeAttributeToken() {
  if (!availableSchemaAttributes?.length) return defaultRecipientTo;

  const phoneAttribute = availableSchemaAttributes.find((attribute) => isPhoneLike(attribute));
  const fallback = phoneAttribute || availableSchemaAttributes[0];

  return fallback ? formatAttributeToken(fallback.key) : defaultRecipientTo;
}

function isPhoneLike(attribute = {}) {
  const type = (attribute.type || '').toLowerCase();
  if (type.includes('phone') || type.includes('tel')) return true;

  const haystack = `${attribute.key || ''} ${attribute.name || ''}`.toLowerCase();
  return haystack.includes('phone') || haystack.includes('mobile') || haystack.includes('whatsapp');
}

function formatAttributeToken(key) {
  if (!key) return '';
  return key.startsWith('{{') ? key : `{{${key}}}`;
}

function onDone() {
  const values = { ...formState };
  if (!isValid(values)) {
    enableDone(false);
    return;
  }

  const updated = {
    ...activity,
    arguments: {
      ...activity?.arguments,
      execute: {
        ...activity?.arguments?.execute,
        inArguments: buildInArguments(values),
        outArguments: [],
      },
    },
    configurationArguments: {
      ...activity?.configurationArguments,
    },
    metaData: {
      ...activity?.metaData,
      isConfigured: true,
    },
  };

  // Show success message
  const statusElement = document.createElement('div');
  statusElement.className = 'status-message success';
  statusElement.innerHTML = `
    <div class="icon">✓</div>
    <div class="message">Configuration saved successfully!</div>
  `;
  document.body.appendChild(statusElement);

  // Remove status message after 3 seconds
  setTimeout(() => {
    statusElement.remove();
  }, 3000);

  connection.trigger('updateActivity', updated);
  connection.trigger('setActivityDirtyState', false);
  connection.trigger('requestInspectorClose');
}

function init() {
  wireUI();
  connection.on('initActivity', onInitActivity);
  connection.on('requestedSchema', onRequestedSchema);
  connection.trigger('ready');
  connection.trigger('requestSchema');
  connection.trigger('requestInteraction');
}

document.addEventListener('DOMContentLoaded', init);
