import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const bankPath = join(root, 'resources/question-bank/questions.json')
const assetDir = join(root, 'resources/question-bank/ds-assets')
const sourceAssetDir = '/Users/muzermat/Documents/ds-xtlt'

const baseQuestions = JSON.parse(readFileSync(bankPath, 'utf8')).filter(
  (question) => question.subjectId !== 'data-structure',
)

mkdirSync(assetDir, { recursive: true })
const copiedImages = existsSync(sourceAssetDir)
  ? readdirSync(sourceAssetDir)
      .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .map((file, index) => {
        const extension = file.slice(file.lastIndexOf('.')).toLowerCase()
        const targetName = `ds-example-${String(index + 1).padStart(2, '0')}${extension}`
        copyFileSync(join(sourceAssetDir, file), join(assetDir, targetName))
        return `question-bank/ds-assets/${targetName}`
      })
  : []

const dsQuestions = []
let sourceNumber = 1

function addChoice(topic, stem, options, correctKey, extra = {}) {
  dsQuestions.push({
    id: `ds-${String(sourceNumber).padStart(3, '0')}`,
    sourceNumber,
    subjectId: 'data-structure',
    type: 'single',
    stem,
    options: options.map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
    correctAnswers: [correctKey],
    tags: [topic],
    ...extra,
  })
  sourceNumber += 1
}

function addBlank(topic, stem, answers, extra = {}) {
  const [correct, ...aliases] = Array.isArray(answers) ? answers : [answers]
  dsQuestions.push({
    id: `ds-${String(sourceNumber).padStart(3, '0')}`,
    sourceNumber,
    subjectId: 'data-structure',
    type: 'blank',
    stem,
    options: [],
    correctAnswers: [String(correct)],
    acceptedAnswers: aliases.map(String),
    tags: [topic],
    ...extra,
  })
  sourceNumber += 1
}

addChoice(
  '栈',
  '在非空双向循环链表中由 q 所指结点前插入一个由 p 所指结点，若已执行 p->rlink=q; p->llink=q->llink; q->llink=p; 则还应执行哪条语句？',
  ['q->rlink=p;', 'q->llink->rlink=p;', 'p->rlink->rlink=p;', 'p->llink->rlink=p;'],
  'D',
  { image: 'question-bank/ds-assets/ds-linked-list.svg' },
)
addChoice(
  '栈',
  '设栈的输入序列为 1,2,3,4,5，下列序列中哪一个是合法的栈输出序列？',
  ['5 1 2 3 4', '4 5 1 3 2', '4 3 1 2 5', '3 2 1 5 4'],
  'D',
  { image: 'question-bank/ds-assets/ds-stack.svg' },
)

const stackExprs = [
  ['2 3 + 4 *', '20'],
  ['6 2 / 3 +', '6'],
  ['5 1 2 + 4 * + 3 -', '14'],
  ['8 3 - 2 *', '10'],
  ['9 3 / 2 +', '5'],
]
for (let i = 0; i < 23; i += 1) {
  const n = 5 + i
  const template = i % 5
  if (template === 0) {
    addChoice('栈', `顺序栈初始 top=-1，连续入栈 ${n} 个元素后，top 的值是？`, [
      String(n),
      String(n - 1),
      String(n + 1),
      '0',
    ], 'B')
  } else if (template === 1) {
    addChoice('栈', `容量为 ${n} 的顺序栈采用 top 指向栈顶元素的约定，判满条件是？`, [
      'top == 0',
      `top == ${n}`,
      `top == ${n - 1}`,
      'top == -1',
    ], 'C')
  } else if (template === 2) {
    addChoice('栈', `入栈序列为 1,2,3,4，若先入 1、2、3 后弹出 3，再入 4，则接下来连续弹出的完整序列可能是？`, [
      '3,4,2,1',
      '1,2,3,4',
      '4,1,2,3',
      '2,4,3,1',
    ], 'A')
  } else if (template === 3) {
    const [expr, answer] = stackExprs[i % stackExprs.length]
    addChoice('栈', `后缀表达式 ${expr} 的计算结果是？`, [
      answer,
      String(Number(answer) + 1),
      String(Math.max(0, Number(answer) - 2)),
      String(Number(answer) * 2),
    ], 'A')
  } else {
    addChoice('栈', '判断括号序列是否匹配时，最适合使用的线性结构是？', [
      '队列',
      '栈',
      '顺序表',
      '邻接矩阵',
    ], 'B')
  }
}

