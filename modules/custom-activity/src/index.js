// modules/custom-activity/src/index.js
import Postmonger from 'postmonger';

const connection = new Postmonger.Session();
let activity = null;
let isHydrating = false;
let formState = {
  campaignName: '',
  senderName: '',
  messageTemplate: 'promo',
  messageBody: '',
  mediaUrl: '',
  buttonLabel: '',
  sendType: 'immediate',
  sendSchedule: '',
};

const $ = (id) => document.getElementById(id);

const requiredFields = ['campaignName', 'messageBody'];
const liveFields = [
  'campaignName',
  'senderName',
  'messageTemplate',
  'messageBody',
  'mediaUrl',
  'buttonLabel',
  'sendType',
  'sendSchedule'
];
const previewDefaults = {
  templateLabel: 'Seasonal promotion',
  campaignName: 'Campaign preview',
  senderName: 'Acme Retail',
  messageBody: 'Hey there! Craft your message to see the preview update in real time.',
};

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
  updatePreviewMedia(values.mediaUrl);
  updatePreviewButton(values.buttonLabel);
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

  handleInputChange();
  enableDone(false);
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
  ];

  if (values.sendType === 'schedule' && values.sendSchedule) {
    entries.push(['sendSchedule', values.sendSchedule]);
  }

  return entries
    .filter(([, value]) => value)
    .map(([key, value]) => ({ [key]: value }));
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

  connection.trigger('updateActivity', updated);
  connection.trigger('setActivityDirtyState', false);
  connection.trigger('requestInspectorClose');
}

function init() {
  wireUI();
  connection.on('initActivity', onInitActivity);
  connection.trigger('ready');
  connection.trigger('requestSchema');
  connection.trigger('requestedInteraction');
}

document.addEventListener('DOMContentLoaded', init);
