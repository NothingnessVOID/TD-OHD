// Phase 1D verified claims only. Missing per-gate interpretation is deliberately absent.
// These are independent editorial resources: a missing locale slot stays missing.
export const pentaContent = Object.freeze({
  en: {
    introduction: { name: 'Penta', summary: 'A Penta describes a group of three to five people through the Sacral, G and Throat centers.', detail: 'Jovian Archive describes the Penta as a group form composed of channels running from the Sacral Center through the G Center to the Throat. Its analysis applies to families and small business groups under the same rules, with different keynotes and approaches.' },
    powerColumn: { name: 'Penta · Power Column', summary: 'The Penta structure follows the Sacral → G → Throat axis.', detail: 'The public Power Column descriptions identify a Sacral-to-G section and a G-to-Throat section. The latter describes three streams of identity expression rooted in the G Center role gates. These descriptions establish the two structural sections; they do not give a complete Penta function or assign a member role.' },
    contexts: { name: 'Penta · Family and business', summary: 'The same Penta structure is used in family and small business analysis.', detail: 'Jovian Archive describes family analysis and small business analysis as two uses of Penta. The rules remain the same; the keynotes and approach to interpretation differ.' },
    gate: n => ({ name: `Penta Gate ${n}` }),
    channel: (a,b) => ({ name: `Penta Channel ${a}–${b}`, summary: `The BG5 Semester 3 course schedule lists the ${a}–${b} gate pair among its Penta Skill Sets and Gaps lessons. This confirms a structural pair only; it does not establish a channel function.` })
  },
  'zh-CN': {
    introduction: { name: 'Penta 群体结构', summary: 'Penta 以骶骨、G 中心和喉中心的结构分析三至五人的群体。', detail: 'Jovian Archive 将 Penta 描述为由骶骨中心经 G 中心通向喉中心的通道构成的群体形态。这套结构用于家庭和小型商业群体；规则相同，解读的关键字和方法随场景变化。' },
    powerColumn: { name: 'Penta · 能量主轴', summary: 'Penta 的结构沿骶骨中心 → G 中心 → 喉中心展开。', detail: 'Power Column 两页公开介绍分别指向骶骨中心至 G 中心、G 中心至喉中心两段。后者提到源于 G 中心角色门的三条身份表达流。这些描述只核实两段结构，不能据此推出完整的 Penta 功能或成员岗位。' },
    contexts: { name: 'Penta · 家庭与事业', summary: '家庭与小型商业群体使用同一套 Penta 结构。', detail: 'Jovian Archive 将家庭分析和小型商业群体分析列为 Penta 的两种用途。两者遵循同一规则，具体解读的关键字与方法不同。' },
    gate: n => ({ name: `Penta 闸门 ${n}` }),
    channel: (a,b) => ({ name: `Penta 通道 ${a}–${b}`, summary: `BG5 第三学期课程表在 Penta 的 Skill Sets and Gaps 课程标题中列出 ${a}–${b} 门对。此处仅核实结构门对，不能据此确定通道功能。` })
  },
  'zh-Hant': {
    introduction: { name: 'Penta 群體結構', summary: 'Penta 以薦骨、G 中心和喉中心的結構分析三至五人的群體。', detail: 'Jovian Archive 將 Penta 描述為由薦骨中心經 G 中心通向喉中心的通道構成的群體形態。這套結構用於家庭和小型商業群體；規則相同，解讀的關鍵字和方法隨場景變化。' },
    powerColumn: { name: 'Penta · 能量主軸', summary: 'Penta 的結構沿薦骨中心 → G 中心 → 喉中心展開。', detail: 'Power Column 兩頁公開介紹分別指向薦骨中心至 G 中心、G 中心至喉中心兩段。後者提到源於 G 中心角色門的三條身分表達流。這些描述只核實兩段結構，不能據此推出完整的 Penta 功能或成員崗位。' },
    contexts: { name: 'Penta · 家庭與事業', summary: '家庭與小型商業群體使用同一套 Penta 結構。', detail: 'Jovian Archive 將家庭分析和小型商業群體分析列為 Penta 的兩種用途。兩者遵循同一規則，具體解讀的關鍵字與方法不同。' },
    gate: n => ({ name: `Penta 閘門 ${n}` }),
    channel: (a,b) => ({ name: `Penta 通道 ${a}–${b}`, summary: `BG5 第三學期課程表在 Penta 的 Skill Sets and Gaps 課程標題中列出 ${a}–${b} 門對。此處僅核實結構門對，不能據此確定通道功能。` })
  }
});