for (let i = 0; i < 25; i += 1) {
  const capacity = 8 + (i % 8)
  const front = i % capacity
  const rear = (front + 3 + (i % 4)) % capacity
  const length = (rear - front + capacity) % capacity
  const template = i % 5
  if (template === 0) {
    addChoice('队列', `循环队列容量为 ${capacity}，front=${front}，rear=${rear}，采用少用一个存储单元的约定，队列长度是？`, [
      String(length),
      String((length + 1) % capacity),
      String(capacity - length),
      String(capacity),
    ], 'A')
  } else if (template === 1) {
    addChoice('队列', '队列的基本操作原则是？', ['先进后出', '后进先出', '先进先出', '随机访问'], 'C')
  } else if (template === 2) {
    addChoice('队列', `循环队列容量为 ${capacity}，rear 指向队尾元素的下一个位置，入队后 rear 应更新为？`, [
      'rear - 1',
      `(rear + 1) % ${capacity}`,
      'front + 1',
      '0',
    ], 'B')
  } else if (template === 3) {
    addChoice('队列', '广度优先遍历图时，通常使用哪种辅助结构保存待访问顶点？', ['栈', '队列', '二叉链表', '散列表'], 'B')
  } else {
    addChoice('队列', '链队列删除队头元素时，通常需要修改的是？', ['front 指针', 'rear 指针', '所有结点指针', '队列容量'], 'A')
  }
}

for (let i = 0; i < 25; i += 1) {
  const leaves = 4 + (i % 9)
  const nodes = 2 * leaves - 1
  const template = i % 5
  if (template === 0) {
    addChoice('树', `一棵满二叉树有 ${leaves} 个叶子结点，则总结点数为？`, [
      String(nodes),
      String(leaves + 1),
      String(2 * leaves),
      String(leaves * leaves),
    ], 'A')
  } else if (template === 1) {
    addChoice('树', '二叉树的先序遍历访问根结点的时机是？', ['左子树之后', '右子树之后', '访问左右子树之前', '仅叶子结点之后'], 'C')
  } else if (template === 2) {
    const k = 2 + (i % 7)
    addChoice('树', `完全二叉树顺序存储中，编号为 ${k} 的结点左孩子编号是？`, [
      String(2 * k),
      String(2 * k + 1),
      String(Math.floor(k / 2)),
      String(k - 1),
    ], 'A')
  } else if (template === 3) {
    addChoice('树', '若已知一棵二叉树的先序序列和中序序列，且结点互不相同，则该二叉树？', [
      '不能确定',
      '可以唯一确定',
      '只能确定高度',
      '只能确定叶子数',
    ], 'B')
  } else {
    addChoice('树', '具有 n 个结点的树中，边数为？', ['n-1', 'n', 'n+1', '2n'], 'A')
  }
}

for (let i = 0; i < 25; i += 1) {
  const n = 5 + (i % 10)
  const template = i % 5
  if (template === 0) {
    addChoice('图', `含 ${n} 个顶点的无向简单图最多有多少条边？`, [
      String((n * (n - 1)) / 2),
      String(n * (n - 1)),
      String(n * n),
      String(n - 1),
    ], 'A')
  } else if (template === 1) {
    addChoice('图', `含 ${n} 个顶点的有向简单图最多有多少条弧？`, [
      String((n * (n - 1)) / 2),
      String(n * (n - 1)),
      String(n + 1),
      String(n - 1),
    ], 'B')
  } else if (template === 2) {
    addChoice('图', '无向图所有顶点度数之和等于？', ['边数', '边数的 2 倍', '顶点数', '顶点数的 2 倍'], 'B')
  } else if (template === 3) {
    addChoice('图', '邻接矩阵表示法最直接判断两个顶点是否相邻的时间复杂度是？', ['O(1)', 'O(n)', 'O(e)', 'O(n+e)'], 'A')
  } else {
    addChoice('图', '深度优先遍历图时，递归实现隐含使用的辅助结构是？', ['栈', '队列', '顺序表', '邻接表'], 'A')
  }
}

for (let i = 0; i < 25; i += 1) {
  const n = 6 + i
  const template = i % 5
  if (template === 0) addBlank('栈', `顺序栈初始 top=-1，连续入栈 ${n} 个元素后 top=____。`, [String(n - 1)])
  else if (template === 1) addBlank('栈', `容量为 ${n} 的顺序栈，top 指向栈顶元素时，栈满条件可写为 top==____。`, [String(n - 1)])
  else if (template === 2) addBlank('栈', '栈的插入和删除操作都只能在____端进行。', ['栈顶', 'top', '顶端'])
  else if (template === 3) addBlank('栈', '判断括号匹配最常用的辅助线性结构是____。', ['栈', 'stack'])
  else addBlank('栈', '后缀表达式求值时，遇到操作数应执行____操作。', ['入栈', 'push', '压栈'])
}

