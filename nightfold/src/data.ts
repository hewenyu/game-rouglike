export type RuleId = 'echo' | 'gravity' | 'satellite' | 'loom' | 'mirror' | 'constellation' | 'zipper' | 'hatch';
export type Rule = { id: RuleId; name: string; en: string; icon: string; description: string; hint: string; color: string };
export const RULES: Rule[] = [
  { id:'echo', name:'余响', en:'AFTERIMAGE', icon:'◎', description:'收线后，原来的图形在 0.9 秒后再爆一次。', hint:'让追来的敌人，撞上过去的你。', color:'#a4efcf' },
  { id:'gravity', name:'引力褶皱', en:'GRAVITY PLEAT', icon:'⊙', description:'圈内敌人被吸向中心，0.6 秒后发生内爆。', hint:'先把危险，折到同一个地方。', color:'#f3bf71' },
  { id:'satellite', name:'借来的月亮', en:'BORROWED MOONS', icon:'◌', description:'每次收线生出一颗护身卫星；吞掉的敌弹也变成卫星，最多 8 颗。', hint:'用别人的火力，织自己的星环。', color:'#b9dafa' },
  { id:'loom', name:'慢时织物', en:'SLOW FABRIC', icon:'▧', description:'有效圈留下 4 秒织网，敌人与敌弹在其中减速。', hint:'在快与慢之间，留出下一笔。', color:'#a4efcf' },
  { id:'mirror', name:'夜的另一面', en:'OTHER SIDE', icon:'⋈', description:'以起点为中心，额外折出一个点对称的镜像圈。', hint:'只走一条路，同时折起两个世界。', color:'#b9dafa' },
  { id:'constellation', name:'三点成星', en:'CONSTELLATION', icon:'△', description:'每次收线留下起点。第三次，三个起点连成三角并爆发。', hint:'这一次的位置，是下一次的伏笔。', color:'#f3bf71' },
  { id:'zipper', name:'无限拉链', en:'INFINITE ZIP', icon:'↗', description:'闭合边向两端延伸，剪开整片夜色。', hint:'把松手时的那条虚线，对准远处。', color:'#f3bf71' },
  { id:'hatch', name:'纸蛾迁徙', en:'PAPER MOTHS', icon:'⋇', description:'被主动收线击败的敌人，放出两只寻敌纸蛾。', hint:'一次漂亮的包围，会自己续写。', color:'#ffac90' },
];
export const CHAPTERS = [
  { name: '浅夜', en: 'THE FIRST THREAD', note: '夜色尚浅。试着折出第一颗星。' },
  { name: '潮汐', en: 'BORROWED TIDES', note: '橙色的弹幕，也可以是你的材料。' },
  { name: '复调', en: 'A QUIETER STORM', note: '让两条规则，在同一笔里相遇。' },
  { name: '暗流', en: 'UNDERCURRENT', note: '冲刺者会先画出它的危险方向。' },
  { name: '星群', en: 'UNWRITTEN STARS', note: '你留下的形状，开始改写这片夜。' },
  { name: '黎明前', en: 'BEFORE THE LIGHT', note: '最后一页。把所有借来的光还给夜空。' },
];
export const SYNERGIES: { ids: RuleId[]; name: string; description: string }[] = [
  { ids:['gravity','echo'], name:'迟到的超新星', description:'先收束，再让余响命中聚拢的敌人。' },
  { ids:['mirror','satellite'], name:'双月潮汐', description:'镜像吞弹也会收进你的星环。' },
  { ids:['loom','echo'], name:'被缝住的时间', description:'织网让追来的敌人留在余响里。' },
  { ids:['constellation','zipper'], name:'夜空的裁缝', description:'当下的一刀，三笔之后的一片星空。' },
];
