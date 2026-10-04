# Observed official Maia Mechanics widget source audit

Read-only scope: only the public script already observed by root on the Jovian calculator page was downloaded: https://widget.maiamechanics.com/v2/js/app.js . No private or calculator API was called, no browser hidden state was read, and this script was not executed.

Snapshot: 1,214,171 bytes; SHA256 aeb530d406f29b81341543641b436b451138ed6d8f88e22ba717c8d5bdbcdd07. File is official-observed-app.js; response headers and source offsets are adjacent files.

## Birth time parsing and transport

DateTimeField parses the date with DD/MM/YYYY and the time with HH:mm through Day.js UTC parsing. The widget's final formatDateTime method combines the chosen date and hour/minute, then explicitly sets second to 0 and millisecond to 0 before calling toISOString. This happens regardless of whether it received a Day.js object, a string or an object carrying a native Date.

The regular rave birth-chart path builds tzData including name, country, city, stateName, timezone, timeInUtc:false and time:formatDateTime(input). The timezone is the selected city's timezone or tz field. The time is sent as an ISO string, but timeInUtc:false tells the downstream service that this chart input represents the chosen local wall-clock time; for London in the two January cases, UTC offset0 makes local and UTC identical.

For the two audit inputs the deterministic front-end strings are 2015-01-26T01:20:00.000Z and 2025-01-19T22:57:00.000Z. The extra data form object is also included in the JSON envelope, but the dedicated tzData time uses the explicit zero-second, zero-millisecond formatter. Which server field is authoritative cannot be proven from the front-end alone.

There are zero literal setHours/setSeconds/setMilliseconds occurrences in the downloaded bundle. More decisively, the actual Day.js formatter chain explicitly clears seconds and milliseconds. Therefore a residual browser current-second/current-millisecond value in the dedicated chart time parameter is not supported by this source. Repeated browser outputs can still test black-box response consistency and form event timing, independently of that rejected residual-time hypothesis.

## Display

The planet table returns/sorts the existing dataSource.planets records and renders each gate and line field directly as text. No Math.round, Math.floor, parseFloat or toFixed rounding was found in the application planet/line display path. Profile metadata comes directly from this.chart.chart.profile and is localized for display. It is not re-derived from displayed planet text by this front-end.

The widget receives the chart result from server-side generation, preserves the returned object and records the request separately. No planetary longitude-to-Gate.Line algorithm or server numerical precision is exposed in this one public script. Its source cannot establish the service's ephemeris version, rounding policy, or the reason for the two subsecond boundary results.

Relevant minified excerpts are saved as official-date-time-field-excerpt.js, official-formatDateTime-excerpt.js, official-widget-post-excerpt.js and official-planet-table-excerpt.js. Searchable character offsets and original script line numbers are in official-widget-source-offsets.json.
