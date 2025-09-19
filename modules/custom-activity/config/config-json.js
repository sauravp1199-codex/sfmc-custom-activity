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
        name: 'WhatsApp Message Activity',
        description: 'Trigger personalised WhatsApp journeys with media and quick replies.'
      }
    },
    arguments: {
      execute: {
        inArguments: [
          {
            channel: 'WABA'
          },
          {
            campaignName: 'Adidas India – Welcome Offer'
          },
          {
            senderName: 'Adidas India'
          },
          {
            messageTemplate: 'promo'
          },
          {
            messageBody: 'Hey {{Contact.Attribute.DE.FirstName}}, surprise! Enjoy 60% off on your next purchase with code WELCOME60.'
          },
          {
            mediaUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b'
          },
          {
            buttonLabel: 'Shop Now'
          },
          {
            sendType: 'immediate'
          },
          {
            recipientTo: '919999999999'
          },
          {
            senderFrom: '919999999999'
          },
          {
            metadataVersion: 'v1.0.9'
          }
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
            { channel: { dataType: 'Text', direction: 'in' } },
            { campaignName: { dataType: 'Text', direction: 'in' } },
            { senderName: { dataType: 'Text', direction: 'in' } },
            { messageTemplate: { dataType: 'Text', direction: 'in' } },
            { messageBody: { dataType: 'Text', direction: 'in' } },
            { mediaUrl: { dataType: 'Text', direction: 'in' } },
            { buttonLabel: { dataType: 'Text', direction: 'in' } },
            { sendType: { dataType: 'Text', direction: 'in' } },
            { sendSchedule: { dataType: 'Text', direction: 'in' } },
            { contentType: { dataType: 'Text', direction: 'in' } },
            { previewUrl: { dataType: 'Boolean', direction: 'in' } },
            { recipientTo: { dataType: 'Text', direction: 'in' } },
            { recipientType: { dataType: 'Text', direction: 'in' } },
            { customerReference: { dataType: 'Text', direction: 'in' } },
            { messageTag1: { dataType: 'Text', direction: 'in' } },
            { conversationId: { dataType: 'Text', direction: 'in' } },
            { senderFrom: { dataType: 'Text', direction: 'in' } },
            { webHookDNId: { dataType: 'Text', direction: 'in' } },
            { metadataVersion: { dataType: 'Text', direction: 'in' } }
          ],
          outArguments: [
            { upstreamStatus: { dataType: 'Number', direction: 'out', access: 'visible' } },
            { messageId: { dataType: 'Text', direction: 'out', access: 'visible' } }
          ]
        }
      }
    }
  };
};