for (let i = 0; i < 25; i += 1) {
  const capacity = 9 + (i % 9)
  const front = i % capacity
  const rear = (front + 4 + (i % 5)) % capacity
  const length = (rear - front + capacity) % capacity
  const template = i % 5
  if (template === 0) addBlank('队列', `循环队列容量为 ${capacity}，front=${front}，rear=${rear}，队列长度为____。`, [String(length)])
  else if (template === 1) addBlank('队列', '队列的操作原则是____。', ['先进先出', 'FIFO', 'firstinfirstout'])
  else if (template === 2) addBlank('队列', `循环队列容量为 ${capacity}，入队时 rear 的更新表达式为 rear=(rear+1)%____。`, [String(capacity)])
  else if (template === 3) addBlank('队列', '图的广度优先遍历通常使用____保存待访问顶点。', ['队列', 'queue'])
  else addBlank('队列', '链队列出队时通常删除____结点。', ['队头', '头', 'front'])
}

for (let i = 0; i < 25; i += 1) {
  const leaves = 5 + (i % 10)
  const k = 2 + (i % 10)
  const template = i % 5
  if (template === 0) addBlank('树', `满二叉树有 ${leaves} 个叶子结点，则总结点数为____。`, [String(2 * leaves - 1)])
  else if (template === 1) addBlank('树', '先序遍历二叉树的访问次序可概括为____、左子树、右子树。', ['根', '根结点', 'root'])
  else if (template === 2) addBlank('树', `完全二叉树顺序存储中，编号为 ${k} 的结点父结点编号为____。`, [String(Math.floor(k / 2))])
  else if (template === 3) addBlank('树', '具有 n 个结点的树有____条边。', ['n-1', 'n - 1'])
  else addBlank('树', '中序遍历二叉排序树可得到关键字的____序列。', ['递增', '升序', '非递减'])
}

for (let i = 0; i < 25; i += 1) {
  const n = 6 + (i % 10)
  const template = i % 5
  if (template === 0) addBlank('图', `含 ${n} 个顶点的无向简单图最多有____条边。`, [String((n * (n - 1)) / 2)])
  else if (template === 1) addBlank('图', `含 ${n} 个顶点的有向简单图最多有____条弧。`, [String(n * (n - 1))])
  else if (template === 2) addBlank('图', '无向图所有顶点度数之和等于边数的____倍。', ['2', '两'])
  else if (template === 3) addBlank('图', '邻接矩阵判断两个顶点是否相邻的时间复杂度是____。', ['O(1)', 'o(1)', '常数时间'])
  else addBlank('图', '图的深度优先遍历简称____。', ['DFS', 'dfs', '深度优先搜索'])
}

const selfMadeCount = dsQuestions.length
const selfMadeSingleCount = dsQuestions.filter((question) => question.type === 'single').length
const selfMadeBlankCount = dsQuestions.filter((question) => question.type === 'blank').length

function addOriginalChoice(topic, stem, options, correctKey, extra = {}) {
  addChoice(topic, stem, options, correctKey, { ...extra, tags: [topic, '原例题'] })
}

function addOriginalBlank(topic, stem, answers, extra = {}) {
  addBlank(topic, stem, answers, { ...extra, tags: [topic, '原例题'] })
}

