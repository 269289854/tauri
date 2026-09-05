// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

// Android WebViews without reliable document-start script support can fail to
// parse Tauri's modern initialization bundle. Keep this bridge ES5-syntax-only
// so basic IPC is available before the standard scripts replace it.
;(function () {
  var internals = window.__TAURI_INTERNALS__
  if (!internals || typeof internals.invoke === 'function') {
    return
  }

  var invokeKey = __TEMPLATE_invoke_key__
  var protocolScheme = __TEMPLATE_protocol_scheme__
  var callbacks = {}
  var nextCallbackId = 1

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
  }

  function defineFallback(name, value) {
    var descriptor = Object.getOwnPropertyDescriptor(internals, name)
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(internals, name, {
        configurable: true,
        value: value
      })
    }
  }

  function allocateCallbackId() {
    var id = nextCallbackId
    nextCallbackId += 1
    if (nextCallbackId > 2147483647) {
      nextCallbackId = 1
    }
    while (hasOwn(callbacks, String(id))) {
      id = nextCallbackId
      nextCallbackId += 1
    }
    return id
  }

  function unregisterCallback(id) {
    delete callbacks[String(id)]
  }

  function registerCallback(callback, once) {
    var id = allocateCallbackId()
    callbacks[String(id)] = function (data) {
      if (once) {
        unregisterCallback(id)
      }
      if (callback) {
        return callback(data)
      }
    }
    return id
  }

  function runCallback(id, data) {
    var callback = callbacks[String(id)]
    if (callback) {
      callback(data)
    }
  }

  function serializeValue(_key, value) {
    var serializeKey = '__TAURI_TO_IPC_KEY__'
    var result

    if (typeof Map !== 'undefined' && value instanceof Map) {
      result = {}
      value.forEach(function (entryValue, entryKey) {
        result[String(entryKey)] = entryValue
      })
      return result
    }
    if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) {
      return Array.prototype.slice.call(value)
    }
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
      return Array.prototype.slice.call(new Uint8Array(value))
    }
    if (value && typeof value === 'object' && serializeKey in value) {
      return value[serializeKey]()
    }
    return value
  }

  function sendMessage(message) {
    if (!window.ipc || typeof window.ipc.postMessage !== 'function') {
      setTimeout(function () {
        sendMessage(message)
      }, 50)
      return
    }

    var sourceOptions = message.options || {}
    var options = {}
    var key
    for (key in sourceOptions) {
      if (hasOwn(sourceOptions, key)) {
        options[key] = sourceOptions[key]
      }
    }
    options.customProtocolIpcBlocked = false

    window.ipc.postMessage(JSON.stringify({
      cmd: message.cmd,
      callback: message.callback,
      error: message.error,
      options: options,
      payload: message.payload,
      __TAURI_INVOKE_KEY__: invokeKey
    }, serializeValue))
  }

  function invoke(cmd, payload, options) {
    if (payload === void 0 || payload === null) {
      payload = {}
    }
    return new Promise(function (resolve, reject) {
      var error
      var callback = registerCallback(function (response) {
        unregisterCallback(error)
        resolve(response)
      }, true)
      error = registerCallback(function (response) {
        unregisterCallback(callback)
        reject(response)
      }, true)

      internals.ipc({
        cmd: cmd,
        callback: callback,
        error: error,
        payload: payload,
        options: options
      })
    })
  }

  defineFallback('convertFileSrc', function (filePath, protocol) {
    var selectedProtocol = protocol || 'asset'
    return protocolScheme + '://' + selectedProtocol + '.localhost/' + encodeURIComponent(filePath)
  })
  defineFallback('transformCallback', registerCallback)
  defineFallback('unregisterCallback', unregisterCallback)
  defineFallback('runCallback', runCallback)
  defineFallback('callbacks', callbacks)
  defineFallback('postMessage', sendMessage)
  defineFallback('ipc', sendMessage)
  defineFallback('invoke', invoke)
})();
