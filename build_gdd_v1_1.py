from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = 'GDD v1.1 MVP修订版.docx'

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tcPr.append(shd)

def borders(table, color='D9D9D9'):
    tbl = table._tbl
    tblPr = tbl.tblPr
    b = tblPr.first_child_found_in('w:tblBorders')
    if b is None:
        b = OxmlElement('w:tblBorders')
        tblPr.append(b)
    for edge in ('top','left','bottom','right','insideH','insideV'):
        tag = 'w:' + edge
        el = b.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            b.append(el)
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '4')
        el.set(qn('w:color'), color)

def set_cell(cell, text, bold=False, color=None):
    cell.text = ''
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(9)
    if color:
        r.font.color.rgb = RGBColor(*color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def add_table(doc, headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = True
    borders(t)
    for i,h in enumerate(headers):
        set_cell(t.rows[0].cells[i], h, True, (255,255,255))
        shade(t.rows[0].cells[i], '44546A')
    for ri,row in enumerate(rows):
        cells = t.add_row().cells
        for i,val in enumerate(row):
            set_cell(cells[i], str(val))
            if ri % 2 == 1:
                shade(cells[i], 'F2F5F8')
    if widths:
        for row in t.rows:
            for i,w in enumerate(widths):
                row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_after = Pt(2)
    p.add_run(text)
    return p

doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(0.65)
sec.bottom_margin = Inches(0.65)
sec.left_margin = Inches(0.75)
sec.right_margin = Inches(0.75)
styles = doc.styles
styles['Normal'].font.name = 'Microsoft YaHei'
styles['Normal']._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
styles['Normal'].font.size = Pt(10)
for name, size in [('Title', 20), ('Heading 1', 15), ('Heading 2', 12)]:
    styles[name].font.name = 'Microsoft YaHei'
    styles[name]._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor(0,0,0)

p = doc.add_paragraph(style='Title')
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('三人 Trick 牌局游戏 GDD v1.1 MVP 修订版')
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('基于 GDD v1.0 的可执行规格补充 | 2026-09-25')
r.italic = True

doc.add_heading('1. 修订结论', level=1)
doc.add_paragraph('本版本将原 GDD 中影响实现的歧义收敛为一个可在 7 天内完成的单机 Web MVP。原 GDD v1.0 保留为设计基线；本文件对 MVP 范围内的规则、状态、界面和验收标准拥有优先解释权。')
doc.add_paragraph('MVP 目标：完成一名玩家对战两个 AI 的完整 Match，包含发牌、出牌、Pass、Trick 胜负、计分、三局循环、12 Trick 强制结束和最终结算。')

doc.add_heading('2. MVP 边界', level=1)
add_table(doc, ['项目', 'MVP 决定', '明确排除'], [
    ['平台', '桌面和移动浏览器可运行的 Web 单机版', '账号、联网房间、云存档'],
    ['玩家', '1 名人类玩家 + 2 个规则型 AI', '三人同设备轮流操作、在线 PvP'],
    ['牌局', '固定 54 张牌，单个 Match 含 3 个 Game', '自定义牌组、随机扩展牌组'],
    ['内容', '基础出牌、Pass、Trick、计分、结算', '复杂技能、成长系统、商店、剧情'],
    ['资源', '代码绘制牌面或简易占位资源', '定制美术、完整音效、动画过场'],
])

doc.add_heading('3. 牌组与发牌', level=1)
bullet(doc, '使用标准 54 张牌：黑桃、红桃、梅花、方块各 13 张（3、4、5、6、7、8、9、10、J、Q、K、A、2），另含大小王。')
bullet(doc, '牌面强度从低到高为：3、4、5、6、7、8、9、10、J、Q、K、A、2、小王、大王。花色不参与比较。')
bullet(doc, '每个 Game 开始时洗牌并平均发给 A、B、C，每人 18 张。')
bullet(doc, 'MVP 不使用底牌、主牌或公共牌。')
bullet(doc, '每个 Game 的发牌顺序固定为 A、B、C 循环，便于复现和测试。')

doc.add_heading('4. 出牌与 Trick 规则', level=1)
bullet(doc, '每个 Trick 由当前牌权玩家先出一组牌；其余玩家按顺序出牌或 Pass。')
bullet(doc, 'MVP 牌型仅支持单张和对子。对子必须是两张同牌面；大小王不能组成对子。')
bullet(doc, '后手出牌必须与当前牌型相同，并且牌面强度更高；不满足时只能 Pass。')
bullet(doc, '炸弹定义为四张同牌面。炸弹可压过单张、对子和更小的炸弹；四张 2 可压过其他炸弹。')
bullet(doc, '当连续两名玩家 Pass，最后一次有效出牌者赢得本 Trick，收走桌面牌并获得下一 Trick 的牌权。')
bullet(doc, '一轮 Trick 最多出现三次 Pass；如果三人都无法继续出牌，则立即结算当前 Trick。')
bullet(doc, '当某玩家手牌为空，当前 Trick 结算后进入 Game 结算，不再开始新的 Trick。')

doc.add_heading('5. Pass 与牌权', level=1)
add_table(doc, ['场景', '允许操作', '结果'], [
    ['玩家持有合法更大牌型', '出牌或 Pass', '出牌更新桌面；Pass 保留手牌'],
    ['玩家没有合法牌型', '只能 Pass', '牌权顺序不变'],
    ['连续两名玩家 Pass', '系统结算 Trick', '最后一次有效出牌者取得下一 Trick 牌权'],
    ['三人均未出牌', '系统提示重新选择', '不允许出现无牌型 Trick'],
])
doc.add_paragraph('原 GDD 中的“Pass +1”在 MVP 中解释为：该玩家本次 Pass，Pass 计数器加 1；它不改变分数、不改变牌力，也不产生额外牌权。')

doc.add_heading('6. Game、Round 与 Match', level=1)
add_table(doc, ['层级', '定义', '结束条件'], [
    ['Trick', '一次有效出牌到结算', '连续两名玩家 Pass，或系统判定无法继续'],
    ['Game', '从发牌到一名玩家手牌为空', '一名玩家先出完牌，或达到 12 个 Trick'],
    ['Round', '一个 Game 结束后的计分与牌权更新', 'Game 结算完成'],
    ['Match', '固定 3 个 Game 的总和', '完成 Game 1、2、3'],
])
bullet(doc, 'Game 1 的初始牌权为 A，Game 2 为 B，Game 3 为 C。')
bullet(doc, '每个 Game 最多 12 个 Trick；第 12 个 Trick 结算后立即进入 Game 结算。')
bullet(doc, '如果第 12 个 Trick 时没有玩家出完牌，按当前手牌数量结算，不再继续发起新的 Trick。')

doc.add_heading('7. 计分与胜负', level=1)
bullet(doc, 'Game 结算：第一名（最先出完牌）得 3 分，第二名得 2 分，第三名得 1 分。')
bullet(doc, '若因 12 Trick 强制结束，按剩余手牌数量从少到多排名，分别得 3、2、1 分；同数量时并列，相关名次取平均分。')
bullet(doc, 'Match 由三个 Game 的分数累加，总分最高者获胜。')
bullet(doc, '总分相同则 Match 平局；不使用额外加赛。')

doc.add_heading('8. 状态机', level=1)
add_table(doc, ['状态', '进入条件', '玩家/系统动作', '离开条件'], [
    ['MATCH_START', '点击开始', '初始化分数与 Game 序号', '进入 GAME_START'],
    ['GAME_START', '新 Game 开始', '洗牌、发牌、设置牌权', '进入 TRICK_PLAY'],
    ['TRICK_PLAY', '当前 Trick 未结束', '当前玩家出牌或 Pass', '满足 Trick 结算条件'],
    ['TRICK_END', 'Trick 结束', '结算牌权和桌面牌', '手牌为空则 GAME_END；Trick 为 3/6/9 时进入 HEX_DRAFT，否则回 TRICK_PLAY'],
    ['HEX_DRAFT', '完成第 3、6、9 个 Trick', 'A、B、C 依次从 3 个随机强化中选择 1 个；AI 自动选择', '三名玩家选择完成后回 TRICK_PLAY'],
    ['FORCE_END', '达到 12 个 Trick', '按剩余手牌数量结算', '进入 GAME_END'],
    ['GAME_END', '完成 Game 结算', '记录 Game 分数和结果', 'Game 未满 3 局则 NEXT_GAME'],
    ['MATCH_END', '完成 3 个 Game', '累计总分并显示胜者', '等待重开或退出'],
])

doc.add_heading('9. 海克斯随机强化', level=1)
doc.add_paragraph('海克斯是 MVP 的局内随机强化系统，用于验证“出牌决策 + 中途构筑”的核心体验。它只在每个 Game 的第 3、6、9 个 Trick 结算后触发；第 12 个 Trick 结算后不再触发。')
bullet(doc, '每次进入 HEX_DRAFT，系统为当前玩家生成 3 个不重复的强化选项，选项从固定 MVP 池中无放回随机抽取。')
bullet(doc, '玩家 A、B、C 按当前牌权顺序依次选择；每名玩家每次只能选择 1 个。选择完成后强化立即记录，并在指定时机生效。')
bullet(doc, '强化只影响拥有者，不改变基础牌组、发牌数量、牌型合法性和 Trick 胜负算法；每名玩家最多拥有 3 个强化。')
bullet(doc, '如果玩家在 10 秒内未选择，系统自动选择第一个选项；AI 按固定优先级选择，保证流程不会卡住。')
add_table(doc, ['强化名称', '效果', '生效范围'], [
    ['先手优势', '下一次你拥有牌权时，出牌后本 Trick 的首次 Pass 计数不增加', '下一次牌权'],
    ['稳健收获', '下一次你赢得 Trick 时额外获得 1 个结算标记；Game 结束时每个标记转为 1 分', '当前 Game'],
    ['灵活应对', '下一次你 Pass 后，仍可在同一轮重新选择一次出牌', '下一次 Pass'],
    ['终局筹码', '本 Game 结束时若排名第一，额外获得 1 分；否则无效果', '当前 Game'],
    ['换手准备', '下一次你赢得 Trick 后，可将下一 Trick 的牌权交给左手玩家', '下一次胜利'],
    ['压轴加成', '第 9 个 Trick 后获得；若在第 12 个 Trick 强制结束时手牌最少，额外获得 1 分', 'Game 结算'],
])
doc.add_paragraph('强化触发和结算必须记录在游戏状态中，并在界面上显示名称、剩余次数或生效条件。MVP 不实现强化升级、出售、刷新、跨 Game 保留或玩家自定义强化。')

doc.add_heading('10. AI 规格', level=1)
bullet(doc, 'AI 只需保证合法，不要求模拟人类最优策略。')
bullet(doc, 'AI 优先出能压过当前牌型的最小合法牌；没有合法牌时 Pass。')
bullet(doc, 'AI 在自己拥有牌权时出最小单张；若只剩对子或炸弹，则出最小可用牌型。')
bullet(doc, 'AI 不读取玩家手牌，不改变牌组，不跳过状态机。')

doc.add_heading('11. UI 与异常处理', level=1)
bullet(doc, '主界面必须显示：当前 Game/Trick、三名玩家状态、当前牌权、桌面牌、玩家手牌、双方分数和 Pass 计数。')
bullet(doc, '非法出牌时保留当前选择并显示原因；不能让牌局静默卡住。')
bullet(doc, '提供“重新开始 Match”按钮；重新开始后清空分数和牌局状态。')
bullet(doc, 'AI 行动使用 300～800 毫秒延迟，避免玩家无法理解回合变化。')
bullet(doc, 'HEX_DRAFT 界面显示当前玩家、3 个强化选项、效果说明、倒计时和已拥有强化。')

doc.add_heading('12. 7 天 MVP 计划', level=1)
add_table(doc, ['日期', '任务', '验收产出'], [
    ['D1', '冻结规则、状态机、技术栈；建立项目骨架', '规则规格、状态转移表、可运行页面'],
    ['D2', '实现牌组、洗牌、发牌、牌型和合法性判断', '无界面规则模拟通过基础案例'],
    ['D3', '实现 Trick/Game/Match 流程、计分和 HEX_DRAFT 状态', '逻辑可连续完成三局并在 3/6/9 Trick 触发强化'],
    ['D4', '实现玩家输入、手牌选择、Pass、牌权提示', '人类玩家可完成一局'],
    ['D5', '接入两个 AI、强化自动选择、强制结束、重开和结算', '单机可完成完整 Match'],
    ['D6', '完成 UI 整理、海克斯选择界面、响应式布局、反馈和占位资源', '可演示版本，无阻塞错误'],
    ['D7', '按验收清单回归、修复 P0/P1、打包部署', 'MVP 构建包和测试记录'],
])

doc.add_heading('13. MVP 验收标准', level=1)
for item in [
    '从 MATCH_START 开始可以完成 3 个 Game，并进入 MATCH_END。',
    '所有出牌操作都经过合法性判断，非法操作不会破坏牌局状态。',
    '每个 Game 最多 12 个 Trick；达到上限后能正确强制结算。',
    '每个 Game 在第 3、6、9 个 Trick 后各触发一次 HEX_DRAFT；第 12 个 Trick 后不重复触发。',
    '每名玩家每次海克斯阶段只能选择一个强化，AI 能自动完成选择，10 秒超时不会卡局。',
    '强化效果只在其说明的范围内生效，Game 结束或次数用尽后正确失效。',
    '玩家、AI、Pass、牌权和桌面牌的状态始终一致。',
    '三局总分和 Match 胜负与规则计算一致。',
    '点击重新开始后，旧牌局、旧分数和旧牌权全部清空。',
    '普通玩家首次操作无需阅读源码即可完成至少一局。',
    '连续完成 3 个 Match 不出现卡死、无法出牌或分数回退。',
]: bullet(doc, item)

doc.add_heading('14. 暂缓内容', level=1)
doc.add_paragraph('联网 PvP、账号系统、复杂 AI、海克斯升级与出售、跨 Game 保留、商店、牌组编辑、完整音效、美术过场、排行榜和数据分析均推迟到 MVP 之后。任何新增内容必须先证明不会影响第 12 节的交付时间。')

doc.add_heading('15. 版本决策记录', level=1)
doc.add_paragraph('本版本采用“可运行优先”的解释：对于原 GDD 未定义的内容，统一使用本文件的固定规则。后续若需要改变牌组、牌型或计分，必须更新版本号并同步修改状态机、测试案例和验收清单。')

doc.save(OUT)
print(OUT)