addOriginalChoice('栈', '在非空双向循环链表中由 q 所指结点前面插入一个由 p 所指的链结点，若已执行 p->rlink=q; p->llink=q->llink; q->llink=p; 则还应执行哪条语句？', ['q->rlink=p;', 'q->llink->rlink=p;', 'p->rlink->rlink=p;', 'p->llink->rlink=p;'], 'D')
addOriginalChoice('栈', '设一个栈的输入序列是 1,2,3,4,5，则下列序列中，是栈的合法输出序列的是？', ['5 1 2 3 4', '4 5 1 3 2', '4 3 1 2 5', '3 2 1 5 4'], 'D')
addOriginalChoice('栈', '一个栈的进栈序列是 a,b,c,d,e，则栈的不可能的输出序列是？', ['edcba', 'decba', 'dceab', 'abcde'], 'C')
addOriginalChoice('栈', '设有一顺序栈 S，元素 a,b,c,d,e,f,g,h 依次进栈，如果 8 个元素出栈的顺序是 d,f,e,c,h,g,b,a，则栈的容量至少应该是？', ['3', '4', '5', '6'], 'C')
addOriginalChoice('栈', '中缀表达式 A-(B+C/D)*E 的后缀形式是？', ['ABC+D/×E-', 'ABCD/+E×-', 'AB-C+D/E×', 'ABC-+D/E×'], 'B')
addOriginalChoice('栈', '递归过程或函数调用时，处理参数及返回地址，要用一种称为什么的数据结构？', ['队列', '多维数组', '栈', '线性表'], 'C')
addOriginalChoice('栈', '栈和队都是？', ['顺序存储的线性结构', '链式存储的非线性结构', '限制存取点的线性结构', '限制存取点的非线性结构'], 'C')
addOriginalChoice('栈', '设栈 S 和队列 Q 初始为空，元素 e1,e2,e3,e4,e5,e6 依次通过栈 S，一个元素出栈后即进队列 Q，若 6 个元素出队序列为 e2,e4,e3,e6,e5,e1，则栈 S 的容量至少为？', ['6', '4', '3', '2'], 'C')
addOriginalChoice('队列', '若栈和队列都采用顺序存储结构，则下列说法正确的是？', ['任何情况下都可以进行出栈操作。', '任何情况下都可以进行进栈操作。', '队不为空时可以进行出队操作。', '任何情况下都可以进行入队操作。'], 'C')
addOriginalChoice('队列', '允许对队列进行的操作有？', ['对队列中的元素排序', '取出最近进队的元素', '在队头元素之前插入元素', '删除队头元素'], 'D')
addOriginalChoice('队列', '为解决计算机主机与打印机之间速度不匹配问题，通常设置一个打印数据缓冲区，主机将要输出的数据依次写入该缓冲区，而打印机则依次从该缓冲区中取出数据。该缓冲区的逻辑结构应该是？', ['栈', '队列', '树', '图'], 'B')
addOriginalChoice('队列', '已知循环队列存储在一维数组 A[0..n-1] 中，且队列非空时 front 和 rear 分别指向队头元素和队尾元素。若初始时队列为空，且要求第 1 个进入队列的元素存储在 A[0] 处，则初始时 front 和 rear 的值分别是？', ['0,0', '0,n-1', 'n-1,0', 'n-1,n-1'], 'B')
addOriginalChoice('队列', '若用一个大小为 6 的数组来实现循环队列，且当前 rear 和 front 的值分别为 0 和 3，当从队列中删除一个元素，再加入两个元素后，rear 和 front 的值分别为多少？', ['1 和 5', '2 和 4', '4 和 2', '5 和 1'], 'B')

addOriginalBlank('栈', '下列程序判断字符串 s 是否对称，对称则返回 1，否则返回 0。函数形参应填写____。', ['char s[]', 'char *s', 'char* s'])
addOriginalBlank('栈', '下列程序判断字符串 s 是否对称：int i=0,j=0; while(s[j])____; 该空应填写____。', ['j++', '++j', 'j=j+1', 'j+=1'])
addOriginalBlank('栈', '下列程序判断字符串 s 是否对称，比较结束后 return(____); 该空可填写____。', ['i>=j?1:0', 'i<j?0:1', 'i>=j', 'i==j||i==j+1', 's[i]==s[j]'])
addOriginalBlank('栈', '用 S 表示入栈操作，X 表示出栈操作。若元素入栈顺序为 1234，为得到 1342 出栈顺序，相应的 S 和 X 操作串为____。', ['SXSSXSXX'])
addOriginalBlank('栈', '已知一个栈的入栈序列是 1,2,3,...,30，其输出序列是 p1,p2,p3,...,pn，若 p1=30，则 p10 为____。', ['21'])
addOriginalBlank('栈', '若某栈初始为空，进栈序列 a,b,c,d,e 经过 PUSH,PUSH,POP,PUSH,POP,PUSH,PUSH 后，得到的出栈序列是____。（答案用英文逗号隔开）', ['b,c', 'b, c', '"b,c"', '"b, c"'])
addOriginalBlank('栈', '中缀表达式 3+x*(2.4/5-6) 所对应的后缀表达式为____。（中间有无空格均可）', ['3x2.45/6-*+', '3 x 2.4 5 / 6 - * +'])
addOriginalBlank('栈', '栈 R 从顶到底为 {2,4,6,8,10}，逐个取出放入队列 Q 中，再从 Q 中逐个取出放入 R 中，问现在栈 R 中从顶到底的顺序为____。输出格式如 {1,2,3,4,5}', ['{10,8,6,4,2}'])
addOriginalBlank('栈', '有一后缀表达式为 abcde+*/，对应的中缀表达式为____。', ['a*(b/(c*(d+e)))'])

