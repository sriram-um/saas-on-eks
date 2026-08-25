import { buildTargetFacts } from '../src/services/bedrockClueService';

/**
 * Unit tests for the AI Game Host clue service.
 *
 * These focus on buildTargetFacts (a pure function that must always produce
 * facts that are true) and on the fallback behavior of generateClue when the
 * feature is disabled or the Bedrock call fails.
 */

describe('buildTargetFacts', () => {
  it('reports direction higher when the target is above the guess', () => {
    const facts = buildTargetFacts(10, 42);
    expect(facts.direction).toBe('higher');
  });

  it('reports direction lower when the target is below the guess', () => {
    const facts = buildTargetFacts(90, 42);
    expect(facts.direction).toBe('lower');
  });

  it('classifies distance as very close, close, or far', () => {
    expect(buildTargetFacts(48, 50).distance).toBe('very close'); // diff 2
    expect(buildTargetFacts(40, 50).distance).toBe('close'); // diff 10
    expect(buildTargetFacts(10, 50).distance).toBe('far'); // diff 40
  });

  it('computes parity correctly', () => {
    expect(buildTargetFacts(1, 42).parity).toBe('even');
    expect(buildTargetFacts(1, 43).parity).toBe('odd');
  });

  it('identifies prime and non-prime targets', () => {
    expect(buildTargetFacts(1, 97).isPrime).toBe(true); // 97 is prime
    expect(buildTargetFacts(1, 100).isPrime).toBe(false); // 100 is not
    expect(buildTargetFacts(1, 1).isPrime).toBe(false); // 1 is not prime
    expect(buildTargetFacts(1, 2).isPrime).toBe(true); // 2 is prime
  });

  it('computes the digit sum of the target', () => {
    expect(buildTargetFacts(1, 47).digitSum).toBe(11); // 4 + 7
    expect(buildTargetFacts(1, 100).digitSum).toBe(1); // 1 + 0 + 0
    expect(buildTargetFacts(1, 9).digitSum).toBe(9);
  });

  it('assigns the correct range band across the board', () => {
    expect(buildTargetFacts(1, 25).rangeBand).toBe('between 1 and 25');
    expect(buildTargetFacts(1, 26).rangeBand).toBe('between 26 and 50');
    expect(buildTargetFacts(1, 51).rangeBand).toBe('between 51 and 75');
    expect(buildTargetFacts(1, 76).rangeBand).toBe('between 76 and 100');
    expect(buildTargetFacts(1, 100).rangeBand).toBe('between 76 and 100');
  });

  it('produces internally consistent facts for every target 1-100', () => {
    for (let target = 1; target <= 100; target++) {
      const facts = buildTargetFacts(50, target);
      // parity matches the number
      expect(facts.parity).toBe(target % 2 === 0 ? 'even' : 'odd');
      // direction matches the comparison to the guess of 50
      if (target > 50) {
        expect(facts.direction).toBe('higher');
      } else {
        expect(facts.direction).toBe('lower');
      }
    }
  });
});

describe('generateClue fallback behavior', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns null when the feature flag is disabled', async () => {
    process.env.AI_HOST_ENABLED = 'false';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';
    // Re-import with the disabled flag applied at module load
    const svc = await import('../src/services/bedrockClueService');
    const clue = await svc.generateClue(10, 42, 'basic');
    expect(clue).toBeNull();
  });

  it('returns null when no model id is configured', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    delete process.env.BEDROCK_MODEL_ID;
    const svc = await import('../src/services/bedrockClueService');
    const clue = await svc.generateClue(10, 42, 'pro');
    expect(clue).toBeNull();
  });

  it('returns null when the Bedrock client throws', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';

    // Mock the Bedrock client so send() rejects, simulating an outage/timeout
    jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
      BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error('simulated Bedrock failure'))
      })),
      ConverseCommand: jest.fn()
    }));

    const svc = await import('../src/services/bedrockClueService');
    const clue = await svc.generateClue(10, 42, 'basic');
    expect(clue).toBeNull();
  });
});

describe('isAiHostEnabled', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('is false when the flag is off', async () => {
    process.env.AI_HOST_ENABLED = 'false';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';
    const svc = await import('../src/services/bedrockClueService');
    expect(svc.isAiHostEnabled()).toBe(false);
  });

  it('is false when the flag is on but no model id is set', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    delete process.env.BEDROCK_MODEL_ID;
    const svc = await import('../src/services/bedrockClueService');
    expect(svc.isAiHostEnabled()).toBe(false);
  });

  it('is true when the flag is on and a model id is set', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';
    const svc = await import('../src/services/bedrockClueService');
    expect(svc.isAiHostEnabled()).toBe(true);
  });
});
