// modules/custom-activity/config/config-json.js
module.exports = function configJSON(req) {
  const base = `https://${req.headers.host}`;
  return {
    workflowApiVersion: '1.1',
    type: 'REST',
    metaData: {
      icon: `images/icon.svg`,
      category: 'customer'
    },
    lang: {
      'en-US': {
        name: 'Custom Activity',
        description: 'Minimal REST activity template.'
      }
    },
    arguments: {
      execute: {
        inArguments: [
          // Provide defaults; real values are set in the UI or data bindings
          { discount: 10 }
        ],
        outArguments: [],
        url: `${base}/modules/custom-activity/execute`,
        timeout: 10000,
        retryCount: 3,
        retryDelay: 1000
      }
    },
    configurationArguments: {
      save: { url: `${base}/modules/custom-activity/save` },
      publish: { url: `${base}/modules/custom-activity/publish` },
      validate: { url: `${base}/modules/custom-activity/validate` },
      stop: { url: `${base}/modules/custom-activity/stop` }
    },
    userInterfaces: {
      configInspector: {
        size: 'scm-lg' // inspector size
      }
    },
    schema: {
      arguments: {
        execute: {
          inArguments: [
            { discount: { dataType: 'Number', direction: 'in' } },
            { email: { dataType: 'Text', direction: 'in' } },
            { mobile: { dataType: 'Text', direction: 'in' } }
          ],
          outArguments: [
            { discountCode: { dataType: 'Text', direction: 'out', access: 'visible' } },
            { discount: { dataType: 'Number', direction: 'out', access: 'visible' } }
          ]
        }
      }
    }
  };
};
