// Phase 1D verified claims only. Missing per-gate interpretation is deliberately absent.
// These are independent editorial resources: a missing locale slot stays missing.
export const pentaContent = Object.freeze({
  en: {
    introduction: { name: 'Penta', summary: 'A Penta describes a group of three to five people through the Sacral, G and Throat centers.', detail: 'Jovian Archive describes the Penta as a group form composed of channels running from the Sacral Center through the G Center to the Throat. Its analysis applies to families and small business groups under the same rules, with different keynotes and approaches.' },
    powerColumn: { name: 'Penta · Power Column', summary: 'The Penta structure follows the Sacral → G → Throat axis.', detail: 'The Penta design uses the channels running from the Sacral Center through the G Center to the Throat. This identifies the structural scope of the Penta; it does not assign a role to any member.' },
    contexts: { name: 'Penta · Family and business', summary: 'The same Penta structure is used in family and small business analysis.', detail: 'Jovian Archive describes family analysis and small business analysis as two uses of Penta. The rules remain the same; the keynotes and approach to interpretation differ.' },
    gate: n => ({ name: `Penta Gate ${n}`, summary: `Gate ${n} occupies a position in the twelve-gate Penta structure.` }),
    channel: (a,b) => ({ name: `Penta Channel ${a}–${b}`, summary: `Gates ${a} and ${b} form one of the six Penta channels.`, detail: `The BG5 Semester 3 schedule explicitly lists the ${a}–${b} gate pair among its Penta Skill Sets and Gaps lessons. This identifies the channel in the structure; the course title does not define a Gap formula or functional criteria.` })
  },
  'zh-CN': {
    introduction: { name: 'Penta 群体结构', summary: 'Penta 以骶骨、G 中心和喉中心的结构分析三至五人的群体。', detail: 'Jovian Archive 将 Penta 描述为由骶骨中心经 G 中心通向喉中心的通道构成的群体形态。这套结构用于家庭和小型商业群体；规则相同，解读的关键字和方法随场景变化。' },
    powerColumn: { name: 'Penta · 能量主轴', summary: 'Penta 的结构沿骶骨中心 → G 中心 → 喉中心展开。', detail: 'Penta 的设计由骶骨中心经 G 中心至喉中心的通道构成。这限定了 Penta 的结构范围，不能据此给成员分配岗位或职责。' },
    contexts: { name: 'Penta · 家庭与事业', summary: '家庭与小型商业群体使用同一套 Penta 结构。', detail: 'Jovian Archive 将家庭分析和小型商业群体分析列为 Penta 的两种用途。两者遵循同一规则，具体解读的关键字与方法不同。' },
    gate: n => ({ name: `Penta 闸门 ${n}`, summary: `${n} 号闸门位于 Penta 的十二门结构中。` }),
    channel: (a,b) => ({ name: `Penta 通道 ${a}–${b}`, summary: `${a} 与 ${b} 号闸门组成六条 Penta 通道之一。`, detail: `BG5 第三学期课程表在 Penta 的 Skill Sets and Gaps 课程标题中直接列出 ${a}–${b} 门对。标题可核实结构身份，不能用来推出 Gap 公式或功能判据。` })
  },
  'zh-Hant': {
    introduction: { name: 'Penta 群體結構', summary: 'Penta 以薦骨、G 中心和喉中心的結構分析三至五人的群體。', detail: 'Jovian Archive 將 Penta 描述為由薦骨中心經 G 中心通向喉中心的通道構成的群體形態。這套結構用於家庭和小型商業群體；規則相同，解讀的關鍵字和方法隨場景變化。' },
    powerColumn: { name: 'Penta · 能量主軸', summary: 'Penta 的結構沿薦骨中心 → G 中心 → 喉中心展開。', detail: 'Penta 的設計由薦骨中心經 G 中心至喉中心的通道構成。這限定了 Penta 的結構範圍，不能據此給成員分配崗位或職責。' },
    contexts: { name: 'Penta · 家庭與事業', summary: '家庭與小型商業群體使用同一套 Penta 結構。', detail: 'Jovian Archive 將家庭分析和小型商業群體分析列為 Penta 的兩種用途。兩者遵循同一規則，具體解讀的關鍵字與方法不同。' },
    gate: n => ({ name: `Penta 閘門 ${n}`, summary: `${n} 號閘門位於 Penta 的十二門結構中。` }),
    channel: (a,b) => ({ name: `Penta 通道 ${a}–${b}`, summary: `${a} 與 ${b} 號閘門組成六條 Penta 通道之一。`, detail: `BG5 第三學期課程表在 Penta 的 Skill Sets and Gaps 課程標題中直接列出 ${a}–${b} 門對。標題可核實結構身分，不能用來推出 Gap 公式或功能判據。` })
  }
});
