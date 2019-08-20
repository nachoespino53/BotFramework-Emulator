//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { OK } from 'http-status-codes';

import replyToActivity from './replyToActivity';

const mockResolveOAuthCards = jest.fn().mockResolvedValue(true);
jest.mock('../../utils/oauthLinkEncoder', () => {
  return jest.fn().mockImplementation(() => {
    return { resolveOAuthCards: mockResolveOAuthCards };
  });
});

describe('replyToActivity route middleware', () => {
  const mockReq: any = {
    body: {
      id: 'someActivityId',
    },
    conversation: {
      postActivityToUser: jest.fn(() => 'post activity to user response'),
    },
    headers: {
      authorization: 'Bearer <token>',
    },
    params: {
      activityId: 'someOtherActivityId',
      conversationId: 'someConversationId',
    },
  };
  const mockRes: any = {
    end: jest.fn(() => null),
    send: jest.fn(() => null),
  };
  const mockNext: any = jest.fn(() => null);
  const mockBotEmulator: any = {
    facilities: {
      logger: {
        logException: jest.fn(() => null),
      },
    },
  };

  beforeEach(() => {
    mockResolveOAuthCards.mockClear();
    mockReq.conversation.postActivityToUser.mockClear();
    mockRes.end.mockClear();
    mockRes.send.mockClear();
    mockNext.mockClear();
    mockBotEmulator.facilities.logger.logException.mockClear();
  });

  it('should resolve any OAuth cards, post the activity to the user, and send an OK response', async () => {
    replyToActivity(mockBotEmulator)(mockReq, mockRes, mockNext);

    // since the middleware is not an async function, wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockReq.conversation.postActivityToUser).toHaveBeenCalledWith({
      ...mockReq.body,
      replyToId: mockReq.params.activityId,
    });
    expect(mockRes.send).toHaveBeenCalledWith(OK, 'post activity to user response');
    expect(mockRes.end).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should resolve any OAuth cards, post the activity (with a null id) to the user, and send an OK response', async () => {
    mockReq.body.id = undefined;

    replyToActivity(mockBotEmulator)(mockReq, mockRes, mockNext);

    // since the middleware is not an async function, wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockReq.conversation.postActivityToUser).toHaveBeenCalledWith({
      ...mockReq.body,
      replyToId: mockReq.params.activityId,
      id: null,
    });
    expect(mockRes.send).toHaveBeenCalledWith(OK, 'post activity to user response');
    expect(mockRes.end).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();

    mockReq.body.id = 'someActivityId';
  });

  it('should log any exceptions from OAuth signin in generation before posting the activity to the user', async () => {
    const ngrokError = new Error('Failed to spawn ngrok');
    mockResolveOAuthCards.mockRejectedValueOnce(ngrokError);
    replyToActivity(mockBotEmulator)(mockReq, mockRes, mockNext);

    // since the middleware is not an async function, wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockBotEmulator.facilities.logger.logException).toHaveBeenCalledWith('someConversationId', ngrokError);
    expect(mockBotEmulator.facilities.logger.logException).toHaveBeenCalledWith(
      'someConversationId',
      new Error('Falling back to emulated OAuth token.')
    );
    expect(mockReq.conversation.postActivityToUser).toHaveBeenCalledWith({
      ...mockReq.body,
      replyToId: mockReq.params.activityId,
    });
    expect(mockRes.send).toHaveBeenCalledWith(OK, 'post activity to user response');
    expect(mockRes.end).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