addOriginalChoice('树', '在一棵度为 4 的树 T 中，若有 20 个度为 4 的结点，10 个度为 3 的结点，1 个度为 2 的结点，10 个度为 1 的结点，则树 T 的叶子结点个数是？', ['41', '82', '113', '122'], 'B')
addOriginalChoice('树', '一个满二叉树有 m 个树枝，n 个结点，其深度为 h，则下列关系正确的是？', ['n=h+m', 'h+m=2n', 'm=h-1', 'n=2^h-1'], 'D')
addOriginalChoice('树', '若二叉树的前序序列与后序序列的次序正好相反，则该二叉树一定是什么样的二叉树？', ['空或仅有一个结点', '其分支结点无左子树', '其分支结点无右子树', '其分支结点的度都为 1'], 'D')
addOriginalChoice('树', '将森林 F 转换为对应的二叉树 T，F 中叶结点的个数等于什么？', ['T 中叶结点的个数', 'T 中度为 1 的结点个数', 'T 中左孩子指针为空的结点个数', 'T 中右孩子指针为空的结点个数'], 'C')
addOriginalChoice('树', '当一棵有 n 个结点的二叉树按层次从上到下、同层次从左到右将数据存放在一维数组 A[1..n] 中时，数组中第 i 个结点的左孩子为？', ['A[2i](2i<=n)', 'A[2i+1](2i+1<=n)', 'A[i/2]', '无法确定'], 'D')
addOriginalChoice('树', '已知一算术表达式的中缀形式为 A+B*C-D/E，后缀形式为 ABC*+DE/-，其前缀形式为？', ['-A+B*C/DE', '-A+B*CD/E', '-+*ABC/DE', '-+A*BC/DE'], 'D')
addOriginalChoice('树', '在二叉查找树中进行查找的效率与什么有关？', ['二叉查找树的深度', '二叉查找树的结点个数', '被查找结点的度', '二叉查找树的存储结构'], 'A')
addOriginalChoice('树', '5 个字符有如下 4 种编码方案，其中不是前缀编码的是？', ['0, 10, 110, 1111', '11, 10, 001, 101, 0001', '00, 010, 0110, 1000', 'b, c, aa, ac, aba, abb, abc'], 'B')
addOriginalChoice('树', '由带权为 3,9,6,2,5 的五个叶子结点构成一棵哈夫曼树，则带权路径长度为？', ['54', '55', '65', '25'], 'B')
addOriginalChoice('树', '有 11 个叶结点的哈夫曼树共有多少个结点？', ['22', '21', '20', '19'], 'B')

addOriginalBlank('树', '对具有 n 个结点的完全二叉树按层次从上到下、每一层从左到右编号，编号为 i 的结点的双亲结点编号为____，左孩子编号为____，右孩子编号为____。（答案用英文分号隔开）', ['[i/2];2i;2i+1', '⌊i/2⌋;2i;2i+1'])
addOriginalBlank('树', '度为 k 的树中，第 i 层最多有____个结点。（i≥1）', ['k^(i-1)', 'k**(i-1)'])
addOriginalBlank('树', '若一棵满二叉树有 2047 个结点，则该二叉树中叶结点的个数为____。', ['1024'])
addOriginalBlank('树', '已知某完全二叉树采用顺序存储结构，结点的存放次序为 A,B,C,D,E,F,G,H,I,J，则该二叉树的后序序列为____。（答案中不要加入空格及其他符号）', ['HIDJEBFGCA'])
addOriginalBlank('树', '若具有 n 个结点的二叉树采用二叉链表存储结构，则该链表中有____个指针域，其中____个指针域用于链接孩子结点，____个指针域空闲存放着 NULL。（答案用英文分号隔开）', ['2n;n-1;n+1'])
addOriginalBlank('树', '已知二叉树的前序遍历序列为 ABDCEFG，中序遍历序列是 DBCAFEG，则其后序遍历序列为____。', ['DCBFGEA'])
addOriginalBlank('树', '在顺序存储的二叉树中，编号为 i 和 j 的两个结点处在同一层的条件是____。', ['[log2i]==[log2j]', 'floor(log2i)==floor(log2j)'])
addOriginalBlank('树', '如果 A,B,C,D 的值分别为 2,3,4,5，前缀表达式 + - × A B C D 的值为____。', ['7'])
addOriginalBlank('树', '如果 A,B,C,D 的值分别为 2,3,4,5，前缀表达式 - × A + B C D 的值为____。', ['9'])
addOriginalBlank('树', '采用逐点插入法建立序列 (54,28,16,34,73,62,95,60,26,43) 的二叉查找树后，查找数据元素 62 共进行____次元素间的比较。', ['3'])
addOriginalBlank('树', '若以 {4,5,6,7,8} 作为叶子结点的权值构造哈夫曼树，则其带权路径长度是____。', ['69'])

