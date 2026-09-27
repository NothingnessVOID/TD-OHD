/** Loaded only when Simplified Chinese is selected. */
import * as readings from './content.js';
import contexts from '../ui-contexts.json' with { type: 'json' };
import bodygraphMessages from './ui-bodygraph.json' with { type: 'json' };
import chartMessages from './ui-chart.json' with { type: 'json' };
import commonMessages from './ui-common.json' with { type: 'json' };
import mainMessages from './ui-main.json' with { type: 'json' };
import staticMessages from './ui-static.json' with { type: 'json' };
import viewMessages from './ui-views.json' with { type: 'json' };
import transitMessages from './ui-transits.json' with { type: 'json' };
import timelineMessages from './timeline.json' with { type: 'json' };

export default {
  messages: { ...transitMessages, ...bodygraphMessages, ...chartMessages, ...commonMessages,
    ...mainMessages, ...staticMessages, ...viewMessages, ...contexts['zh-CN'] },
  timeline: { locale: 'zh-CN', messages: timelineMessages },
  content: { data: readings, text: readings.zhText, cross: readings.zhCross, bilingualGeneKeys: true }
};
