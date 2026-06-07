import { GameModeConfig, RLHFPrompt } from './types';

// ─── Game Mode Registry ─────────────────────────────────────────────

export const GAME_MODES: GameModeConfig[] = [
  {
    id: 'vision_hunt',
    name: 'Vision Hunt',
    tagline: 'Hunt the AI\'s Blindspots',
    description: 'Find objects in images that the AI model missed. Your corrections train computer vision models used in self-driving cars, robotics, and medical imaging.',
    icon: 'Eye',
    dataType: 'Bounding Boxes & Segmentation Masks',
    rewardPerRound: 0.15,
    color: 'indigo',
  },
  {
    id: 'the_judge',
    name: 'The Judge',
    tagline: 'Train the World\'s Smartest AI',
    description: 'Two AI models answer the same question. You decide which response is better. This is RLHF — the exact process used to train GPT-4, Claude, and Gemini.',
    icon: 'Scale',
    dataType: 'RLHF Preference Pairs',
    rewardPerRound: 0.25,
    color: 'amber',
  },
  {
    id: 'caption_clash',
    name: 'Caption Clash',
    tagline: 'Teach AI to See Like a Human',
    description: 'Write precise, natural-language descriptions of objects drawn by humans in Vision Hunt. Your descriptions fine-tune multi-modal Vision-Language models.',
    icon: 'MessageSquare',
    dataType: 'Image-Text Alignment Pairs',
    rewardPerRound: 0.20,
    color: 'emerald',
  },
  {
    id: 'bug_bounty',
    name: 'Bug Bounty',
    tagline: 'Cyber Siege Pen-Testing Duel',
    description: 'Compete head-to-head in a simulated hacking CTF sandbox. Crack exploits and write security patches while AI logs your terminal shell commands to train security models.',
    icon: 'Bug',
    dataType: 'Exploit Scripts & Shell Command Telemetry',
    rewardPerRound: 0.30,
    color: 'rose',
  },
];

// ─── RLHF Mock Data (The Judge) ─────────────────────────────────────

export const MOCK_RLHF_PROMPTS: RLHFPrompt[] = [
  // ── CODING TRACK ──────────────────────────────────────────────────
  {
    id: 'code-1',
    prompt: 'Write a Python function to check if a number is prime.',
    responseA: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, n):
        if n % i == 0:
            return False
    return True`,
    responseB: `def is_prime(n: int) -> bool:
    """Check if n is a prime number using optimized trial division."""
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'medium',
  },
  {
    id: 'code-2',
    prompt: 'Implement a debounce function in TypeScript.',
    responseA: `function debounce(fn: Function, delay: number) {
  let timer: any;
  return function(...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
    responseB: `function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };
}`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'medium',
  },
  {
    id: 'code-3',
    prompt: 'What is the difference between == and === in JavaScript?',
    responseA: `== checks if values are equal, === checks if values and types are equal.
Example: 0 == false is true, 0 === false is false.`,
    responseB: `== (Abstract Equality): Performs type coercion before comparison.
=== (Strict Equality): No coercion — value AND type must match.

Key examples:
  0 == false    // true  (false coerces to 0)
  0 === false   // false (number vs boolean)
  "" == false   // true
  "" === false  // false
  null == undefined  // true
  null === undefined // false

Best practice: Always prefer === to avoid unexpected coercion bugs.`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'easy',
  },
  {
    id: 'code-4',
    prompt: 'Write a SQL query to find the second highest salary from an "employees" table.',
    responseA: `SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);`,
    responseB: `-- Method 1: Subquery (portable across all SQL dialects)
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Method 2: DENSE_RANK (handles ties correctly)
SELECT salary AS second_highest
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2
LIMIT 1;

-- Note: Method 2 is preferred if the DB supports window functions,
-- as it handles ties (multiple employees with the same highest salary).`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'medium',
  },
  {
    id: 'code-5',
    prompt: 'Explain React\'s useEffect cleanup function and when to use it.',
    responseA: `useEffect cleanup runs when the component unmounts. You return a function from useEffect to clean up:

useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();
}, []);`,
    responseB: `The cleanup function returned from useEffect runs in two cases:
1. Before the component unmounts (final cleanup)
2. Before the next effect runs if dependencies changed

This prevents memory leaks and stale closures.

Common use cases:
• Cancelling subscriptions (WebSocket, EventEmitter)
• Clearing timers: return () => clearInterval(id)
• Aborting fetch: const ctrl = new AbortController(); return () => ctrl.abort()
• Removing event listeners: return () => window.removeEventListener(...)

