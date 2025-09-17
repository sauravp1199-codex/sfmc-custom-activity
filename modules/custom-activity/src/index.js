// modules/custom-activity/src/index.js
import Postmonger from 'postmonger';

const connection = new Postmonger.Session();
let activity = null;

const $ = (id) => document.getElementById(id);

const requiredFields = ['campaignName', 'messageBody'];
const liveFields = ['campaignName', 'senderName', 'messageTemplate', 'messageBody', 'mediaUrl', 'buttonLabel', 'sendType', 'sendSchedule'];

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

function updatePreview(values = gatherFormValues()) {
  const templateSelect = $('messageTemplate');
  const selectedTemplateText = templateSelect?.options[templateSelect.selectedIndex]?.text || 'Seasonal promotion';

  const campaignLabel = values.campaignName || 'Campaign preview';
  const senderLabel = values.senderName || 'Acme Retail';
  const messageText = values.messageBody || 'Hey there! Craft your message to see the preview update in real time.';
  const mediaUrl = values.mediaUrl;
  const buttonLabel = values.buttonLabel;

  const previewTemplateLabel = $('previewTemplateLabel');
  const previewCampaign = $('previewCampaign');
  const previewSender = $('previewSender');
  const previewMessage = $('previewMessage');
  const previewMedia = $('previewMedia');
  const previewMediaImage = $('previewMediaImage');
  const previewButton = $('previewButton');
  const previewButtonText = $('previewButtonText');

  if (previewTemplateLabel) previewTemplateLabel.textContent = selectedTemplateText;
  if (previewCampaign) previewCampaign.textContent = campaignLabel;
  if (previewSender) previewSender.textContent = senderLabel;
  if (previewMessage) previewMessage.textContent = messageText;

  if (previewMedia && previewMediaImage) {
    if (mediaUrl) {
      previewMedia.classList.add('visible');
      previewMediaImage.src = mediaUrl;
    } else {
      previewMedia.classList.remove('visible');
      previewMediaImage.src = '';
    }
  }

  if (previewButton && previewButtonText) {
    if (buttonLabel) {
      previewButton.hidden = false;
      previewButtonText.textContent = buttonLabel;
    } else {
      previewButton.hidden = true;
    }
  }
}

function handleInputChange() {
  const values = gatherFormValues();
  updateScheduleVisibility(values);
  updateMessageCounter(values);
  updatePreview(values);
  enableDone(isValid(values));
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
  const values = gatherFormValues();
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
