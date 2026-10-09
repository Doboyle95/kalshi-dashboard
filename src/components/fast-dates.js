// Memoised Date#toLocaleDateString(locale, options).
//
// toLocaleDateString(locale, options) builds a brand-new Intl.DateTimeFormat on EVERY call
// (~0.1 ms; the same call with no options is ~3 us because V8 caches the default formatter).
// Charts call it from a Plot `title` channel once per data point, so one render costs 10^4+
// constructions. This keeps one DateTimeFormat per (locale, options) and calls format() on it.
//
// Exactly equivalent to the native call, by construction:
//   * only the options keys weekday/era/year/month/day/timeZone are fast-pathed, and only when at
//     least one of weekday/year/month/day is present. In that case ToDateTimeOptions(...,"date","date")
//     adds no defaults, so toLocaleDateString and new Intl.DateTimeFormat(...).format() are the same
//     algorithm with the same inputs. Any other options (hour, timeStyle, hour12, ...), a missing
//     locale, a non-string locale, or an invalid Date go straight to the native method.
//   * cached formatters are immutable, and the cache key contains the locale, every option name
//     and every option value.
(function () {
  try {
    var proto = Date.prototype, native = proto.toLocaleDateString;
    if (typeof native !== "function" || typeof Intl === "undefined" || !Intl.DateTimeFormat || native.__pcFast) return;
    var cache = new Map();
    var ALLOWED = {weekday: 1, era: 1, year: 1, month: 1, day: 1, timeZone: 1};
    var NAMES = ["weekday", "era", "year", "month", "day", "timeZone"];
    var objectProto = Object.prototype;
    var fast = function toLocaleDateString(locales, options) {
      // Plain objects only (an inherited or non-enumerable option would be read by Intl but not
      // seen here), and only the six names above, read once each as Intl reads them.
      if (typeof locales === "string" && options !== null && typeof options === "object" &&
          Object.getPrototypeOf(options) === objectProto) {
        var own = Object.getOwnPropertyNames(options), values = [locales], i, v, hasDate = false;
        for (i = 0; i < own.length; i++) if (ALLOWED[own[i]] !== 1) return native.call(this, locales, options);
        for (i = 0; i < NAMES.length; i++) {
          v = options[NAMES[i]];
          if (v !== undefined && typeof v !== "string") return native.call(this, locales, options);
          if (v !== undefined && NAMES[i] !== "era" && NAMES[i] !== "timeZone") hasDate = true;
          values.push(v === undefined ? null : v);
        }
        var key = JSON.stringify(values);
        if (hasDate) {
          var t = proto.getTime.call(this);           // TypeError for a non-Date receiver, like the native method
          if (t === t) {                              // not NaN: an invalid Date keeps the native "Invalid Date"
            var f = cache.get(key);
            if (f === undefined) { f = new Intl.DateTimeFormat(locales, options); cache.set(key, f); }
            return f.format(t);
          }
        }
      }
      return native.apply(this, arguments);
    };
    fast.__pcFast = true;
    Object.defineProperty(proto, "toLocaleDateString", {value: fast, writable: true, configurable: true, enumerable: false});
  } catch (e) {}
})();
