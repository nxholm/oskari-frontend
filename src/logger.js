/**
* Provides logger functionality for Oskari
* let log = Oskari.log('MyLog');
* log.enableDebug(true);
* log.debug('my debug message');
* log.warn('my warn message');
* log.error('my error message');
*/
(function() {

  let hasConsole = window.console;
  // Set to true to enable timestamps in log messages
  let inclTimestamp = false;
  /** Utility methods for logger */
  let _logMsg = function (args) {
    let level = args.shift();
    if (!hasConsole ||
      !window.console[level] ||
      !window.console[level].apply) {
        // maybe gather messages and provide a custom debug console?
        return;
      }
      window.console[level].apply(window.console, args);
    };

    let _unshift = function(addToFirst, list) {
      let args = Array.prototype.slice.call(list);
      args.unshift(addToFirst);
      return args;
    }
    let ts = function() {
      if(!inclTimestamp) {
        return '';
      }
      let date = new Date();
      return date.toLocaleTimeString() + '.' + date.getUTCMilliseconds() + ' ';
    }
    let _doLogging = function(logName, logLevel, logMessages, includeCaller, callee) {
      let header = ts() + logName + ':';
      // prefix messages with logName
      let newArgs = _unshift(header, logMessages);
      // prefix logName + messages with logLevel
      newArgs = _unshift(logLevel, newArgs);
      // attach caller info if available and requested
      if(includeCaller && callee && callee.caller) {
        newArgs.push(callee.caller);
      }
      // write to log
      _logMsg(newArgs, callee);
    }
    /**
    * Logger definition
    * @param {String} name logger name
    */
    let Logger = function(name, enableDebug, inclCaller) {
      this.name = name || "Logger";
      this.isDebug = !!enableDebug;
      this.includeCaller = !!inclCaller;
    };

    Logger.prototype.setInclCaller = function(bln) {
      this.includeCaller = !!bln;
    }

    Logger.prototype.enableDebug = function(bln) {
      this.isDebug = !!bln;
    }

    Logger.prototype.debug = function() {
      if(!this.isDebug) {
        return;
      }
      _doLogging(this.name, 'debug', arguments, this.includeCaller, arguments.callee);
    };

    Logger.prototype.info =  function() {
      _doLogging(this.name, 'log', arguments, this.includeCaller, arguments.callee);
    };

    Logger.prototype.warn =  function() {
      _doLogging(this.name, 'warn', arguments, this.includeCaller, arguments.callee);
    };

    Logger.prototype.error =  function() {
      _doLogging(this.name, 'error', arguments, this.includeCaller, arguments.callee);
    };

    // keep track of existing loggers
    let loggers = {};

    Oskari.log = function(logName) {
      logName = logName || "Oskari";
      if(loggers[logName]) {
        return loggers[logName];
      }
      let log = new Logger(logName);
      loggers[logName] = log;
      return log;
    };

  }());
