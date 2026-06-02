import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { duplicateSupplementQuestions, extraFoundationQuestions } from './data/ds-extra-foundation-questions.mjs'
import { homework7Questions } from './data/ds-homework7-questions.mjs'
import { mdExamQuestions } from './data/ds-md-exam-questions.mjs'

const root = resolve(import.meta.dirname, '..')
const bankDir = join(root, 'resources/question-bank')
const bankPath = join(bankDir, 'data-structure/questions.json')
const manifestPath = join(bankDir, 'manifest.json')
const assetDir = join(bankDir, 'ds-assets')
const sourceDir = '/Users/muzermat/Documents/ds-xtlt'
const homework7Dir = join(sourceDir, '7')
const imageExamplesPath = join(root, 'scripts/data/ds-image-examples.json')

const questions = []
let sourceNumber = 1

function nextId() {
  return `ds1-${String(sourceNumber).padStart(3, '0')}`
}

function normalizeOptions(options) {
  return options.map((text, index) => ({ key: String.fromCharCode(65 + index), text }))
}

function addQuestion(question) {
  const { sourceTag, ...payload } = question
  questions.push({
    id: nextId(),
    sourceNumber,
    subjectId: 'data-structure',
    ...payload,
    tags: [...new Set([...(payload.tags ?? []), sourceTag].filter(Boolean))],
  })
  sourceNumber += 1
}

function addSingle(tag, stem, options, correctKey, explanation, extra = {}) {
  addQuestion({
    type: 'single',
    stem,
    options: normalizeOptions(options),
    correctAnswers: [correctKey],
    explanation,
    tags: [tag],
    ...extra,
  })
}

function addBlank(tag, stem, answer, explanation, extra = {}) {
  const answers = Array.isArray(answer) ? answer.map(String) : [String(answer)]
  addQuestion({
    type: 'blank',
    stem,
    options: [],
    correctAnswers: [answers[0]],
    acceptedAnswers: answers.slice(1),
    explanation,
    tags: [tag],
    ...extra,
  })
}

function copyAllImages() {
  rmSync(assetDir, { recursive: true, force: true })
  mkdirSync(assetDir, { recursive: true })
  if (!existsSync(sourceDir)) return 0
  const files = []
  const walk = (directory) => {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, file.name)
      if (file.isDirectory()) walk(fullPath)
      else if (/\.(png|jpe?g|webp|svg)$/i.test(file.name)) files.push(fullPath)
    }
  }
  walk(sourceDir)
  const homework7Prefix = `${homework7Dir}/`
  const homework7Files = files.filter((file) => file.startsWith(homework7Prefix))
  const legacyFiles = files.filter((file) => !file.startsWith(homework7Prefix))
  legacyFiles.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  homework7Files.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const orderedFiles = [...legacyFiles, ...homework7Files]
  orderedFiles.forEach((file, index) => {
    const targetName = `ds1-source-${String(index + 1).padStart(3, '0')}${extname(file).toLowerCase()}`
    copyFileSync(file, join(assetDir, targetName))
  })
  return orderedFiles.length
}

function addImageExamples() {
  if (!existsSync(imageExamplesPath)) return 0
  const examples = JSON.parse(readFileSync(imageExamplesPath, 'utf8'))
  for (const example of examples) {
    addQuestion({
      ...example,
      sourceTag: '图片例题',
      tags: [...(example.tags ?? []).filter((tag) => tag !== '原例题'), '图片例题'],
    })
  }
  return examples.length
}

function addMdExamQuestions() {
  for (const question of mdExamQuestions) {
    addQuestion(question)
  }
  return mdExamQuestions.length
}

function addExtraFoundationQuestions() {
  for (const question of extraFoundationQuestions) {
    addQuestion(question)
  }
  return extraFoundationQuestions.length
}

function addHomework7Questions() {
  for (const question of homework7Questions) {
    addQuestion(question)
  }
  return homework7Questions.length
}