\`\`\`tsx
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData);
  return () => controller.abort();
}, []);
\`\`\`

React 18 Strict Mode double-invokes effects intentionally to expose missing cleanups.`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'hard',
  },
  {
    id: 'code-6',
    prompt: 'Design a rate limiter for an API endpoint (system design / pseudocode).',
    responseA: `Use a counter per user per minute. If counter > limit, reject the request.

counter = get_counter(user_id)
if counter > 100:
    return 429
else:
    increment(counter)
    handle_request()`,
    responseB: `A production-grade rate limiter should use the Token Bucket or Sliding Window Log algorithm.

**Token Bucket (recommended):**
- Each user has a bucket with capacity N tokens
- Tokens refill at rate R per second
- Each request consumes 1 token; if empty → reject 429

**Redis implementation sketch:**
\`\`\`
key = f"rate:{user_id}"
tokens = REDIS.GET(key) or CAPACITY
if tokens <= 0:
    return 429 Too Many Requests
REDIS.DECRBY(key, 1)
REDIS.EXPIRE(key, WINDOW_SECONDS)
handle_request()
\`\`\`

**Why Redis?** Atomic operations + TTL prevent race conditions in distributed systems.
**Headers to include:** X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset`,
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'coding',
    difficulty: 'hard',
  },

  // ── GENERAL TRACK ──────────────────────────────────────────────────
  {
    id: 'gen-1',
    prompt: 'Explain quantum entanglement to a 10-year-old.',
    responseA: 'Quantum entanglement is when two particles become connected in a special way. Imagine you have two magic dice. No matter how far apart they are — even on different planets — when you roll one and get a 6, the other one ALWAYS shows a 1. They\'re linked by an invisible thread that nothing can break. Scientists don\'t fully understand why this happens, but it\'s one of the coolest mysteries in the universe!',
    responseB: 'Quantum entanglement is a phenomenon in quantum mechanics where two or more particles become correlated such that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances. This is described mathematically using the tensor product of Hilbert spaces and violates Bell\'s inequality.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'reasoning',
    difficulty: 'easy',
  },
  {
    id: 'gen-2',
    prompt: 'Is it ethical to use AI to make hiring decisions?',
    responseA: 'Yes, AI should absolutely be used for hiring. It removes human bias completely and makes everything fair. Companies should trust AI decisions without question because algorithms are always objective.',
    responseB: 'This is a nuanced question with strong arguments on both sides.\n\n**Potential benefits:** AI can reduce some forms of human bias (like name-based discrimination), process large applicant pools consistently, and identify qualified candidates who might be overlooked.\n\n**Serious risks:** AI systems can amplify existing biases in training data, lack transparency in decision-making, and may not capture important human qualities like cultural fit or potential. Amazon famously scrapped an AI hiring tool that showed bias against women.\n\n**My view:** AI can be a useful *tool* in hiring to assist human decision-makers, but it should never be the sole decision-maker. Regular auditing for bias is essential, and candidates should know when AI is involved.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'safety',
    difficulty: 'hard',
  },
  {
    id: 'gen-3',
    prompt: 'Write a short poem about rain.',
    responseA: 'Rain falls down\nOn the ground\nIt makes a sound\nAll around\nRain is wet\nDon\'t forget\nBring your hat\nThat is that.',
    responseB: 'Silver threads descend from grey,\nDrumming soft on cobblestone.\nThe world slows its frantic play,\nAnd every rooftop finds its tone.\n\nPuddles catch the neon glow\nOf storefronts shutting for the night.\nThe rain doesn\'t care where we go—\nIt simply falls, indifferent, bright.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'creativity',
    difficulty: 'easy',
  },
  {
    id: 'gen-4',
    prompt: 'What is the capital of Australia?',
    responseA: 'The capital of Australia is Sydney. It\'s the largest and most well-known city in Australia, famous for the Sydney Opera House and Harbour Bridge.',
    responseB: 'The capital of Australia is **Canberra**, not Sydney (a common misconception). Canberra was purpose-built as the capital in the early 20th century as a compromise between rivals Sydney and Melbourne. It\'s located in the Australian Capital Territory (ACT) and has been the seat of government since 1927.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'factual',
    difficulty: 'easy',
  },
  {
    id: 'gen-5',
    prompt: 'How would you explain the concept of inflation to someone with no economics background?',
    responseA: 'Inflation means prices go up over time. The dollar buys less than it used to.',
    responseB: 'Inflation is when the purchasing power of money decreases over time — meaning the same amount of money buys fewer goods and services.\n\n**Everyday analogy:** Imagine a cup of coffee cost $1 in 2010. Today it costs $3. Your $1 bill didn\'t shrink, but what it can *buy* did. That\'s inflation.\n\n**What causes it?**\n- Too much money chasing too few goods (demand-pull)\n- Rising production costs passed on to consumers (cost-push)\n- Central banks printing more currency\n\n**Why some inflation is healthy:** Around 2% annual inflation encourages spending over hoarding and signals a growing economy. Zero or negative inflation (deflation) can trigger recessions.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'reasoning',
    difficulty: 'medium',
  },
  {
    id: 'gen-6',
    prompt: 'Should social media platforms be held legally responsible for content posted by their users?',
    responseA: 'No. Platforms can\'t possibly monitor everything. Section 230 protects them and that\'s fair.',
    responseB: 'This is one of the defining legal debates of our era. Currently in the US, Section 230 of the Communications Decency Act grants platforms broad immunity from liability for user-generated content.\n\n**Arguments for liability:**\n- Platforms profit from engagement, including harmful content\n- Algorithmic amplification is a platform choice, not neutral hosting\n- Greater accountability could incentivize safer design\n\n**Arguments against liability:**\n- It\'s technically impossible to pre-screen billions of posts\n- Liability would push platforms toward over-censorship\n- Small platforms couldn\'t survive litigation risk; only Big Tech would remain\n\n**A middle path:** Many legal scholars advocate for liability tied specifically to *algorithmic recommendation* of harmful content, while preserving immunity for passive hosting. The EU\'s Digital Services Act (2024) moves in this direction.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'safety',
    difficulty: 'hard',
  },
];


