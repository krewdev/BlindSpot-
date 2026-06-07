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
  {
    id: 'rlhf-1',
    prompt: 'Explain quantum entanglement to a 10-year-old.',
    responseA: 'Quantum entanglement is when two particles become connected in a special way. Imagine you have two magic dice. No matter how far apart they are — even on different planets — when you roll one and get a 6, the other one ALWAYS shows a 1. They\'re linked by an invisible thread that nothing can break. Scientists don\'t fully understand why this happens, but it\'s one of the coolest mysteries in the universe!',
    responseB: 'Quantum entanglement is a phenomenon in quantum mechanics where two or more particles become correlated such that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances. This is described mathematically using the tensor product of Hilbert spaces and violates Bell\'s inequality.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'reasoning',
    difficulty: 'easy',
  },
  {
    id: 'rlhf-2',
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
    id: 'rlhf-3',
    prompt: 'Is it ethical to use AI to make hiring decisions?',
    responseA: 'Yes, AI should absolutely be used for hiring. It removes human bias completely and makes everything fair. Companies should trust AI decisions without question because algorithms are always objective.',
    responseB: 'This is a nuanced question with strong arguments on both sides.\n\n**Potential benefits:** AI can reduce some forms of human bias (like name-based discrimination), process large applicant pools consistently, and identify qualified candidates who might be overlooked.\n\n**Serious risks:** AI systems can amplify existing biases in training data, lack transparency in decision-making, and may not capture important human qualities like cultural fit or potential. Amazon famously scrapped an AI hiring tool that showed bias against women.\n\n**My view:** AI can be a useful *tool* in hiring to assist human decision-makers, but it should never be the sole decision-maker. Regular auditing for bias is essential, and candidates should know when AI is involved.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'safety',
    difficulty: 'hard',
  },
  {
    id: 'rlhf-4',
    prompt: 'Write a short poem about rain.',
    responseA: 'Rain falls down\nOn the ground\nIt makes a sound\nAll around\nRain is wet\nDon\'t forget\nBring your hat\nThat is that.',
    responseB: 'Silver threads descend from grey,\nDrumming soft on cobblestone.\nThe world slows its frantic play,\nAnd every rooftop finds its tone.\n\nPuddles catch the neon glow\nOf storefronts shutting for the night.\nThe rain doesn\'t care where we go—\nIt simply falls, indifferent, bright.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'creativity',
    difficulty: 'easy',
  },
  {
    id: 'rlhf-5',
    prompt: 'What is the capital of Australia?',
    responseA: 'The capital of Australia is Sydney. It\'s the largest and most well-known city in Australia, famous for the Sydney Opera House and Harbour Bridge.',
    responseB: 'The capital of Australia is **Canberra**, not Sydney (a common misconception). Canberra was purpose-built as the capital in the early 20th century as a compromise between rivals Sydney and Melbourne. It\'s located in the Australian Capital Territory (ACT) and has been the seat of government since 1927.',
    modelA: 'Model Alpha',
    modelB: 'Model Beta',
    category: 'factual',
    difficulty: 'easy',
  },
];