function normalizeStem(stem) {
  return String(stem)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[，。；：、,.!?！？;:()（）\[\]【】"'“”‘’`*_<>《》-]/g, '')
    .toLowerCase()
}

function deduplicateAndSupplement(targetQuestions, supplements) {
  const expectedCount = targetQuestions.length
  const seen = new Set()
  const deduped = []
  const removed = []
  for (const question of targetQuestions) {
    const key = normalizeStem(question.stem)
    if (seen.has(key)) {
      removed.push(question)
      continue
    }
    seen.add(key)
    deduped.push(question)
  }

  const usedSupplements = []
  for (const supplement of supplements) {
    if (deduped.length >= expectedCount) break
    const key = normalizeStem(supplement.stem)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push({
      id: '',
      sourceNumber: 0,
      subjectId: 'data-structure',
      ...supplement,
      tags: [...new Set([...(supplement.tags ?? []), '自主命题', '去重补题'])],
    })
    usedSupplements.push(supplement)
  }

  const reindexed = deduped.map((question, index) => ({
    ...question,
    id: `ds1-${String(index + 1).padStart(3, '0')}`,
    sourceNumber: index + 1,
    subjectId: 'data-structure',
  }))

  return {
    questions: reindexed,
    removedCount: removed.length,
    supplementCount: usedSupplements.length,
  }
}

const choiceUnits = [
  ['字符串', 'C 字符串以什么作为结束标志？', ['\\0', '\\n', 'EOF', '空格'], 'A', 'C 字符串在字符数组中以空字符 \\0 结束，strlen 等函数依赖该标志判断字符串终点。'],
  ['字符串', '若 char s[]=\"abc\"，数组 s 至少占几个字符空间？', ['4', '3', '2', '5'], 'A', '字符串字面量会自动追加结束符 \\0，所以 a、b、c 加 \\0 共 4 个字符。'],
  ['字符串', 'strcmp(s1,s2)==0 表示什么？', ['两个字符串内容相等', '两个指针地址相等', 's1 长度大于 s2', 's1 是空串'], 'A', 'strcmp 比较字符串内容，返回 0 表示逐字符比较后完全相同。'],
  ['字符串', '读取可能包含空格的一行文本时，scanf(\"%s\",s) 的主要问题是？', ['遇到空白会停止', '不能读取字母', '一定越界', '会自动排序'], 'A', '%s 以空白分隔输入，遇到空格、换行等会停止读取。'],
  ['字符串', 'strcpy(dest,src) 使用时最需要保证什么？', ['dest 空间足够容纳 src 和 \\0', 'src 必须比 dest 短 1 个字符', 'dest 必须是全局变量', 'src 不能有字母'], 'A', 'strcpy 会复制源串和结尾 \\0，目标数组空间不足会越界。'],
  ['字符串', 'char s[10]=\"hi\" 后，s[2] 的值是？', ['\\0', 'i', 'h', '未定义'], 'A', '字符串 hi 存为 h、i、\\0，因此下标 2 是结束符。'],
  ['字符串', 'strlen(\"A\\0B\") 的结果是？', ['1', '2', '3', '4'], 'A', 'strlen 遇到第一个 \\0 就停止，字符串有效长度只包含 A。'],
  ['字符串', '字符串数组下标从 0 开始，s[0] 表示什么？', ['第一个字符', '字符串长度', '结束符位置', '最后一个字符'], 'A', 'C 数组下标从 0 开始，s[0] 访问首字符。'],

  ['结构体', '访问结构体变量 stu 的成员 age，应使用哪种写法？', ['stu.age', 'stu->age', '*stu.age', '&stu.age()'], 'A', 'stu 是结构体变量本身，成员访问使用点运算符。'],
  ['结构体', '若 p 是指向结构体变量的指针，访问成员 no 应写作？', ['p->no', 'p.no', '*p.no', '&p->no()'], 'A', '结构体指针访问成员使用箭头运算符，p->no 等价于 (*p).no。'],
  ['结构体', '结构体数组 a[5] 中第 3 个元素的下标是？', ['2', '3', '4', '5'], 'A', '数组下标从 0 开始，第 3 个元素是 a[2]。'],
  ['结构体', 'typedef struct Node Node; 的主要作用是？', ['为结构体类型起别名', '创建一个结点变量', '释放结构体内存', '比较两个结构体'], 'A', 'typedef 用于给已有类型定义别名，便于后续直接使用 Node。'],
  ['结构体', '结构体适合表示学生信息的原因是？', ['可把不同类型字段组合为一个整体', '只能保存一个整数', '会自动排序', '只能用于链表'], 'A', '学生信息通常包含姓名、学号、成绩等不同类型字段，结构体能统一封装。'],
  ['结构体', '结构体变量之间进行整体赋值时，C 语言通常会怎样？', ['逐字段拷贝整个结构体内容', '只拷贝第一个成员', '只拷贝指针地址', '禁止赋值'], 'A', '同类型结构体变量可以整体赋值，效果是把各成员值复制过去。'],
  ['结构体', '链表结点结构体中保存 next 指针的目的是什么？', ['指向后继结点', '保存结点个数', '保存数组长度', '指向自身数据域'], 'A', '单链表通过 next 指针把当前结点连接到下一个结点。'],
  ['结构体', '结构体定义末尾为什么需要分号？', ['结构体定义是一条声明', '表示成员结束符', '用于初始化数组', '表示空指针'], 'A', 'struct 类型定义属于声明语句，右花括号之后仍需分号结束。'],

  ['指针', 'int *p 中，p 的含义是？', ['指向 int 的指针变量', 'int 类型常量', '数组长度', '函数返回值'], 'A', '星号说明 p 保存的是 int 对象的地址。'],
  ['指针', '&x 表示什么？', ['变量 x 的地址', '变量 x 的值加 1', '变量 x 的类型', '释放 x'], 'A', '& 是取地址运算符，得到变量在内存中的地址。'],
  ['指针', '*p 作为表达式通常表示什么？', ['p 指向对象的值', 'p 自身地址', 'p 的字节数', '空指针'], 'A', '* 是间接访问运算符，用来访问指针所指向的对象。'],
  ['指针', '指针 p 为 NULL 时，直接 *p 会怎样？', ['产生非法访问风险', '得到 0', '自动分配空间', '返回数组长度'], 'A', 'NULL 不指向有效对象，解引用会导致未定义行为。'],
  ['指针', '数组名 a 在多数表达式中会转换为什么？', ['首元素地址', '数组长度', '最后元素地址', '空字符串'], 'A', '数组名在表达式中通常退化为指向首元素的指针。'],
  ['指针', 'p++ 对 int *p 的影响是？', ['指向下一个 int 元素', '地址只加 1 bit', 'p 指向 NULL', 'p 的值不变'], 'A', '指针自增按所指类型大小移动，int* 会移动到下一个 int。'],
  ['指针', '函数想修改实参变量 x 的值，常把什么传入函数？', ['x 的地址', 'x 的副本', '字符串常量', '结构体类型名'], 'A', '传入地址后函数可通过指针间接修改原变量。'],
  ['指针', '野指针最准确的描述是？', ['指向无效或已释放内存的指针', '值为 NULL 的安全指针', '只读指针', '数组首地址'], 'A', '野指针不再指向有效对象，解引用风险很高。'],

  ['链表', '单链表中每个结点通常包含数据域和什么？', ['指针域', '栈顶', '队头', '邻接矩阵'], 'A', '数据域保存元素，指针域保存后继结点地址。'],
  ['链表', '在已知前驱结点 pre 的情况下，单链表插入新结点 p 的关键顺序是？', ['先 p->next=pre->next，再 pre->next=p', '先 pre=NULL', '先释放 pre', '只改 p 的数据域'], 'A', '先让新结点接上原后继，再让前驱指向新结点，避免丢失后续链。'],
  ['链表', '删除单链表中 pre 后面的结点时，为什么需要保存待删结点指针？', ['释放内存且接上后继', '重新排序', '计算哈希', '创建头结点'], 'A', '删除时要用 q=pre->next 保存目标，再让 pre->next=q->next 并释放 q。'],
  ['链表', '带头结点单链表为空时通常满足什么？', ['head->next == NULL', 'head == NULL', 'head->next == head', 'head->data == 0'], 'A', '带头结点时 head 本身存在，空表表示没有第一个数据结点。'],
  ['链表', '单链表不支持按下标 O(1) 访问的原因是？', ['必须从头沿 next 逐个查找', '不能保存整数', '没有内存地址', '只能顺序存储'], 'A', '单链表只知道后继指针，定位第 i 个结点要逐步移动。'],
  ['链表', '循环链表的尾结点 next 通常指向哪里？', ['头结点或首元结点', 'NULL', '尾结点自身一定', '随机结点'], 'A', '循环链表通过尾结点指回头部形成环，不以 NULL 结束。'],
  ['链表', '双向链表比单链表多出的主要指针是？', ['前驱指针', '栈顶指针', '队尾指针', '根指针'], 'A', '双向链表结点既保存后继，也保存前驱，便于双向移动。'],
  ['链表', '尾插法建立链表时，rear 指针通常指向什么？', ['当前尾结点', '头结点前一个位置', '待删结点', '第一个空地址'], 'A', '尾插法每次把新结点接到 rear 后面，再把 rear 移到新尾结点。'],

  ['栈', '栈的逻辑特征是？', ['后进先出', '先进先出', '随机访问', '按权值删除'], 'A', '栈只在栈顶插入和删除，最后入栈的元素最先出栈。'],
  ['栈', '顺序栈 top 指向栈顶元素，空栈 top=-1，压入 4 个元素后 top 为？', ['3', '4', '2', '-1'], 'A', '压入 4 个元素占下标 0 到 3，栈顶下标为 3。'],
  ['栈', '后缀表达式求值最适合使用什么结构？', ['栈', '队列', '无向图', '邻接表'], 'A', '后缀表达式遇到操作数入栈，遇到运算符弹出最近操作数计算。'],
  ['栈', '括号匹配遇到左括号时应执行什么？', ['入栈', '出队', '建树', '排序'], 'A', '左括号等待最近的右括号匹配，符合栈的后进先出。'],
  ['栈', '空栈执行 pop 属于什么错误？', ['下溢', '上溢', '冲突', '满队'], 'A', '栈中没有元素却删除，称为下溢。'],
  ['栈', '递归调用返回顺序符合什么结构？', ['栈', '队列', '散列表', '文件'], 'A', '后调用的函数先返回，与栈的后进先出一致。'],
  ['栈', '入栈序列 a,b,c，出栈序列 c,b,a 是否可能？', ['可能', '不可能', '只有队列可能', '无法判断'], 'A', '依次压入 a,b,c 后连续弹出，得到 c,b,a。'],
  ['栈', '中缀表达式 A+B*C 的后缀式是？', ['ABC*+', 'AB+C*', 'A*BC+', '+A*BC'], 'A', '乘法优先，B*C 先形成 BC*，再与 A 加，得到 ABC*+。'],

  ['队列', '队列的逻辑特征是？', ['先进先出', '后进先出', '按权值删除', '随机访问'], 'A', '队列从队尾插入、队头删除，先进入的元素先离开。'],
  ['队列', '循环队列容量 8，front=5，rear=1，rear 指向下一个位置时长度为？', ['4', '5', '6', '1'], 'A', '长度为 (rear-front+8)%8=(1-5+8)%8=4。'],
  ['队列', '循环队列少用一个单元时，判空条件是？', ['front == rear', '(rear+1)%n == front', 'front == -1', 'rear == n'], 'A', '少用一个单元时用 front==rear 表示空。'],
  ['队列', '循环队列少用一个单元时，判满条件是？', ['(rear+1)%n == front', 'front == rear', 'front == 0', 'rear == -1'], 'A', 'rear 再前进一步到 front，说明没有可用空位。'],
  ['队列', 'BFS 通常使用什么保存待访问顶点？', ['队列', '栈', '二叉排序树', '哈夫曼树'], 'A', 'BFS 按发现先后扩展顶点，需要先进先出的队列。'],
  ['队列', '链队列入队一般插入到哪一端？', ['队尾', '队头', '栈顶', '根结点'], 'A', '普通队列从队尾插入、队头删除。'],
  ['队列', '打印任务缓冲区适合队列是因为？', ['先提交先打印', '后提交先打印', '按文件名排序', '按树高输出'], 'A', '公平的打印服务通常遵循先到先服务，与队列一致。'],
  ['队列', '普通顺序队列可能出现前部空闲但不能再入队的现象称为？', ['假溢出', '下溢', '哈希冲突', '环路'], 'A', 'rear 到数组末尾后即使前面有空位也无法利用，称为假溢出。'],

  ['树', '二叉树第 5 层最多有几个结点？', ['16', '8', '31', '32'], 'A', '第 i 层最多 2^(i-1) 个结点，第 5 层为 16。'],
  ['树', '含 10 个叶结点的哈夫曼树共有几个结点？', ['19', '20', '21', '10'], 'A', '哈夫曼树没有度为 1 的结点，总结点数为 2L-1=19。'],
  ['树', '先序遍历的访问顺序是？', ['根、左、右', '左、根、右', '左、右、根', '右、左、根'], 'A', '先序遍历先访问根，再递归访问左子树和右子树。'],
  ['树', '中序遍历二叉排序树可得到什么序列？', ['有序序列', '逆层次序列', '随机序列', '后缀表达式'], 'A', '二叉排序树左小右大，中序遍历得到按关键字递增的序列。'],
  ['树', '完全二叉树编号 i 的左孩子编号是？', ['2i', '2i+1', 'i/2', 'i-1'], 'A', '按 1 开始的层次编号，左孩子为 2i，右孩子为 2i+1。'],
  ['树', '构造哈夫曼树时每次合并哪两个权值？', ['最小的两个', '最大的两个', '最早输入的两个', '最后输入的两个'], 'A', '哈夫曼算法每次选当前最小的两个权值合并。'],
  ['树', '树中除根外每个结点有几个父结点？', ['1', '0', '2', '任意多个'], 'A', '树的定义要求非根结点有且只有一个直接前驱。'],
  ['树', '二叉树层次遍历通常借助什么结构？', ['队列', '栈', '堆', '散列表'], 'A', '层次遍历按层从左到右访问，需队列保存下一层结点。'],

  ['图', 'n 个顶点的连通无向图至少有几条边？', ['n-1', 'n', '2n', 'n(n-1)'], 'A', '最少连通结构是一棵生成树，边数为 n-1。'],
  ['图', '无向图所有顶点度数之和等于什么？', ['边数的 2 倍', '边数', '顶点数', '顶点数的 2 倍'], 'A', '每条无向边贡献两个端点的度，因此总度数为 2e。'],
  ['图', '邻接矩阵适合快速判断什么？', ['两个顶点是否相邻', '字符串长度', '栈是否为空', '树的前序'], 'A', '直接访问 matrix[i][j] 即可判断顶点 i 和 j 是否有边。'],
  ['图', '稀疏图通常更适合哪种存储？', ['邻接表', '邻接矩阵', '顺序栈', '循环队列'], 'A', '邻接表只保存实际边，稀疏图空间开销更小。'],
  ['图', 'Prim 算法用于求什么？', ['最小生成树', '最短编辑距离', '字符串长度', '栈容量'], 'A', 'Prim 每次选连接已选集合与未选顶点的最小边，构造最小生成树。'],
  ['图', 'Dijkstra 算法一般要求边权满足什么？', ['非负', '全为负', '全为 0', '必须相等'], 'A', 'Dijkstra 确定最短距离后不再回退，负权边会破坏该性质。'],
  ['图', '拓扑排序适用于什么图？', ['有向无环图', '无向完全图', '带负权环图', '任意树'], 'A', '有向依赖关系无环时才存在拓扑序。'],
  ['图', '判断无向图连通性可以从任意顶点开始进行什么？', ['DFS 或 BFS', '哈夫曼合并', '字符串复制', '结构体赋值'], 'A', '从一个顶点遍历，若能访问全部顶点，则图连通。'],

  ['排序', '冒泡排序一趟扫描的主要效果通常是？', ['把一个最大或最小元素交换到最终位置', '立即得到哈夫曼树', '删除所有逆序对', '建立邻接矩阵'], 'A', '相邻元素比较交换，一趟可把当前最大或最小元素推到一端。'],
  ['排序', '直接插入排序对什么初始序列效率较高？', ['基本有序序列', '完全随机且很长序列', '必须无重复序列', '图结构序列'], 'A', '基本有序时移动元素较少，插入排序表现较好。'],
  ['排序', '快速排序的核心操作是？', ['划分', '入队', '哈夫曼合并', '层次遍历'], 'A', '快速排序选枢轴并把序列划分为两部分，再递归处理。'],
  ['排序', '稳定排序的含义是？', ['相等关键字相对次序不变', '时间复杂度不变', '空间复杂度为 0', '一定最快'], 'A', '稳定性关注相等关键字记录排序前后的相对顺序。'],
  ['排序', '选择排序每趟通常选择什么？', ['未排序区最小或最大元素', '队头元素', '根结点', '字符串结束符'], 'A', '选择排序从未排序区选择极值放到最终位置。'],
  ['排序', '归并排序的主要思想是？', ['分治后合并有序子序列', '只交换相邻元素', '只用一个栈', '构造最小生成树'], 'A', '归并排序先分解，再把有序子序列合并。'],
  ['排序', '堆排序利用的数据结构是？', ['堆', '队列', '普通链表', '邻接表'], 'A', '堆排序通过维护大顶堆或小顶堆选择极值。'],
  ['排序', '一趟冒泡排序中比较的是哪类元素？', ['相邻元素', '任意两个顶点', '根和所有叶子', '哈希地址'], 'A', '冒泡排序通过相邻元素比较和交换逐步移动极值。'],

  ['查找', '顺序查找的基本过程是？', ['从表中逐个比较', '每次折半', '构造哈夫曼树', '只访问根结点'], 'A', '顺序查找从一端开始逐个比较关键字。'],
  ['查找', '折半查找要求待查表通常满足什么？', ['有序且可随机访问', '必须链式存储', '必须无重复', '必须是图'], 'A', '折半查找依赖中间位置比较并缩小范围，因此要求有序顺序表。'],
  ['查找', '折半查找每次比较后搜索范围大约如何变化？', ['减半', '增加一倍', '不变', '清空'], 'A', '根据中间元素大小关系，可舍弃一半区间。'],
  ['查找', '二叉排序树查找效率主要取决于什么？', ['树的高度', '叶子颜色', '字符串长度', '队列容量'], 'A', '查找沿根到目标结点路径进行，比较次数与高度密切相关。'],
  ['查找', '散列表查找的理想时间复杂度接近？', ['O(1)', 'O(n)', 'O(n^2)', 'O(log n!)'], 'A', '理想情况下散列函数直接定位桶，平均查找接近常数时间。'],
  ['查找', '两个不同关键字得到同一散列地址称为什么？', ['冲突', '遍历', '入栈', '合并'], 'A', '不同关键字映射到同一地址就是散列冲突。'],
  ['查找', '链地址法处理冲突时，同义词通常存在哪里？', ['同一地址对应的链表中', '栈底', '二叉树根', '字符串结尾'], 'A', '链地址法为每个散列地址维护链表，冲突元素接入同一链。'],
  ['查找', '索引查找中索引表的作用是？', ['缩小查找范围', '保存所有图边', '替代字符串结束符', '实现递归'], 'A', '先查索引定位块或范围，再在对应部分继续查找。'],
]

const blankUnits = [
  ['字符串', 'C 字符串的结束标志是____。', '\\0', '字符串函数依赖空字符 \\0 判断字符串结束。'],
  ['字符串', 'char s[]=\"abc\" 占用____个字符空间。', '4', 'a、b、c 加自动追加的 \\0，共 4 个。'],
  ['字符串', 'strlen(\"abc\") 的结果是____。', '3', 'strlen 统计 \\0 之前的字符个数，abc 有 3 个字符。'],
  ['字符串', '字符串复制函数 strcpy 会连同结尾的____一起复制。', '\\0', '目标串必须包含结束标志，否则不是合法 C 字符串。'],
  ['字符串', '若 s=\"hello\"，s[1] 是字符____。', 'e', '下标从 0 开始，s[0]=h，s[1]=e。'],
  ['字符串', 'strcmp 两串内容相等时返回____。', '0', 'strcmp 返回 0 表示两字符串逐字符相等。'],
  ['字符串', 'scanf 使用 %s 读取字符串时遇到空格会____。', '停止', '%s 以空白字符作为分隔。'],
  ['字符串', '空串 \"\" 的 strlen 结果为____。', '0', '空串第一个字符就是 \\0，有效字符数为 0。'],

  ['结构体', '结构体变量 stu 访问成员 score 的写法是____。', 'stu.score', '结构体变量本身访问成员使用点运算符。'],
  ['结构体', '结构体指针 p 访问成员 next 的写法是____。', 'p->next', '结构体指针访问成员使用箭头运算符。'],
  ['结构体', 'p->data 等价于____。', '(*p).data', '箭头运算符是先解引用结构体指针再访问成员。'],
  ['结构体', '结构体定义结束的右花括号后需要写____。', ';', '结构体定义是声明语句，需要分号结束。'],
  ['结构体', '链表结点中保存后继地址的成员常命名为____。', 'next', 'next 指针用于连接当前结点的后继结点。'],
  ['结构体', '结构体数组 a 的第一个元素写作____。', 'a[0]', '数组下标从 0 开始。'],
  ['结构体', 'typedef 的作用是给类型定义____。', '别名', 'typedef 可以让复杂类型拥有更简洁的名字。'],
  ['结构体', '同类型结构体变量整体赋值会复制各个____。', '成员', '结构体整体赋值会把成员值逐一复制。'],

  ['指针', '&x 取得变量 x 的____。', '地址', '& 是取地址运算符。'],
  ['指针', '*p 表示访问 p 所指向对象的____。', '值', '* 对指针进行间接访问。'],
  ['指针', '空指针常用宏____表示。', 'NULL', 'NULL 表示不指向有效对象的空指针。'],
  ['指针', 'int *p 中，p 指向的数据类型是____。', 'int', 'int * 表示指向 int 对象的指针。'],
  ['指针', '数组名在多数表达式中会退化为首元素的____。', '地址', '数组名通常转换为指向首元素的指针。'],
  ['指针', '若 p 指向 a[0]，则 p+1 指向____。', 'a[1]', '指针加 1 会移动到下一个同类型元素。'],
  ['指针', '释放后仍被使用的无效指针常称为____。', '野指针', '野指针指向失效内存，继续使用很危险。'],
  ['指针', '函数通过指针形参修改实参，需要传入实参的____。', '地址', '传地址后可在函数内间接修改原对象。'],

  ['链表', '单链表结点的指针域通常保存____结点地址。', '后继', '单链表靠 next 指向后继结点。'],
  ['链表', '带头结点空单链表满足 head->next == ____。', 'NULL', '头结点存在但没有数据结点时 next 为空。'],
  ['链表', '单链表查找第 i 个结点通常必须从____开始。', '头结点', '单链表不能直接按下标定位，需要从头沿指针移动。'],
  ['链表', '循环单链表尾结点的 next 不为 NULL，而是指向____。', '头结点', '循环链表通过尾指针回到头部形成环。'],
  ['链表', '双向链表结点除 next 外通常还有____指针。', 'prior', 'prior 或 prev 指向前驱结点。'],
  ['链表', '已知前驱 pre 插入 p，应先令 p->next=____。', 'pre->next', '先接住原后继，避免链断开。'],
  ['链表', '尾插法中 rear 通常指向当前____结点。', '尾', 'rear 用于快速把新结点接到链尾。'],
  ['链表', '删除结点后释放内存的 C 函数常用____。', 'free', '动态申请的结点删除后通常用 free 释放。'],

  ['栈', '栈的逻辑特征是____。', '后进先出', '最后入栈的元素最先出栈。'],
  ['栈', '空栈 top=-1，入栈 6 次后 top=____。', '5', '6 个元素占下标 0 到 5。'],
  ['栈', '满栈继续入栈称为____。', '上溢', '顺序栈空间已满仍插入是上溢。'],
  ['栈', '空栈执行出栈称为____。', '下溢', '无元素可删却出栈是下溢。'],
  ['栈', '后缀表达式 4 5 + 的结果为____。', '9', '弹出 4 和 5 相加得到 9。'],
  ['栈', '中缀表达式 A+B*C 的后缀表达式为____。', 'ABC*+', '乘法优先，先输出 BC*，再加 A。'],
  ['栈', '递归调用信息通常保存在运行时____中。', '栈', '后调用先返回符合栈结构。'],
  ['栈', '用 push 表示入栈，pop 表示____。', '出栈', 'pop 是弹出栈顶元素。'],

  ['队列', '队列的逻辑特征是____。', '先进先出', '先入队的元素先出队。'],
  ['队列', '循环队列容量 10，front=7，rear=2，则长度为____。', '5', '(2-7+10)%10=5。'],
  ['队列', '循环队列 front==rear 通常表示____。', '队空', '少用一个单元约定下 front==rear 表示空。'],
  ['队列', '队列允许插入的一端称为____。', '队尾', '普通队列从队尾入队。'],
  ['队列', '队列允许删除的一端称为____。', '队头', '普通队列从队头出队。'],
  ['队列', 'BFS 使用____保存待扩展顶点。', '队列', 'BFS 需要先进先出地扩展顶点。'],
  ['队列', '普通顺序队列 rear 到末尾但前面有空位称为____。', '假溢出', '线性队列不能循环利用前方空位。'],
  ['队列', '循环队列容量 8，rear=7，入队后 rear=____。', '0', '(7+1)%8=0。'],

  ['树', '二叉树第 6 层最多有____个结点。', '32', '第 i 层最多 2^(i-1)，第 6 层为 32。'],
  ['树', '深度为 5 的满二叉树共有____个结点。', '31', '2^5-1=31。'],
  ['树', '有 9 个叶结点的哈夫曼树共有____个结点。', '17', '哈夫曼树总结点数 2L-1=17。'],
  ['树', '完全二叉树编号 12 的父结点编号为____。', '6', '父结点编号 floor(12/2)=6。'],
  ['树', '先序遍历顺序为根、左子树、____。', '右子树', '先序是根左右。'],
  ['树', '后序遍历最后访问____。', '根', '后序顺序是左右根。'],
  ['树', '哈夫曼树中没有度为____的结点。', '1', '哈夫曼内部结点度为 2。'],
  ['树', '树有 n 个结点，则边数为____。', 'n-1', '除根外每个结点对应一条父边。'],

  ['图', '无向图有 12 条边，总度数为____。', '24', '无向图总度数等于 2e。'],
  ['图', '10 个顶点的生成树有____条边。', '9', '树边数为顶点数减 1。'],
  ['图', '无向完全图 K5 有____条边。', '10', 'C(5,2)=10。'],
  ['图', '有向简单图 6 个顶点最多有____条弧。', '30', 'n(n-1)=6×5=30。'],
  ['图', '邻接矩阵空间复杂度通常为____。', 'O(n^2)', 'n 个顶点需要 n×n 个单元。'],
  ['图', '图的深度优先遍历简称____。', 'DFS', 'Depth First Search 的缩写是 DFS。'],
  ['图', '图的广度优先遍历简称____。', 'BFS', 'Breadth First Search 的缩写是 BFS。'],
  ['图', 'Dijkstra 算法用于求单源____路径。', '最短', 'Dijkstra 计算从源点到各顶点的最短路径。'],

  ['排序', '冒泡排序每趟通过相邻元素____移动极值。', '交换', '相邻比较后交换逆序元素，极值逐步冒到一端。'],
  ['排序', '快速排序的核心步骤是____。', '划分', '选枢轴后把序列划分成两侧。'],
  ['排序', '直接插入排序在序列基本有序时移动次数较____。', '少', '基本有序时元素只需少量移动。'],
  ['排序', '稳定排序保持相等关键字记录的相对____不变。', '次序', '稳定性定义关注相等元素的原有相对顺序。'],
  ['排序', '选择排序每趟从未排序区选择____元素。', '最小', '升序选择排序每趟选择最小元素放到前面。'],
  ['排序', '归并排序采用____思想。', '分治', '归并排序先分解，再合并。'],
  ['排序', '堆排序通常先建立大顶____。', '堆', '升序堆排序常先建大顶堆。'],
  ['排序', '冒泡、插入、选择中通常稳定的是冒泡和____。', '插入', '直接插入排序不会改变相等元素相对次序。'],

  ['查找', '顺序查找平均时间复杂度为____。', 'O(n)', '顺序查找平均需要线性次数比较。'],
  ['查找', '折半查找要求顺序表按关键字____。', '有序', '折半查找依赖有序性缩小范围。'],
  ['查找', '折半查找每次比较后范围约缩小为原来的____。', '一半', '中间比较后可舍弃一半区间。'],
  ['查找', '二叉排序树查找效率与树的____密切相关。', '高度', '查找路径长度受树高影响。'],
  ['查找', '散列查找理想情况下时间复杂度接近____。', 'O(1)', '散列函数理想情况下可直接定位。'],
  ['查找', '不同关键字映射到同一散列地址称为____。', '冲突', '这就是散列冲突定义。'],
  ['查找', '链地址法把冲突关键字放入同一个____中。', '链表', '每个散列地址对应一个链表。'],
  ['查找', '索引查找先查索引表以缩小____。', '范围', '索引定位块后再在块内查找。'],
]

function addGeneratedQuestions() {
  for (const item of choiceUnits) addSingle(...item, { sourceTag: '自主命题' })
  for (const item of blankUnits) addBlank(...item, { sourceTag: '自主命题' })
}

const copiedImageCount = copyAllImages()
const imageExampleCount = addImageExamples()
const mdExamQuestionCount = addMdExamQuestions()
addGeneratedQuestions()
const extraFoundationQuestionCount = addExtraFoundationQuestions()
const homework7QuestionCount = addHomework7Questions()
const dedupe = deduplicateAndSupplement(questions, duplicateSupplementQuestions)
questions.splice(0, questions.length, ...dedupe.questions)

mkdirSync(bankDir, { recursive: true })
mkdirSync(join(bankDir, 'data-structure'), { recursive: true })
writeFileSync(bankPath, `${JSON.stringify(questions, null, 2)}\n`)

const existingManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
const aiSubject = existingManifest.subjects?.find((subject) => subject.id === 'ai') ?? {
  id: 'ai',
  name: '人工智能导论',
  questionCount: 0,
  relativePath: 'ai/questions.json',
  questionsUrl: 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/ai/questions.json',
}
const dataStructureSubject = {
  id: 'data-structure',
  name: '数据结构',
  questionCount: questions.length,
  relativePath: 'data-structure/questions.json',
  questionsUrl: 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/data-structure/questions.json',
  assetDirectory: 'ds-assets',
  types: {
    single: questions.filter((question) => question.type === 'single').length,
    multiple: questions.filter((question) => question.type === 'multiple').length,
    boolean: questions.filter((question) => question.type === 'boolean').length,
    blank: questions.filter((question) => question.type === 'blank').length,
  },
  explanations: questions.filter((question) => Boolean(question.explanation)).length,
  sourceCounts: {
    imageExamples: imageExampleCount,
    mdExamInput: mdExamQuestionCount,
    selfMadeInput: choiceUnits.length + blankUnits.length,
    extraFoundationInput: extraFoundationQuestionCount,
    homework7Input: homework7QuestionCount,
    duplicatesRemoved: dedupe.removedCount,
    supplementsUsed: dedupe.supplementCount,
    mdExamKept: questions.filter((question) => question.tags?.includes('非编程题')).length,
    selfMadeKept: questions.filter((question) => question.tags?.includes('自主命题')).length,
    extraFoundationKept: questions.filter((question) => question.tags?.includes('专题补充')).length,
    homework7Kept: questions.filter((question) => question.tags?.includes('第七套作业')).length,
  },
}
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      schemaVersion: 2,
      bankTag: 'multi-0.1.5.1-20260602',
      appVersion: '0.1.5.1',
      questionCount: aiSubject.questionCount + dataStructureSubject.questionCount,
      subjects: [aiSubject, dataStructureSubject],
      updatedAt: '2026-06-02T00:00:00+08:00',
      manifestUrl: 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/manifest.json',
    },
    null,
    2,
  )}\n`,
)

console.log(
  `已生成 0.1.5.1 数据结构题库：${questions.length} 道；图片例题 ${imageExampleCount} 道，第七套作业 ${homework7QuestionCount} 道，真题选填 ${mdExamQuestionCount} 道，自主命题 ${choiceUnits.length + blankUnits.length} 道，专题补充 ${extraFoundationQuestionCount} 道，去重 ${dedupe.removedCount} 道，补题 ${dedupe.supplementCount} 道，复制图片 ${copiedImageCount} 张。`,
)