addOriginalChoice('图', '对含有 n 条边的无向图而言，其邻接表中边数为？', ['n', '2n', 'n/2', 'n×n'], 'B')
addOriginalChoice('图', '若具有 n 个顶点的无向图采用邻接矩阵存储方法，该邻接矩阵一定是一个？', ['一般矩阵', '对称矩阵', '对角矩阵', '稀疏矩阵'], 'B')
addOriginalChoice('图', '有 8 个顶点的无向图最多有多少条边？', ['14', '28', '56', '112'], 'B')
addOriginalChoice('图', '在一个图中，所有顶点的度数之和等于图的边数的多少倍？', ['1/2', '1', '2', '4'], 'C')
addOriginalChoice('图', '图的深度优先遍历类似于二叉树的哪种遍历？', ['前序遍历', '中序遍历', '后序遍历', '层次遍历'], 'A')
addOriginalChoice('图', '有一无向图 G=(V,E)，其中 V={a,b,c,d,e,f}，E={(a,b),(a,e),(a,c),(b,d),(c,f),(f,d),(e,c)}，则下面的顶点序列中，哪一个是该图深度优先遍历的一个正确输出序列？', ['a,b,e,c,d,f', 'a,c,f,e,b,d', 'a,e,b,f,c,b', 'a,e,c,f,d,b'], 'D')
addOriginalChoice('图', '任何一个无向连通图的最小生成树有多少棵？', ['只有一棵', '一棵或多棵', '一定有多棵', '可能不存在'], 'B')
addOriginalChoice('图', '用邻接表表示图进行广度优先遍历时，通常采用什么结构实现算法？', ['栈', '队列', '树', '图'], 'B')
addOriginalChoice('图', '对于含有 n 个顶点 e 条边的无向连通图，利用 Kruskal 算法生成最小生成树，其时间复杂度为？', ['O(elog2e)', 'O(e*n)', 'O(e*e)', 'O(nlog2n)'], 'A')
addOriginalChoice('图', '若采用 Dijkstra 算法求图中顶点 A 到其他顶点的最短路径，Path[v] 表示顶点 v 在最短路径上的直接前驱顶点，则最终求得的 Path[E] 为？图的边为 AB=2, AF=4, AC=7, BF=1, BG=2, FE=3, EC=1, ED=2, EG=3, GD=5, CD=5。', ['C', 'D', 'F', 'G'], 'C')

addOriginalBlank('图', '在图 G 的邻接表表示中，每个顶点邻接表中所含的结点数，对于无向图来说等于该顶点的____；对于有向图来说等于该顶点的____。（答案用英文分号隔开）', ['度;入度与出度之和', '度;入度和出度之和'])
addOriginalBlank('图', '有向图 G 用邻接矩阵存储，其第 i 行的所有非无穷大元素个数等于顶点 i 的____。', ['出度'])
addOriginalBlank('图', '在一个具有 n 个顶点的无向连通图中至少有____条边。', ['n-1', 'n - 1'])
addOriginalBlank('图', '假设图 G 可选择的存储方案有邻接矩阵和邻接表两种，若图 G 为稀疏图，则 G 采用____存储较省空间。', ['邻接表'])
addOriginalBlank('图', '如果 n 个顶点的图是一个环，则它有____棵生成树。', ['1'])
addOriginalBlank('图', '对于边集 V1V2=16, V1V4=9, V1V3=10, V4V3=2, V2V3=11, V3V5=14, V2V5=6, V2V6=5, V5V6=1, V4V5=18 的无向连通图，若采用 Prim 算法求最小生成树并第一个选择 V1，则最后一条加入最小生成树的边的权值为____。', ['1'])
addOriginalBlank('图', '对于边集 V1V2=16, V1V4=9, V1V3=10, V4V3=2, V2V3=11, V3V5=14, V2V5=6, V2V6=5, V5V6=1, V4V5=18 的无向连通图，若采用 Kruskal 算法求最小生成树，则最后选择加入最小生成树的边的权值为____。', ['11'])
addOriginalBlank('图', '已知无向带权图的边为 AB=5, AC=3, BC=3, BD=2, CD=1, CF=7, DF=4, DE=7, DG=3, EH=6, FG=2, GH=4，其最小生成树中各边的权重之和为____。', ['21'])
addOriginalBlank('图', '若一个非连通的无向图最多有 28 条边，则该无向图至少有____个顶点。', ['9'])
addOriginalBlank('图', '用迪杰斯特拉算法计算有向图中 A 到 G 的最短路径。边为 AB=3, AC=2, AD=3, BC=3, BE=1, CE=3, DF=3, FC=1, FG=5, EG=1，则 A 到 G 的最短路径为____。（输出序列不要有空格，保持大写）', ['ABEG'])

