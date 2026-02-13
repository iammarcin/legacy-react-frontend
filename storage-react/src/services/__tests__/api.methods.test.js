jest.mock('../../utils/misc', () => ({
  __esModule: true,
  formatDate: jest.fn(() => '2024-05-01T00:00:00Z'),
}));

import { prepareChatHistoryForDB, __testables } from '../api.methods';
import { formatDate } from '../../utils/misc';

describe('api.methods helpers', () => {
  describe('prepareChatHistoryForDB', () => {
    it('normalises chat messages for persistence (using snake_case)', () => {
      const timestamp = new Date('2024-05-01T12:34:56Z');
      const chatHistory = {
        messages: [
          {
            message: 'Hello',
            isUserMessage: true,
            image_locations: ['img-1'],
            file_locations: ['file.pdf'],
            ai_character_name: 'assistant',
            message_id: 7,
            api_text_gen_model_name: 'gpt-test',
            created_at: timestamp,
            isTTS: true,
            showTranscribeButton: true,
            isGPSLocationMessage: false,
          },
        ],
      };

      formatDate.mockReturnValue('2024-05-01T00:00:00Z');
      const result = prepareChatHistoryForDB(chatHistory);

      expect(result).toHaveLength(1);
      expect(formatDate).toHaveBeenCalledWith(timestamp);
      expect(result[0].created_at).toBe('2024-05-01T00:00:00Z');
    });
  });

  describe('prepareMessageWriteBody', () => {
    it('maps camelCase properties and merges identifiers', () => {
      const payload = {
        new_ai_character_name: 'assistant',
        userMessage: 'User question',
        aiResponse: 'Assistant reply',
        chat_history: [{}],
        new_session_from_here_full_chat_history: true,
        extraField: 'keep-me',
      };

      const result = __testables.prepareMessageWriteBody(payload, { text: {} }, 9);

      expect(result).toEqual({
        body: {
          customer_id: 9,
          user_settings: { text: {} },
          ai_character_name: 'assistant',
          user_message: 'User question',
          ai_response: 'Assistant reply',
          extraField: 'keep-me',
        },
      });
    });
  });

  describe('prepareQueryParams', () => {
    it('serialises arrays as repeated query params', () => {
      const query = { tags: ['alpha', 'beta'], limit: 25 };

      const result = __testables.prepareQueryParams(query);
      const params = new URLSearchParams(result.slice(1));

      expect(result.startsWith('?')).toBe(true);
      expect(params.getAll('tags')).toEqual(['alpha', 'beta']);
      expect(params.get('limit')).toBe('25');
    });
  });

  describe('buildChatRequest', () => {
    it('returns query parameters for prompt retrieval routes', () => {
      const request = __testables.buildChatRequest(
        'db_get_all_prompts',
        {},
        {},
        3,
      );

      expect(request).toEqual({ query: { customer_id: 3 } });
    });
  });
});
