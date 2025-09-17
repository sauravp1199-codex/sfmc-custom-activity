// modules/custom-activity/src/index.js
import Postmonger from 'postmonger';

const connection = new Postmonger.Session();
let activity = null;

const $ = (id) => document.getElementById(id);

function enableDone(enabled) {
  $('done').disabled = !enabled;
}

function wireUI() {
  $('discount').addEventListener('change', () => enableDone(true));
  $('emailBinding').addEventListener('input', () => enableDone(true));
  $('mobileBinding').addEventListener('input', () => enableDone(true));

  $('cancel').addEventListener('click', () => {
    connection.trigger('setActivityDirtyState', false);
    connection.trigger('requestInspectorClose');
  });

  $('done').addEventListener('click', onDone);
}

function onInitActivity(data) {
  activity = data || {};
  // hydrate UI from existing payload (if any)
  const inArgs = (activity?.arguments?.execute?.inArguments || []).reduce((a, b) => Object.assign(a, b), {});
  if (inArgs.discount) $('discount').value = String(inArgs.discount);
  if (inArgs.email) $('emailBinding').value = inArgs.email;
  if (inArgs.mobile) $('mobileBinding').value = inArgs.mobile;

  enableDone(false);
}

function onDone() {
  const discount = Number($('discount').value);
  const email = $('emailBinding').value?.trim();
  const mobile = $('mobileBinding').value?.trim();

  const updated = {
    ...activity,
    arguments: {
      ...activity?.arguments,
      execute: {
        ...activity?.arguments?.execute,
        inArguments: [
          { discount },
          ...(email ? [{ email }] : []),
          ...(mobile ? [{ mobile }] : [])
        ],
        outArguments: []
      }
    },
    configurationArguments: {
      ...activity?.configurationArguments
    },
    metaData: {
      ...activity?.metaData,
      isConfigured: true
    }
  };

  connection.trigger('updateActivity', updated);
  connection.trigger('setActivityDirtyState', false);
  connection.trigger('requestInspectorClose');
}

function init() {
  wireUI();
  connection.on('initActivity', onInitActivity);
  connection.trigger('ready');
  connection.trigger('requestSchema');       // optional dev visibility
  connection.trigger('requestedInteraction'); // optional dev visibility
}

document.addEventListener('DOMContentLoaded', init);
