'use strict';

const onFinished = require('on-finished');

const Request = require('./request');
const Response = require('./response');

module.exports = function(app) {
  const handler = getHandler(app);

  return (evt, ctx, callback) => {
    try {
      const event = cleanupEvent(evt);

      const req = new Request(event);
      const res = new Response(req);

      onFinished(req, function(err) {
        if (err) {
          callback(err);
          return;
        }

        onFinished(res, function(err) {
          if (err) {
            callback(err);
            return;
          }

          callback(null, {
            statusCode: res.statusCode,
            headers: res._headers,
            body: res._body
          });
        });

        handler(req, res)
      });
    } catch (e) {
      callback(e);
    }
  };
};

function getHandler(app) {
  if (typeof app.callback === 'function') {
    return app.callback();
  }

  if (typeof app.handle === 'function') {
    return app.handle.bind(app);
  }

  if (typeof app === 'function') {
    return app;
  }

  throw new Error('serverless-http only supports koa, express/connect or a generic http listener');
}

function cleanupEvent(evt) {
  const event = evt || {};

  event.httpMethod = event.httpMethod || 'GET';
  event.path = event.path || '/';
  event.body = event.body || '';
  event.headers = event.headers || {};
  event.requestContext = event.requestContext || {};
  event.requestContext.identity = event.requestContext.identity || {};

  event.headers = Object.keys(event.headers).reduce((headers, key) => {
    headers[key.toLowerCase()] = event.headers[key];
    return headers;
  }, {});

  // this only really applies during some tests and invoking a lambda directly
  if (typeof event.body === 'object' && !Buffer.isBuffer(event.body)) {
    event.body = JSON.stringify(event.body);
  }

  if (typeof event.headers['content-length'] == 'undefined') {
    event.headers['content-length'] = event.body.length;
  }

  return event;
}