function optionText(question, key) {
  const option = question.options?.find((item) => item.key === key)
  return option ? `${key}. ${option.text}` : key
}

function answerText(question) {
  if (question.type === 'blank') {
    return [question.correctAnswers?.[0], ...(question.acceptedAnswers ?? [])].filter(Boolean).join('；')
  }
  return (question.correctAnswers ?? []).map((key) => optionText(question, key)).join('；')
}

function topicKnowledge(topic) {
  const descriptions = {
    栈: '知识点：栈是只允许在栈顶进行插入和删除的线性表，典型特征是后进先出，常用于括号匹配、表达式求值、递归调用和受限出栈序列判断。',
    队列: '知识点：队列是只允许队尾入队、队头出队的线性表，典型特征是先进先出；循环队列要特别注意 front、rear 与取模运算。',
    树: '知识点：树和二叉树题通常围绕结点、边、层次编号、遍历序列、二叉查找树和哈夫曼树等性质展开，关键是先确认题目采用的定义和编号规则。',
    图: '知识点：图题常考顶点、边/弧、度、邻接矩阵、邻接表、遍历、最小生成树和最短路径；做题时要先区分有向/无向、连通/非连通、带权/无权。',
  }
  return descriptions[topic] ?? '知识点：本题考查数据结构基础概念、性质或常见算法。'
}

