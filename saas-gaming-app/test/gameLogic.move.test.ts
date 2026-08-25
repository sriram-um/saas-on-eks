import { TenantContext } from '../src/types/tenant';

/**
 * Verifies that attaching an AI Game Host clue never changes the deterministic
 * outcome of a move. The game engine (result, score, guesses remaining, status)
 * must be identical whether or not a clue is generated.
 *
 * These tests run against the in-memory mock data path (no DYNAMODB_TABLE), so
 * they exercise processMove end to end without AWS.
 */

const tenantContext: TenantContext = {
  tenantId: 't1',
  tenantName: 'tenant one',
  tier: 'basic',
  tableName: 'gaming-app-shared'
};

describe('processMove deterministic fields with AI Game Host', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DYNAMODB_TABLE; // force the mock data path
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns correct deterministic fields and no clue when the AI host is disabled', async () => {
    process.env.AI_HOST_ENABLED = 'false';

    const mock = await import('../src/services/mockDataService');
    const gameLogic = await import('../src/services/gameLogic');

    const session = mock.createMockSession('t1', 'p1', 'player one');
    mock.updateMockSession(session.sessionId, { targetNumber: 50 });

    const res = await gameLogic.processMove(tenantContext, session.sessionId, 25);

    expect(res.result).toBe('too_low');
    expect(res.status).toBe('active');
    expect(res.guessesRemaining).toBe(9);
    expect(res.score).toBe(950);
    expect(res.clue).toBeUndefined();
  });

  it('attaches a clue without changing deterministic fields when the AI host is enabled', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';

    jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
      BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest
          .fn()
          .mockResolvedValue({ output: { message: { content: [{ text: 'Think bigger!' }] } } })
      })),
      ConverseCommand: jest.fn()
    }));

    const mock = await import('../src/services/mockDataService');
    const gameLogic = await import('../src/services/gameLogic');

    const session = mock.createMockSession('t1', 'p1', 'player one');
    mock.updateMockSession(session.sessionId, { targetNumber: 50 });

    const res = await gameLogic.processMove(tenantContext, session.sessionId, 25);

    // Deterministic fields identical to the disabled case
    expect(res.result).toBe('too_low');
    expect(res.status).toBe('active');
    expect(res.guessesRemaining).toBe(9);
    expect(res.score).toBe(950);
    // Clue is additive
    expect(res.clue).toBe('Think bigger!');
  });

  it('omits the clue on a winning move even when the AI host is enabled', async () => {
    process.env.AI_HOST_ENABLED = 'true';
    process.env.BEDROCK_MODEL_ID = 'global.anthropic.claude-haiku-4-5';

    jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
      BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest
          .fn()
          .mockResolvedValue({ output: { message: { content: [{ text: 'should not appear' }] } } })
      })),
      ConverseCommand: jest.fn()
    }));

    const mock = await import('../src/services/mockDataService');
    const gameLogic = await import('../src/services/gameLogic');

    const session = mock.createMockSession('t1', 'p2', 'player two');
    mock.updateMockSession(session.sessionId, { targetNumber: 42 });

    const res = await gameLogic.processMove(tenantContext, session.sessionId, 42);

    expect(res.result).toBe('correct');
    expect(res.status).toBe('won');
    // No clue once the game is over
    expect(res.clue).toBeUndefined();
  });
});