function solvingGuide(question) {
  const topic = question.tags?.[0] ?? '数据结构'
  const stem = question.stem
  if (/双向循环链表|llink|rlink/.test(stem)) {
    return '做法：画出 q 的前驱、q、p 三个结点的指针关系。p 已经指向 q 和 q 的原前驱，q->llink 也已改为 p，最后还要让 p 的左邻结点的右指针指回 p，链才能闭合。'
  }
  if (/输出序列|出栈序列|进栈序列|操作串/.test(stem)) {
    return '做法：按入栈顺序逐个模拟，任何时刻只能弹出当前栈顶；若某个元素尚未入栈或被压在下面却提前出栈，该序列就不合法。'
  }
  if (/后缀表达式|中缀表达式|前缀表达式|表达式/.test(stem)) {
    return '做法：表达式题用栈或表达式树逐步处理。后缀表达式遇到操作数入栈，遇到运算符弹出所需操作数计算；中缀转后缀要按括号和运算符优先级处理。'
  }
  if (/top|顺序栈|栈满|入栈|栈顶/.test(stem)) {
    return '做法：先看 top 的约定。本题库默认 top 指向栈顶元素且空栈为 -1，所以入栈 n 个元素后 top 为 n-1，容量为 n 时栈满条件为 top==n-1。'
  }
  if (/循环队列|front|rear/.test(stem)) {
    return '做法：循环队列下标变化要使用取模。采用少用一个存储单元且 rear 指向队尾后一个位置时，长度通常按 (rear-front+capacity)%capacity 计算，入队更新 rear=(rear+1)%capacity。'
  }
  if (/先进先出|队列|队头|队尾|打印|缓冲区/.test(stem)) {
    return '做法：抓住先进先出这个约束。先进入的数据应先被处理，因此删除发生在队头、插入发生在队尾，适合排队、缓冲和广度优先遍历等场景。'
  }
  if (/广度优先|BFS/.test(stem)) {
    return '做法：广度优先遍历按层推进，需要把刚发现但尚未访问其邻接点的顶点排队保存，因此辅助结构是队列。'
  }
  if (/完全二叉树|编号|双亲|左孩子|右孩子|层次/.test(stem)) {
    return '做法：先确认编号从 1 开始还是从 0 开始。本题库此类题通常按从 1 开始编号：父结点为 floor(i/2)，左孩子为 2i，右孩子为 2i+1，并要检查编号是否越界。'
  }
  if (/满二叉树|叶子|总结点|深度|2\^h/.test(stem)) {
    return '做法：套用满二叉树性质。若叶子数为 L，则总结点数为 2L-1；若深度为 h 且按根为第 1 层，则总结点数为 2^h-1。'
  }
  if (/先序|中序|后序|遍历/.test(stem)) {
    return '做法：记住三种遍历的根结点访问位置：先序是根-左-右，中序是左-根-右，后序是左-右-根；已知先序和中序且结点互异时可唯一还原二叉树。'
  }
  if (/二叉查找树|二叉排序树/.test(stem)) {
    return '做法：二叉查找树左子树关键字小于根、右子树关键字大于根；查找次数取决于树高，中序遍历能得到递增或非递减序列。'
  }
  if (/哈夫曼|带权路径|前缀编码/.test(stem)) {
    return '做法：哈夫曼树每次合并当前最小的两个权值，累计合并代价就是带权路径长度；前缀编码要求任一编码都不能是另一个编码的前缀。'
  }
  if (/无向简单图最多|有向简单图最多|度数之和|顶点|边|弧/.test(stem)) {
    return '做法：先区分有向图和无向图。n 个顶点的无向简单图最多 n(n-1)/2 条边，有向简单图最多 n(n-1) 条弧；无向图度数和等于 2 倍边数。'
  }
  if (/邻接矩阵|邻接表|稀疏图/.test(stem)) {
    return '做法：邻接矩阵适合快速判断两点是否相邻，查询可达 O(1)，但空间通常为 O(n^2)；稀疏图更适合邻接表，无向图邻接表中每条边会出现两次。'
  }
  if (/深度优先|DFS/.test(stem)) {
    return '做法：深度优先遍历沿一条路径尽量向深处访问，回退过程依赖递归调用栈或显式栈，访问风格类似二叉树先序遍历。'
  }
  if (/Prim|Kruskal|最小生成树|生成树/.test(stem)) {
    return '做法：最小生成树要连接全部顶点且不形成回路，共有 n-1 条边。Prim 从已选顶点集合向外扩展最小边，Kruskal 按边权从小到大选不成环的边。'
  }
  if (/Dijkstra|最短路径|Path/.test(stem)) {
    return '做法：Dijkstra 每轮确定当前距离最小的未确定顶点，并用它松弛相邻边；Path 数组记录最短路径上的直接前驱，最后按前驱链还原路径。'
  }
  if (topic === '栈') return '做法：把题干转成栈顶变化过程，关注“只能在栈顶操作”和“后进先出”两个限制，再代入对应公式或逐步模拟。'
  if (topic === '队列') return '做法：把题干转成 front、rear 或队头队尾的变化过程，注意入队、出队方向以及循环队列的取模规则。'
  if (topic === '树') return '做法：先判断题目问的是普通树、二叉树、完全二叉树还是特殊树，再使用对应的结点关系、遍历规则或结构性质。'
  if (topic === '图') return '做法：先判断图的类型和存储方式，再选择边数/度数公式、遍历辅助结构或图算法流程进行推导。'
  return '做法：先识别题干关键词，再将其对应到课堂中的定义、性质或算法步骤，最后代入数据计算或排除不满足条件的选项。'
}

function explainQuestion(question) {
  if (question.subjectId !== 'data-structure') {
    const { explanation, ...withoutExplanation } = question
    return withoutExplanation
  }
  const topic = question.tags?.[0] ?? '数据结构基础'
  const prefix = `${topicKnowledge(topic)} ${solvingGuide(question)}`
  if (question.type === 'blank') {
    return {
      ...question,
      explanation: `${prefix} 本题填空可写为「${answerText(question)}」。判分时会对大小写、空格和常见中英文标点做归一化处理。`,
    }
  }
  if (question.type === 'multiple') {
    return {
      ...question,
      explanation: `${prefix} 本题为多选题，正确选项是 ${answerText(question)}，需要全部选中且不多选才算正确。`,
    }
  }
  return {
    ...question,
    explanation: `${prefix} 因此正确选项是 ${answerText(question)}。排除其他选项时，重点看它们是否违反题干约定、基本性质或计算结果。`,
  }
}

if (selfMadeCount !== 200 || selfMadeSingleCount !== 100 || selfMadeBlankCount !== 100) {
  throw new Error('数据结构自命题数量异常')
}
if (dsQuestions.length !== 263) {
  throw new Error(`数据结构总题量异常：${dsQuestions.length}`)
}

const allQuestions = [...baseQuestions, ...dsQuestions].map(explainQuestion)
writeFileSync(bankPath, `${JSON.stringify(allQuestions, null, 2)}\n`)
console.log(`已生成数据结构题库：${dsQuestions.length} 道，其中自命题 200 道，原例题 ${dsQuestions.length - selfMadeCount} 道。`)
